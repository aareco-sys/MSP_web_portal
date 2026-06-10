/**
 * Scorecard de performance por ingeniero (Cloud Engineer).
 * Reusa el dataset cacheado + enrichTasks. Calcula métricas personales y un
 * baseline del equipo (promedios) para comparar en el radar.
 *
 * Aclaración: son señales de FLUJO (no de valor entregado). Dependen de la
 * disciplina de carga en ClickUp. Usar para coaching/balanceo, no rankings.
 */
import type { ClickUpDataset, TimeEntry } from "@/lib/clickup/types";
import { enrichTasks, type EnrichedTask } from "./enrich";
import { monthKey, msToHours, summarize, type Summary } from "./stats";
import type { MetricsFilters } from "./types";

const inRange = (ts: number | null, start?: number, end?: number): boolean => {
  if (ts == null) return false;
  if (start != null && ts < start) return false;
  if (end != null && ts > end) return false;
  return true;
};
function openAsOf(t: EnrichedTask, boundary: number): boolean {
  if (t.createdTs == null) return !t.isResolved;
  if (t.createdTs > boundary) return false;
  if (t.resolvedTs != null && t.resolvedTs <= boundary) return false;
  return true;
}
const DAY = 86_400_000;
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
const mean = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null);

export interface UserStat {
  resolved: number;
  open: number;
  created: number;
  hours: number;
  hoursPerResolved: number | null;
  reopened: number;
  reopenRate: number;
  overdue: number;
  overdueRate: number;
  avgAgingDays: number | null;
  clients: number;
  mttd: Summary;
  mttr: Summary;
}

export interface UserScorecard extends UserStat {
  userId: number;
  username: string;
  email: string;
  monthly: { month: string; resolved: number; hours: number; mttrDays: number | null }[];
  byClient: { listName: string; resolved: number; hours: number }[];
  team: {
    size: number;
    avgResolved: number;
    avgHours: number;
    avgHoursPerResolved: number | null;
    avgMttr: number | null;
    avgReopenRate: number;
    avgOverdueRate: number;
    maxResolved: number;
    maxHours: number;
  };
}

interface Ctx {
  start?: number;
  end?: number;
  boundary: number;
  noRange: boolean;
}

function statFor(mine: EnrichedTask[], entries: TimeEntry[], ctx: Ctx): UserStat {
  const { start, end, boundary, noRange } = ctx;
  const resolvedInRange = mine.filter(
    (t) => t.resolvedTs != null && (noRange || inRange(t.resolvedTs, start, end)),
  );
  const createdInRange = mine.filter((t) => noRange || inRange(t.createdTs, start, end));
  const openSnap = mine.filter((t) => openAsOf(t, boundary));
  const hours = entries.reduce((s, e) => s + msToHours(e.durationMs), 0);
  const resolved = resolvedInRange.length;
  const reopened = resolvedInRange.filter((t) => t.reopened).length;
  const overdue = openSnap.filter((t) => t.dateDue != null && t.dateDue < boundary).length;
  const aging = openSnap
    .filter((t) => t.createdTs != null)
    .map((t) => (boundary - (t.createdTs as number)) / DAY);
  return {
    resolved,
    open: openSnap.length,
    created: createdInRange.length,
    hours: round2(hours),
    hoursPerResolved: resolved ? round2(hours / resolved) : null,
    reopened,
    reopenRate: resolved ? round1((reopened / resolved) * 100) : 0,
    overdue,
    overdueRate: openSnap.length ? round1((overdue / openSnap.length) * 100) : 0,
    avgAgingDays: aging.length ? round1(mean(aging) as number) : null,
    clients: new Set(mine.map((t) => t.listId)).size,
    mttd: summarize(resolvedInRange.map((t) => t.mttdDays).filter((v): v is number => v != null)),
    mttr: summarize(resolvedInRange.map((t) => t.mttrDays).filter((v): v is number => v != null)),
  };
}

