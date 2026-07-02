/**
 * Métricas de Rex Adoption — reporte semanal sobre una lista específica de
 * ClickUp. Portado de Automations/MSP_app/web/src/lib/rex-metrics.ts a nuestro
 * stack; la paleta ya es la de marca DinoCloud.
 */

export interface RexTask {
  id: string;
  name: string;
  /** estado en minúsculas. */
  status: string;
  priority: string | null;
  assignees: { id: number; username: string; email: string }[];
  dateCreated: number | null;
  dateClosed: number | null;
  dueDate: number | null;
  /** id de la tarea padre si es subtarea (de ClickUp `parent`). */
  parent: string | null;
  url: string;
}

/** Una subtarea en el detalle de "in progress". */
export interface InProgressSub {
  id: string;
  name: string;
  status: string;
  statusColor: string;
  assignee: string;
  url: string;
}
/** Una tarea "in progress" con sus subtareas. */
export interface InProgressTask {
  id: string;
  name: string;
  assignee: string;
  url: string;
  subtasks: InProgressSub[];
}

export interface Slice {
  key: string;
  label: string;
  count: number;
  color: string;
}

export interface RexMetrics {
  total: number;
  /** subtareas (excluidas de los conteos; solo desglose). */
  subtasks: number;
  open: number;
  closed: number;
  done: number;
  overdue: number;
  donePct: number;
  byStatus: Slice[];
  byPriority: Slice[];
  openByAssignee: Slice[];
  created: number;
  completed: number;
  completedList: { name: string; assignee: string }[];
  /** cantidad de tareas en "in progress". */
  inProgressCount: number;
  /** detalle de tareas in progress + sus subtareas. */
  inProgress: InProgressTask[];
  range: { start: number; end: number };
}

const STATUS_COLORS: Record<string, string> = {
  backlog: "#9AA0AD",
  "in progress": "#D49215",
  "in review": "#3466C3",
  implemented: "#3DAA6E",
  closed: "#0E5733",
};
const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#C2362F",
  high: "#D49215",
  normal: "#3DAA6E",
  low: "#B6E4C8",
};
const ASSIGNEE_PALETTE = [
  "#3DAA6E", "#0E5733", "#7EC9A0", "#3466C3", "#1F8A5B", "#2EA36A", "#B6E4C8", "#565D6D",
];

const DONE_STATUSES = new Set(["implemented", "closed", "done", "complete"]);
const CLOSED_STATUSES = new Set(["closed", "complete"]);

function titleCase(raw: string): string {
  return raw
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

const DAY = 86_400_000;
/** Rango por defecto: últimos 7 días terminando hoy. */
export function defaultRexRange(now = Date.now()): { start: number; end: number } {
  const end = now;
  return { start: end - 6 * DAY, end };
}

export function computeRexMetrics(
  tasks: RexTask[],
  range?: { start?: number; end?: number },
  now = Date.now(),
): RexMetrics {
  const { start, end } =
    range?.start != null && range?.end != null
      ? { start: range.start, end: range.end }
      : defaultRexRange(now);

  // Las subtareas NO cuentan como tickets: los conteos van solo sobre tareas de
  // nivel superior (parent == null). El detalle "in progress" sí las anida.
  const topLevel = tasks.filter((t) => t.parent == null);
  const subtasksCount = tasks.length - topLevel.length;

  const statusCounts = new Map<string, number>();
  const priorityCounts = new Map<string, number>();
  const openAssignee = new Map<string, number>();

  let closed = 0;
  let done = 0;
  let overdue = 0;
  let created = 0;
  let completed = 0;
  const completedList: { name: string; assignee: string }[] = [];

  for (const t of topLevel) {
    const status = t.status.toLowerCase();
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);

    const isDone = DONE_STATUSES.has(status);
    if (isDone) done += 1;
    if (CLOSED_STATUSES.has(status)) closed += 1;

    if (!isDone && t.dueDate != null && t.dueDate < now) overdue += 1;

    if (t.priority) {
      const p = t.priority.toLowerCase();
      if (p in PRIORITY_COLORS) priorityCounts.set(p, (priorityCounts.get(p) ?? 0) + 1);
    }

    if (!isDone) {
      if (t.assignees.length === 0) {
        openAssignee.set("__unassigned", (openAssignee.get("__unassigned") ?? 0) + 1);
      } else {
        for (const a of t.assignees) {
          const name = a.username || a.email || `user-${a.id}`;
          openAssignee.set(name, (openAssignee.get(name) ?? 0) + 1);
        }
      }
    }

    if (t.dateCreated != null && t.dateCreated >= start && t.dateCreated <= end) created += 1;
    if (t.dateClosed != null && t.dateClosed >= start && t.dateClosed <= end) {
      completed += 1;
      const assignee =
        t.assignees.map((a) => a.username).filter(Boolean).join(", ") || "__unassigned";
      completedList.push({ name: t.name, assignee });
    }
  }

  // ── Detalle "in progress" + subtareas ──
  const IN_PROGRESS = "in progress";
  const assigneeStr = (t: RexTask) =>
    t.assignees.map((a) => a.username).filter(Boolean).join(", ") || "__unassigned";
  const childrenByParent = new Map<string, RexTask[]>();
  for (const t of tasks) {
    if (t.parent) {
      const arr = childrenByParent.get(t.parent) ?? [];
      arr.push(t);
      childrenByParent.set(t.parent, arr);
    }
  }
  const inProgress: InProgressTask[] = topLevel
    .filter((t) => t.status === IN_PROGRESS)
    .map((t) => ({
      id: t.id,
      name: t.name,
      assignee: assigneeStr(t),
      url: t.url,
      subtasks: (childrenByParent.get(t.id) ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        status: titleCase(c.status),
        statusColor: STATUS_COLORS[c.status] ?? "#9AA0AD",
        assignee: assigneeStr(c),
        url: c.url,
      })),
    }));

  const total = topLevel.length;
  const byStatus: Slice[] = [...statusCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({
      key,
      label: titleCase(key),
      count,
      color: STATUS_COLORS[key] ?? "#9AA0AD",
    }));

  const byPriority: Slice[] = (["urgent", "high", "normal", "low"] as const)
    .map((k) => ({ key: k, label: titleCase(k), count: priorityCounts.get(k) ?? 0, color: PRIORITY_COLORS[k] }))
    .filter((p) => p.count > 0);

  const openByAssignee: Slice[] = [...openAssignee.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count], i) => ({
      key,
      label: key,
      count,
      color: key === "__unassigned" ? "#9AA0AD" : ASSIGNEE_PALETTE[i % ASSIGNEE_PALETTE.length],
    }));

  return {
    total,
    subtasks: subtasksCount,
    open: total - closed,
    closed,
    done,
    overdue,
    donePct: total ? Math.round((done / total) * 1000) / 10 : 0,
    byStatus,
    byPriority,
    openByAssignee,
    created,
    completed,
    completedList,
    inProgressCount: statusCounts.get(IN_PROGRESS) ?? 0,
    inProgress,
    range: { start, end },
  };
}
