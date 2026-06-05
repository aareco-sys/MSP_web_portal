/**
 * Cálculo de métricas a partir del ClickUpDataset + filtros.
 *
 * Modelo: el rango de fechas es una VENTANA DE REPORTE aplicada por-métrica
 * (no un filtro duro que descarta tareas del universo):
 *   - "creadas"            → tareas con fecha de creación en el rango.
 *   - "resueltas/MTTR/MTTD" → tareas con fecha de RESOLUCIÓN en el rango
 *                             (sin importar cuándo se crearon).
 *   - "abiertas/backlog/aging/estados" → foto al FINAL del rango (point-in-time).
 *   - "horas"              → imputaciones (intervals) con fecha dentro del rango.
 * El dataset se trae una vez con rango amplio; acá se filtra y agrega en memoria.
 */
import type { ClickUpDataset, TimeEntry } from "@/lib/clickup/types";
import { enrichTasks, type EnrichedTask } from "./enrich";
import { monthKey, msToHours, summarize } from "./stats";
import type {
  ListMetrics,
  MetricsFilters,
  MetricsResult,
  MonthlyBucket,
  UserMetrics,
} from "./types";

const inRange = (ts: number | null, start?: number, end?: number): boolean => {
  if (ts == null) return false;
  if (start != null && ts < start) return false;
  if (end != null && ts > end) return false;
  return true;
};

function taskMatchesScope(t: EnrichedTask, f: MetricsFilters): boolean {
  if (f.folderIds?.length && !f.folderIds.includes(t.folderId)) return false;
  if (f.listIds?.length && !f.listIds.includes(t.listId)) return false;
  if (f.userIds?.length) {
    const ids = new Set(t.assignees.map((a) => a.id));
    if (!f.userIds.some((u) => ids.has(u))) return false;
  }
  return true;
}

function entryMatchesScope(e: TimeEntry, f: MetricsFilters): boolean {
  if (f.folderIds?.length && (!e.folderId || !f.folderIds.includes(e.folderId)))
    return false;
  if (f.listIds?.length && (!e.listId || !f.listIds.includes(e.listId))) return false;
  if (f.userIds?.length && !f.userIds.includes(e.userId)) return false;
  return true;
}

/** ¿La tarea estaba abierta al instante `boundary`? (backlog point-in-time). */
function openAsOf(t: EnrichedTask, boundary: number): boolean {
  if (t.createdTs == null) return !t.isResolved; // fallback sin fecha de creación
  if (t.createdTs > boundary) return false; // aún no existía
  if (t.resolvedTs != null && t.resolvedTs <= boundary) return false; // ya resuelta
  return true;
}

const UNASSIGNED_ID = 0;
const UNASSIGNED_NAME = "Sin asignar";

