import { describe, expect, it } from "vitest";
import { computeMetrics } from "./metrics";
import { enrichTask } from "./enrich";
import type {
  ClickUpDataset,
  StatusHistoryEntry,
  Task,
  TimeEntry,
} from "@/lib/clickup/types";

const ms = (iso: string) => Date.parse(iso);
const H = 3_600_000;

function task(over: Partial<Task> & Pick<Task, "id" | "listId">): Task {
  return {
    name: over.name ?? `task ${over.id}`,
    status: over.status ?? "completed",
    statusType: over.statusType ?? "done",
    listId: over.listId,
    listName: over.listName ?? over.listId,
    folderId: over.folderId ?? "F1",
    folderName: over.folderName ?? "Folder Latam",
    parentId: over.parentId ?? null,
    assignees: over.assignees ?? [],
    tags: over.tags ?? [],
    priority: over.priority ?? null,
    timeSpentMs: over.timeSpentMs ?? 0,
    dateCreated: over.dateCreated ?? null,
    dateClosed: over.dateClosed ?? null,
    dateDone: over.dateDone ?? null,
    dateDue: over.dateDue ?? null,
    id: over.id,
  };
}

const hist = (
  entries: [status: string, type: StatusHistoryEntry["type"], since: string][],
): StatusHistoryEntry[] =>
  entries.map(([status, type, since], i) => ({
    status,
    type,
    since: ms(since),
    minutes: 0,
    orderindex: i,
  }));

const entry = (
  over: Partial<TimeEntry> & Pick<TimeEntry, "id" | "taskId" | "listId" | "userId">,
): TimeEntry => ({
  folderId: "F1",
  username: over.username ?? `u${over.userId}`,
  email: "",
  start: over.start ?? null,
  durationMs: over.durationMs ?? 0,
  billable: false,
  ...over,
});

// ── Fixture ─────────────────────────────────────────────────────────────────
const u1 = { id: 1, username: "ana", email: "ana@dinocloud.com" };
const u2 = { id: 2, username: "beto", email: "beto@dinocloud.com" };

const tasks: Task[] = [
  task({ id: "t1", listId: "LA", assignees: [u1], dateCreated: ms("2026-01-01T00:00:00Z") }),
  task({ id: "t2", listId: "LA", assignees: [u1], dateCreated: ms("2026-01-05T00:00:00Z") }),
  task({ id: "t3", listId: "LB", assignees: [u2], dateCreated: ms("2026-02-01T00:00:00Z") }),
  task({ id: "t4", listId: "LB", status: "in progress", statusType: "custom", assignees: [], dateCreated: ms("2026-01-15T00:00:00Z") }),
  task({ id: "t5", listId: "LA", status: "Closed", statusType: "closed", assignees: [u1], dateCreated: ms("2026-03-01T00:00:00Z"), dateClosed: ms("2026-03-03T00:00:00Z") }),
  // creada en enero pero RESUELTA en febrero → clave para el bug fix.
  task({ id: "t6", listId: "LA", assignees: [u1], dateCreated: ms("2026-01-20T00:00:00Z") }),
];

const statusHistory: Record<string, StatusHistoryEntry[]> = {
  t1: hist([
    ["backlog", "open", "2026-01-01T00:00:00Z"],
    ["in progress", "custom", "2026-01-03T00:00:00Z"],
    ["completed", "done", "2026-01-10T00:00:00Z"],
  ]),
  t2: hist([
    ["backlog", "open", "2026-01-05T00:00:00Z"],
    ["completed", "done", "2026-01-06T00:00:00Z"],
  ]),
  t3: hist([
    ["backlog", "open", "2026-02-01T00:00:00Z"],
    ["in progress", "custom", "2026-02-02T00:00:00Z"],
    ["completed", "done", "2026-02-05T00:00:00Z"],
    ["in progress", "custom", "2026-02-06T00:00:00Z"],
    ["completed", "done", "2026-02-08T00:00:00Z"],
  ]),
  t4: hist([
    ["backlog", "open", "2026-01-15T00:00:00Z"],
    ["in progress", "custom", "2026-01-16T00:00:00Z"],
  ]),
  t6: hist([
    ["backlog", "open", "2026-01-20T00:00:00Z"],
    ["in progress", "custom", "2026-01-21T00:00:00Z"],
    ["completed", "done", "2026-02-10T00:00:00Z"],
  ]),
  // t5 sin historial → fallback por fechas
};

