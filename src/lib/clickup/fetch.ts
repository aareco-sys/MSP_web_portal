/**
 * Orquestación de fetch contra ClickUp → ClickUpDataset normalizado.
 * Es el único lugar que conoce las formas crudas de la API.
 */
import { chunk, clickupGet, mapLimit } from "./client";
import { type ClickUpConfig } from "./config";
import type {
  ClickUpDataset,
  ClickUpList,
  StatusHistoryEntry,
  StatusType,
  Task,
  TimeEntry,
} from "./types";

const toMs = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const asStatusType = (t: unknown): StatusType => {
  return t === "open" || t === "custom" || t === "done" || t === "closed"
    ? t
    : "custom";
};

// ── Listas activas ────────────────────────────────────────────────────────────
interface RawFolder {
  id: string;
  name: string;
  lists?: { id: string; name: string }[];
}

export async function fetchActiveLists(cfg: ClickUpConfig): Promise<ClickUpList[]> {
  const res = await clickupGet<{ folders: RawFolder[] }>(
    cfg,
    `/space/${cfg.spaceId}/folder`,
    { params: { archived: false } },
  );
  const active = new Set(cfg.activeFolderIds);
  const lists: ClickUpList[] = [];
  for (const folder of res.folders ?? []) {
    if (!active.has(folder.id)) continue;
    for (const lst of folder.lists ?? []) {
      lists.push({
        id: lst.id,
        name: lst.name,
        folderId: folder.id,
        folderName: folder.name,
      });
    }
  }
  return lists;
}

// ── Tareas ──────────────────────────────────────────────────────────────────
interface RawTask {
  id: string;
  name: string;
  status?: { status?: string; type?: string };
  date_created?: string;
  date_closed?: string;
  date_done?: string;
  due_date?: string;
  assignees?: { id: number; username: string; email: string }[];
  tags?: { name: string }[];
  priority?: { priority?: string } | null;
  time_spent?: number | string | null;
}

async function fetchTasksForList(
  cfg: ClickUpConfig,
  list: ClickUpList,
): Promise<Task[]> {
  const out: Task[] = [];
  let page = 0;
  while (true) {
    const res = await clickupGet<{ tasks: RawTask[]; last_page?: boolean }>(
      cfg,
      `/list/${list.id}/task`,
      { params: { include_closed: true, subtasks: true, page } },
    );
    const tasks = res.tasks ?? [];
    for (const t of tasks) {
      out.push({
        id: t.id,
        name: t.name,
        status: t.status?.status ?? "unknown",
        statusType: asStatusType(t.status?.type),
        listId: list.id,
        listName: list.name,
        folderId: list.folderId,
        folderName: list.folderName,
        assignees: (t.assignees ?? []).map((a) => ({
          id: a.id,
          username: a.username ?? a.email ?? String(a.id),
          email: a.email ?? "",
        })),
        tags: (t.tags ?? []).map((tag) => tag.name),
        priority: t.priority?.priority ?? null,
        timeSpentMs: Math.max(0, Number(t.time_spent ?? 0) || 0),
        dateCreated: toMs(t.date_created),
        dateClosed: toMs(t.date_closed),
        dateDone: toMs(t.date_done),
        dateDue: toMs(t.due_date),
      });
    }
    if (tasks.length === 0 || res.last_page) break;
    page += 1;
  }
  return out;
}

export async function fetchActiveTasks(
  cfg: ClickUpConfig,
  lists: ClickUpList[],
): Promise<Task[]> {
  const perList = await mapLimit(lists, cfg.concurrency, (list) =>
    fetchTasksForList(cfg, list),
  );
  return perList.flat();
}

// ── Time entries por tarea (intervalos con fecha + usuario) ───────────────────
// El endpoint a nivel team (/team/{id}/time_entries) requiere permisos que el
// token no tiene (403 TIMEENTRY_059). En cambio /task/{id}/time es accesible y
// devuelve, agrupado por usuario, los `intervals` con start/end/time. De ahí
// salen imputaciones con FECHA (para recortar horas por rango) y USUARIO real.
interface RawTaskTime {
  data?: {
    user?: { id?: number; username?: string; email?: string } | null;
    intervals?: {
      id?: string;
      start?: string;
      time?: string;
      billable?: boolean;
    }[];
  }[];
}