export function computeMetrics(
  dataset: ClickUpDataset,
  filters: MetricsFilters = {},
): MetricsResult {
  const { start, end } = filters;
  const noRange = start == null && end == null;
  const now = dataset.fetchedAt;
  const boundary = end ?? now;

  const enriched = enrichTasks(dataset.tasks, dataset.statusHistory);
  const scoped = enriched.filter((t) => taskMatchesScope(t, filters));

  // Subconjuntos por-métrica.
  const createdInRange = scoped.filter(
    (t) => noRange || inRange(t.createdTs, start, end),
  );
  const resolvedInRange = scoped.filter(
    (t) => t.resolvedTs != null && (noRange || inRange(t.resolvedTs, start, end)),
  );
  const openSnapshot = scoped.filter((t) => openAsOf(t, boundary));

  // Universo "relevante a la ventana": unión de los tres (para estados/prioridad).
  const windowMap = new Map<string, EnrichedTask>();
  for (const t of [...createdInRange, ...resolvedInRange, ...openSnapshot])
    windowMap.set(t.id, t);
  const windowTasks = [...windowMap.values()];

  // Imputaciones con fecha dentro del rango (horas exactas).
  const entriesInRange = dataset.timeEntries.filter(
    (e) => entryMatchesScope(e, filters) && (noRange || inRange(e.start, start, end)),
  );

  // ── Agregación por lista ──
  const listName = new Map<string, { name: string; folder: string }>();
  for (const l of dataset.lists) listName.set(l.id, { name: l.name, folder: l.folderName });
  for (const t of scoped)
    if (!listName.has(t.listId)) listName.set(t.listId, { name: t.listName, folder: t.folderName });

  type ListAcc = ListMetrics & { _mttd: number[]; _mttr: number[]; _aging: number[] };
  const listMap = new Map<string, ListAcc>();
  const ensureList = (listId: string): ListAcc => {
    let m = listMap.get(listId);
    if (!m) {
      const info = listName.get(listId) ?? { name: listId, folder: "" };
      m = {
        listId,
        listName: info.name,
        folderName: info.folder,
        total: 0,
        created: 0,
        open: 0,
        resolved: 0,
        unassigned: 0,
        statusCounts: {},
        hours: 0,
        avgAgingDays: null,
        mttd: { mean: null, median: null, p90: null, count: 0 },
        mttr: { mean: null, median: null, p90: null, count: 0 },
        _mttd: [],
        _mttr: [],
        _aging: [],
      };
      listMap.set(listId, m);
    }
    return m;
  };

  for (const t of windowTasks) {
    const m = ensureList(t.listId);
    m.total += 1;
    m.statusCounts[t.status] = (m.statusCounts[t.status] ?? 0) + 1;
  }
  for (const t of createdInRange) ensureList(t.listId).created += 1;
  for (const t of openSnapshot) {
    const m = ensureList(t.listId);
    m.open += 1;
    if (t.isUnassigned) m.unassigned += 1;
    if (t.createdTs != null) m._aging.push((boundary - t.createdTs) / 86_400_000);
  }
  for (const t of resolvedInRange) {
    const m = ensureList(t.listId);
    m.resolved += 1;
    if (t.mttrDays != null) m._mttr.push(t.mttrDays);
    if (t.mttdDays != null) m._mttd.push(t.mttdDays);
  }
  for (const e of entriesInRange) {
    if (!e.listId) continue;
    ensureList(e.listId).hours += msToHours(e.durationMs);
  }
  const byList: ListMetrics[] = [...listMap.values()].map((m) => {
    const { _mttd, _mttr, _aging, ...rest } = m;
    return {
      ...rest,
      hours: round2(rest.hours),
      mttd: summarize(_mttd),
      mttr: summarize(_mttr),
      avgAgingDays: _aging.length ? round2(avg(_aging)) : null,
    };
  });
  byList.sort((a, b) => b.total - a.total);

  // ── Agregación por usuario ──
  const userMap = new Map<number, UserMetrics>();
  const ensureUser = (id: number, username: string, email: string) => {
    let u = userMap.get(id);
    if (!u) {
      u = { userId: id, username, email, total: 0, open: 0, resolved: 0, hours: 0 };
      userMap.set(id, u);
    }
    return u;
  };
  const eachAssignee = (t: EnrichedTask, fn: (u: UserMetrics) => void) => {
    if (t.assignees.length === 0) fn(ensureUser(UNASSIGNED_ID, UNASSIGNED_NAME, ""));
    else for (const a of t.assignees) fn(ensureUser(a.id, a.username, a.email));
  };
  for (const t of windowTasks) eachAssignee(t, (u) => (u.total += 1));
  for (const t of openSnapshot) eachAssignee(t, (u) => (u.open += 1));
  for (const t of resolvedInRange) eachAssignee(t, (u) => (u.resolved += 1));
  for (const e of entriesInRange)
    ensureUser(e.userId, e.username, e.email).hours += msToHours(e.durationMs);
  const byUser = [...userMap.values()]
    .map((u) => ({ ...u, hours: round2(u.hours) }))
    .sort((a, b) => b.hours - a.hours || b.total - a.total);

  // ── Por estado / prioridad (sobre el universo de la ventana) ──
  const statusMap = new Map<string, { status: string; type: string; count: number }>();
  for (const t of windowTasks) {
    const s = statusMap.get(t.status) ?? { status: t.status, type: t.statusType, count: 0 };
    s.count += 1;
    statusMap.set(t.status, s);
  }
  const byStatus = [...statusMap.values()].sort((a, b) => b.count - a.count);

  const prioMap = new Map<string, number>();
  for (const t of windowTasks) {
    const key = t.priority ?? "sin prioridad";
    prioMap.set(key, (prioMap.get(key) ?? 0) + 1);
  }
  const byPriority = [...prioMap.entries()]
    .map(([priority, count]) => ({ priority, count }))
    .sort((a, b) => b.count - a.count);

  // ── Comparación mensual ──
  const monthly = buildMonthly(createdInRange, resolvedInRange, entriesInRange);

  // ── Tiempo promedio en cada estado (sobre el universo de la ventana) ──
  const tisMap = new Map<string, { status: string; type: string; total: number; count: number }>();
  for (const t of windowTasks) {
    const hist = dataset.statusHistory[t.id];
    if (!hist) continue;
    for (const e of hist) {
      const cur = tisMap.get(e.status) ?? { status: e.status, type: e.type, total: 0, count: 0 };
      cur.total += e.minutes;
      cur.count += 1;
      tisMap.set(e.status, cur);
    }
  }
  const avgTimeInStatus = [...tisMap.values()]
    .map((s) => ({
      status: s.status,
      type: s.type,
      avgMinutes: s.count ? Math.round(s.total / s.count) : 0,
      count: s.count,
    }))
    .sort((a, b) => b.avgMinutes - a.avgMinutes);

  // ── Totales ──
  const reopened = resolvedInRange.filter((t) => t.reopened).length;
  const totals = {
    scopedTotal: scoped.length,
    created: createdInRange.length,
    open: openSnapshot.length,
    resolved: resolvedInRange.length,
    unassigned: openSnapshot.filter((t) => t.isUnassigned).length,
    hours: round2(entriesInRange.reduce((s, e) => s + msToHours(e.durationMs), 0)),
    reopened,
    reopenRate: resolvedInRange.length
      ? round2((reopened / resolvedInRange.length) * 100)
      : 0,
    mttd: summarize(resolvedInRange.map((t) => t.mttdDays).filter((v): v is number => v != null)),
    mttr: summarize(resolvedInRange.map((t) => t.mttrDays).filter((v): v is number => v != null)),
  };

  return {
    totals,
    byList,
    byUser,
    byStatus,
    byPriority,
    monthly,
    avgTimeInStatus,
    meta: { fetchedAt: dataset.fetchedAt, timeRange: dataset.timeRange, filters },
  };
}