const timeEntries: TimeEntry[] = [
  entry({ id: "e1", taskId: "t1", listId: "LA", userId: 1, start: ms("2026-01-03T10:00:00Z"), durationMs: 2 * H }),
  entry({ id: "e2", taskId: "t3", listId: "LB", userId: 2, start: ms("2026-02-03T10:00:00Z"), durationMs: 5 * H }),
  entry({ id: "e3", taskId: "t4", listId: "LB", userId: 1, start: ms("2026-01-16T10:00:00Z"), durationMs: 1 * H }),
  entry({ id: "e4", taskId: "t6", listId: "LA", userId: 1, start: ms("2026-02-12T10:00:00Z"), durationMs: 3 * H }),
];

const dataset: ClickUpDataset = {
  lists: [
    { id: "LA", name: "LA", folderId: "F1", folderName: "Folder Latam" },
    { id: "LB", name: "LB", folderId: "F1", folderName: "Folder Latam" },
  ],
  tasks,
  timeEntries,
  statusHistory,
  fetchedAt: ms("2026-06-01T00:00:00Z"),
  timeRange: { start: ms("2025-06-01T00:00:00Z"), end: ms("2026-06-01T00:00:00Z") },
};

// ── enrichTask: casos borde ────────────────────────────────────────────────────
describe("enrichTask", () => {
  it("MTTD/MTTR de una tarea normal", () => {
    const e = enrichTask(tasks[0], statusHistory.t1);
    expect(e.mttdDays).toBe(2);
    expect(e.mttrDays).toBe(9);
    expect(e.reopened).toBe(false);
  });

  it("noDetectionPhase y MTTD==MTTR cuando salta a done", () => {
    const e = enrichTask(tasks[1], statusHistory.t2);
    expect(e.noDetectionPhase).toBe(true);
    expect(e.mttdDays).toBe(1);
    expect(e.mttrDays).toBe(1);
  });

  it("detecta reapertura y usa la primera resolución", () => {
    const e = enrichTask(tasks[2], statusHistory.t3);
    expect(e.reopened).toBe(true);
    expect(e.mttrDays).toBe(4);
    expect(e.mttdDays).toBe(1);
  });

  it("fallback a fechas sin historial", () => {
    const e = enrichTask(tasks[4], undefined);
    expect(e.mttdDays).toBeNull();
    expect(e.mttrDays).toBe(2);
    expect(e.isResolved).toBe(true);
  });
});

// ── computeMetrics: ventana de reporte ──────────────────────────────────────────
describe("computeMetrics (sin rango)", () => {
  const r = computeMetrics(dataset);

  it("totales", () => {
    expect(r.totals.scopedTotal).toBe(6);
    expect(r.totals.created).toBe(6);
    expect(r.totals.open).toBe(1); // solo t4 sigue abierta
    expect(r.totals.resolved).toBe(5); // t1,t2,t3,t5,t6
    expect(r.totals.unassigned).toBe(1); // t4
    expect(r.totals.hours).toBe(11); // 2+5+1+3
    expect(r.totals.reopened).toBe(1);
    expect(r.totals.reopenRate).toBe(20); // 1/5
  });

  it("MTTR/MTTD sobre resueltas", () => {
    expect(r.totals.mttr.count).toBe(5);
    expect(r.totals.mttr.mean).toBe(7.4); // (9+1+4+2+21)/5
    expect(r.totals.mttd.count).toBe(4); // t5 sin historial
  });

  it("por lista", () => {
    const la = r.byList.find((l) => l.listId === "LA")!;
    const lb = r.byList.find((l) => l.listId === "LB")!;
    expect(la.created).toBe(4);
    expect(la.resolved).toBe(4);
    expect(la.open).toBe(0);
    expect(la.hours).toBe(5); // e1 + e4
    expect(lb.open).toBe(1); // t4
    expect(lb.hours).toBe(6); // e2 + e3
    expect(lb.mttr.mean).toBe(4);
  });

  it("por usuario (horas reales, no repartidas)", () => {
    const ana = r.byUser.find((u) => u.userId === 1)!;
    const beto = r.byUser.find((u) => u.userId === 2)!;
    const sin = r.byUser.find((u) => u.userId === 0)!;
    expect(ana.hours).toBe(6); // e1 + e3 + e4
    expect(ana.resolved).toBe(4);
    expect(ana.projects).toBe(2); // LA (tareas) + LB (horas e3)
    expect(beto.hours).toBe(5);
    expect(beto.projects).toBe(1); // LB
    expect(sin.open).toBe(1); // t4 sin asignar
  });

  it("sin rango no hay capacidad (base mensual no aplica)", () => {
    expect(r.meta.capacityHours).toBeNull();
  });

  it("mensual", () => {
    const jan = r.monthly.find((m) => m.month === "2026-01")!;
    const feb = r.monthly.find((m) => m.month === "2026-02")!;
    expect(jan.created).toBe(4); // t1,t2,t4,t6
    expect(jan.resolved).toBe(2); // t1,t2
    expect(jan.hours).toBe(3); // e1 + e3
    expect(feb.resolved).toBe(2); // t3,t6
    expect(feb.hours).toBe(8); // e2 + e4
  });
});