export function computeUserScorecard(
  dataset: ClickUpDataset,
  userId: number,
  filters: MetricsFilters = {},
): UserScorecard {
  const { start, end } = filters;
  const noRange = start == null && end == null;
  const boundary = end ?? dataset.fetchedAt;
  const ctx: Ctx = { start, end, boundary, noRange };

  const enriched = enrichTasks(dataset.tasks, dataset.statusHistory);
  const scoped = enriched.filter((t) => {
    if (filters.folderIds?.length && !filters.folderIds.includes(t.folderId)) return false;
    if (filters.listIds?.length && !filters.listIds.includes(t.listId)) return false;
    return true;
  });

  // entries en scope + rango, agrupadas por usuario.
  const entriesByUser = new Map<number, TimeEntry[]>();
  for (const e of dataset.timeEntries) {
    if (filters.folderIds?.length && (!e.folderId || !filters.folderIds.includes(e.folderId))) continue;
    if (filters.listIds?.length && (!e.listId || !filters.listIds.includes(e.listId))) continue;
    if (!(noRange || inRange(e.start, start, end))) continue;
    const arr = entriesByUser.get(e.userId) ?? [];
    arr.push(e);
    entriesByUser.set(e.userId, arr);
  }

  // tareas por usuario (assignee).
  const tasksByUser = new Map<number, EnrichedTask[]>();
  const nameById = new Map<number, { username: string; email: string }>();
  for (const t of scoped) {
    for (const a of t.assignees) {
      const arr = tasksByUser.get(a.id) ?? [];
      arr.push(t);
      tasksByUser.set(a.id, arr);
      if (!nameById.has(a.id)) nameById.set(a.id, { username: a.username, email: a.email });
    }
  }

  // ── Baseline del equipo (promedios sobre usuarios con actividad) ──
  const allUserIds = new Set<number>([...tasksByUser.keys(), ...entriesByUser.keys()]);
  allUserIds.delete(0); // sin asignar no es un ingeniero
  const stats: UserStat[] = [];
  for (const uid of allUserIds) {
    const s = statFor(tasksByUser.get(uid) ?? [], entriesByUser.get(uid) ?? [], ctx);
    if (s.resolved > 0 || s.hours > 0 || s.open > 0) stats.push(s);
  }
  const avg = (sel: (s: UserStat) => number) =>
    stats.length ? round2(stats.reduce((a, s) => a + sel(s), 0) / stats.length) : 0;
  const mttrVals = stats.map((s) => s.mttr.mean).filter((v): v is number => v != null);
  const hprVals = stats.map((s) => s.hoursPerResolved).filter((v): v is number => v != null);
  const team = {
    size: stats.length,
    avgResolved: avg((s) => s.resolved),
    avgHours: avg((s) => s.hours),
    avgHoursPerResolved: hprVals.length ? round2(mean(hprVals) as number) : null,
    avgMttr: mttrVals.length ? round2(mean(mttrVals) as number) : null,
    avgReopenRate: avg((s) => s.reopenRate),
    avgOverdueRate: avg((s) => s.overdueRate),
    maxResolved: Math.max(1, ...stats.map((s) => s.resolved)),
    maxHours: Math.max(1, ...stats.map((s) => s.hours)),
  };

  // ── Detalle del ingeniero focal ──
  const mine = tasksByUser.get(userId) ?? [];
  const myEntries = entriesByUser.get(userId) ?? [];
  const base = statFor(mine, myEntries, ctx);
  const id = nameById.get(userId) ?? { username: String(userId), email: "" };

  // mensual
  const monthMap = new Map<string, { resolved: number; hours: number; mttr: number[] }>();
  const ensure = (k: string) => {
    let b = monthMap.get(k);
    if (!b) {
      b = { resolved: 0, hours: 0, mttr: [] };
      monthMap.set(k, b);
    }
    return b;
  };
  for (const t of mine) {
    if (t.resolvedTs != null && (noRange || inRange(t.resolvedTs, start, end))) {
      const b = ensure(monthKey(t.resolvedTs));
      b.resolved += 1;
      if (t.mttrDays != null) b.mttr.push(t.mttrDays);
    }
  }
  for (const e of myEntries) if (e.start != null) ensure(monthKey(e.start)).hours += msToHours(e.durationMs);
  const monthly = [...monthMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, b]) => ({
      month,
      resolved: b.resolved,
      hours: round2(b.hours),
      mttrDays: b.mttr.length ? round2(mean(b.mttr) as number) : null,
    }));

  // por cliente (lista)
  const clientMap = new Map<string, { resolved: number; hours: number }>();
  for (const t of mine) {
    if (t.resolvedTs != null && (noRange || inRange(t.resolvedTs, start, end))) {
      const c = clientMap.get(t.listName) ?? { resolved: 0, hours: 0 };
      c.resolved += 1;
      clientMap.set(t.listName, c);
    }
  }
  const listNameById = new Map(dataset.lists.map((l) => [l.id, l.name]));
  for (const e of myEntries) {
    const ln = e.listId ? listNameById.get(e.listId) : undefined;
    if (!ln) continue;
    const c = clientMap.get(ln) ?? { resolved: 0, hours: 0 };
    c.hours += msToHours(e.durationMs);
    clientMap.set(ln, c);
  }
  const byClient = [...clientMap.entries()]
    .map(([listName, c]) => ({ listName, resolved: c.resolved, hours: round2(c.hours) }))
    .sort((a, b) => b.resolved - a.resolved || b.hours - a.hours)
    .slice(0, 8);

  return {
    userId,
    username: id.username,
    email: id.email,
    ...base,
    monthly,
    byClient,
    team,
  };
}