function buildMonthly(
  createdInRange: EnrichedTask[],
  resolvedInRange: EnrichedTask[],
  entriesInRange: TimeEntry[],
): MonthlyBucket[] {
  const map = new Map<
    string,
    { created: number; resolved: number; hours: number; mttr: number[]; mttd: number[] }
  >();
  const ensure = (k: string) => {
    let b = map.get(k);
    if (!b) {
      b = { created: 0, resolved: 0, hours: 0, mttr: [], mttd: [] };
      map.set(k, b);
    }
    return b;
  };
  for (const t of createdInRange) if (t.createdTs != null) ensure(monthKey(t.createdTs)).created += 1;
  for (const t of resolvedInRange) {
    if (t.resolvedTs == null) continue;
    const b = ensure(monthKey(t.resolvedTs));
    b.resolved += 1;
    if (t.mttrDays != null) b.mttr.push(t.mttrDays);
    if (t.mttdDays != null) b.mttd.push(t.mttdDays);
  }
  for (const e of entriesInRange)
    if (e.start != null) ensure(monthKey(e.start)).hours += msToHours(e.durationMs);

  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, b]) => ({
      month,
      created: b.created,
      resolved: b.resolved,
      hours: round2(b.hours),
      mttrDays: b.mttr.length ? round2(avg(b.mttr)) : null,
      mttdDays: b.mttd.length ? round2(avg(b.mttd)) : null,
    }));
}

const avg = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;
const round2 = (n: number) => Math.round(n * 100) / 100;