/** Trae las imputaciones (intervalos) de las tareas que tienen tiempo cargado. */
export async function fetchTaskTimeEntries(
  cfg: ClickUpConfig,
  tasks: Task[],
): Promise<TimeEntry[]> {
  // Solo las tareas con time_spent>0 tienen intervalos: evita llamadas inútiles.
  const withTime = tasks.filter((t) => t.timeSpentMs > 0);
  const per = await mapLimit(withTime, cfg.concurrency, async (t) => {
    const res = await clickupGet<RawTaskTime>(cfg, `/task/${t.id}/time`);
    const out: TimeEntry[] = [];
    for (const grp of res.data ?? []) {
      const u = grp.user ?? {};
      for (const iv of grp.intervals ?? []) {
        const dur = Number(iv.time ?? 0);
        if (!Number.isFinite(dur) || dur <= 0) continue;
        out.push({
          id: iv.id ?? `${t.id}-${out.length}`,
          taskId: t.id,
          listId: t.listId,
          folderId: t.folderId,
          userId: u.id ?? 0,
          username: u.username ?? u.email ?? "Sin asignar",
          email: u.email ?? "",
          start: toMs(iv.start),
          durationMs: dur,
          billable: Boolean(iv.billable),
        });
      }
    }
    return out;
  });
  return per.flat();
}

// ── Time in status (bulk, lotes de 100) ───────────────────────────────────────
interface RawStatusEntry {
  status?: string;
  type?: string;
  orderindex?: number;
  since?: string;
  total_time?: { by_minute?: number; since?: string } | null;
  total_time_minutes?: number;
}

export async function fetchTimeInStatus(
  cfg: ClickUpConfig,
  taskIds: string[],
): Promise<Record<string, StatusHistoryEntry[]>> {
  const batches = chunk(taskIds, 100);
  const merged: Record<string, StatusHistoryEntry[]> = {};
  const partials = await mapLimit(batches, Math.min(cfg.concurrency, 8), (ids) =>
    clickupGet<Record<string, unknown>>(
      cfg,
      `/task/bulk_time_in_status/task_ids`,
      { params: { task_ids: ids } },
    ),
  );
  for (const res of partials) {
    // La respuesta puede venir como {tasks:{...}} (MCP) o el map directo (REST).
    const map = (
      (res as { tasks?: Record<string, unknown> }).tasks ?? res
    ) as Record<string, unknown>;
    for (const [taskId, value] of Object.entries(map)) {
      const hist = (value as { status_history?: RawStatusEntry[] })
        ?.status_history;
      if (!Array.isArray(hist)) continue;
      merged[taskId] = hist
        .map((e) => ({
          status: e.status ?? "unknown",
          type: asStatusType(e.type),
          since: Number(e.total_time?.since ?? e.since ?? 0),
          minutes: Number(e.total_time?.by_minute ?? e.total_time_minutes ?? 0),
          orderindex: Number(e.orderindex ?? 0),
        }))
        .sort((a, b) => a.orderindex - b.orderindex);
    }
  }
  return merged;
}

// ── Orquestación ──────────────────────────────────────────────────────────────
export interface LoadOptions {
  /** rango para time_entries (epoch ms). Default: últimos 365 días. */
  start?: number;
  end?: number;
  /** si false, se saltea el fetch de time-in-status (más rápido, sin MTTD/MTTR). */
  includeStatusHistory?: boolean;
}

const DAY_MS = 86_400_000;

export async function loadDataset(
  cfg: ClickUpConfig,
  opts: LoadOptions = {},
): Promise<ClickUpDataset> {
  const end = opts.end ?? Date.now();
  const start = opts.start ?? end - 365 * DAY_MS;
  const includeStatusHistory = opts.includeStatusHistory ?? true;

  const lists = await fetchActiveLists(cfg);
  const tasks = await fetchActiveTasks(cfg, lists);

  // En paralelo: imputaciones por tarea (horas con fecha+usuario) e historial
  // de estados (para MTTD/MTTR). Ambos son N+ llamadas, acotadas por concurrencia
  // y cacheadas; el de horas solo recorre tareas con time_spent>0.
  const [timeEntries, statusHistory] = await Promise.all([
    fetchTaskTimeEntries(cfg, tasks),
    includeStatusHistory
      ? fetchTimeInStatus(
          cfg,
          tasks.map((t) => t.id),
        )
      : Promise.resolve<Record<string, StatusHistoryEntry[]>>({}),
  ]);

  return {
    lists,
    tasks,
    timeEntries,
    statusHistory,
    fetchedAt: Date.now(),
    timeRange: { start, end },
  };
}
