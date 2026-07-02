/**
 * Enriquecimiento por tarea: deriva los timestamps de detección/resolución y
 * los tiempos MTTD/MTTR a partir del historial de estados (time-in-status).
 *
 * Definiciones (clasificando por el `type` de ClickUp, robusto a nombres de
 * estado distintos por lista):
 *   t0        = creación de la tarea (date_created, o el primer estado).
 *   detected  = primer estado con type ≠ "open"  (se empezó a trabajar).
 *   resolved  = primer estado con type ∈ {done, closed}.
 *   MTTD      = detected − t0   (tiempo en backlog/open).
 *   MTTR      = resolved − t0   (tiempo total hasta resolver).
 * Caso borde: si la tarea salta directo a done/closed sin estado activo,
 * detected == resolved ⇒ MTTD == MTTR y se marca noDetectionPhase.
 * Fallback sin historial: resolved = date_closed | date_done; MTTD = null.
 */
import type { StatusHistoryEntry, Task } from "@/lib/clickup/types";
import { MS_PER_DAY } from "./stats";

export interface EnrichedTask extends Task {
  createdTs: number | null;
  detectedTs: number | null;
  resolvedTs: number | null;
  /** MTTD en días (null si no calculable). */
  mttdDays: number | null;
  /** MTTR en días (null si no resuelta o sin creación). */
  mttrDays: number | null;
  /** true si pasó a done/closed sin estado activo previo. */
  noDetectionPhase: boolean;
  /** true si volvió de done/closed a un estado open/activo. */
  reopened: boolean;
  /** estado actual: resuelta o abierta (según statusType). */
  isResolved: boolean;
  isUnassigned: boolean;
  /** true si es subtarea (tiene parentId). No cuenta como ticket en los conteos. */
  isSubtask: boolean;
}

const isResolvedType = (t: string) => t === "done" || t === "closed";

export function enrichTask(
  task: Task,
  history: StatusHistoryEntry[] | undefined,
): EnrichedTask {
  const hist = history ? [...history].sort((a, b) => a.orderindex - b.orderindex) : [];
  const createdTs = task.dateCreated ?? (hist.length ? hist[0].since : null);

  let detectedTs: number | null = null;
  let resolvedTs: number | null = null;
  let noDetectionPhase = false;
  let reopened = false;

  if (hist.length) {
    const detectedEntry = hist.find((e) => e.type !== "open") ?? null;
    const resolvedEntry = hist.find((e) => isResolvedType(e.type)) ?? null;
    detectedTs = detectedEntry ? detectedEntry.since : null;
    resolvedTs = resolvedEntry ? resolvedEntry.since : null;
    noDetectionPhase = Boolean(
      detectedEntry && resolvedEntry && isResolvedType(detectedEntry.type),
    );
    // reapertura: un done/closed seguido más tarde de un open/custom.
    const firstResolvedIdx = hist.findIndex((e) => isResolvedType(e.type));
    if (firstResolvedIdx >= 0) {
      reopened = hist
        .slice(firstResolvedIdx + 1)
        .some((e) => !isResolvedType(e.type));
    }
  } else {
    // sin historial: usar fechas de la tarea.
    resolvedTs = task.dateClosed ?? task.dateDone ?? null;
  }

  const mttdDays =
    detectedTs != null && createdTs != null
      ? Math.max(0, detectedTs - createdTs) / MS_PER_DAY
      : null;
  const mttrDays =
    resolvedTs != null && createdTs != null
      ? Math.max(0, resolvedTs - createdTs) / MS_PER_DAY
      : null;

  return {
    ...task,
    createdTs,
    detectedTs,
    resolvedTs,
    mttdDays,
    mttrDays,
    noDetectionPhase,
    reopened,
    isResolved: isResolvedType(task.statusType),
    isUnassigned: task.assignees.length === 0,
    isSubtask: task.parentId != null,
  };
}

export function enrichTasks(
  tasks: Task[],
  statusHistory: Record<string, StatusHistoryEntry[]>,
): EnrichedTask[] {
  return tasks.map((t) => enrichTask(t, statusHistory[t.id]));
}