describe("computeMetrics (rango = febrero) — ventana de reporte + bug fix", () => {
  const r = computeMetrics(dataset, {
    start: ms("2026-02-01T00:00:00Z"),
    end: ms("2026-02-28T23:59:59Z"),
  });

  it("creadas solo cuenta las creadas en febrero", () => {
    expect(r.totals.created).toBe(1); // t3
  });

  it("resueltas cuenta las RESUELTAS en febrero, sin importar creación (bug fix)", () => {
    // t6 fue creada en enero pero resuelta el 10/02 → debe contar.
    expect(r.totals.resolved).toBe(2); // t3 + t6
    expect(r.totals.mttr.count).toBe(2);
  });

  it("abiertas = foto del backlog al 28/02", () => {
    expect(r.totals.open).toBe(1); // t4 (t5 aún no creada, resto resueltas)
    expect(r.totals.unassigned).toBe(1);
  });

  it("horas = imputaciones con fecha en febrero", () => {
    expect(r.totals.hours).toBe(8); // e2 (3/2) + e4 (12/2)
  });

  it("capacidad prorrateada por el rango (~160 h/mes)", () => {
    // Febrero ≈ 28 días → ~147 h (160 × 28/30.44).
    expect(r.meta.capacityHours).not.toBeNull();
    expect(r.meta.capacityHours!).toBeGreaterThan(140);
    expect(r.meta.capacityHours!).toBeLessThan(155);
  });
});

describe("computeMetrics (subtareas: no cuentan como tickets, pero sus horas sí)", () => {
  // 1 tarea padre + 1 subtarea, ambas resueltas, cada una con horas imputadas.
  const subDataset: ClickUpDataset = {
    lists: [{ id: "LA", name: "LA", folderId: "F1", folderName: "Folder Latam" }],
    tasks: [
      task({ id: "p1", listId: "LA", assignees: [u1], dateCreated: ms("2026-01-01T00:00:00Z"), dateClosed: ms("2026-01-02T00:00:00Z") }),
      task({ id: "s1", listId: "LA", parentId: "p1", assignees: [u1], dateCreated: ms("2026-01-01T00:00:00Z"), dateClosed: ms("2026-01-02T00:00:00Z") }),
    ],
    timeEntries: [
      entry({ id: "ep", taskId: "p1", listId: "LA", userId: 1, start: ms("2026-01-01T10:00:00Z"), durationMs: 2 * H }),
      entry({ id: "es", taskId: "s1", listId: "LA", userId: 1, start: ms("2026-01-01T12:00:00Z"), durationMs: 3 * H }),
    ],
    statusHistory: {},
    fetchedAt: ms("2026-06-01T00:00:00Z"),
    timeRange: { start: ms("2025-06-01T00:00:00Z"), end: ms("2026-06-01T00:00:00Z") },
  };
  const r = computeMetrics(subDataset);

  it("la subtarea NO infla los conteos", () => {
    expect(r.totals.scopedTotal).toBe(1); // solo la tarea padre
    expect(r.totals.subtasks).toBe(1); // la subtarea, contada aparte
    expect(r.totals.created).toBe(1);
    expect(r.totals.resolved).toBe(1); // solo p1
    const la = r.byList.find((l) => l.listId === "LA")!;
    expect(la.resolved).toBe(1);
    expect(la.subtasks).toBe(1); // desglose por cliente
    expect(r.byUser.find((u) => u.userId === 1)!.subtasks).toBe(1); // desglose por ingeniero
  });

  it("las horas SÍ incluyen las de la subtarea", () => {
    expect(r.totals.hours).toBe(5); // ep (2) + es (3)
    expect(r.byList.find((l) => l.listId === "LA")!.hours).toBe(5);
    expect(r.byUser.find((u) => u.userId === 1)!.hours).toBe(5);
  });
});

describe("computeMetrics (filtros de scope)", () => {
  it("filtra por lista", () => {
    const r = computeMetrics(dataset, { listIds: ["LA"] });
    expect(r.totals.scopedTotal).toBe(4); // t1,t2,t5,t6
    expect(r.byList).toHaveLength(1);
  });

  it("filtra por usuario", () => {
    const r = computeMetrics(dataset, { userIds: [2] });
    expect(r.totals.scopedTotal).toBe(1);
    expect(r.byList[0].listId).toBe("LB");
  });
});
