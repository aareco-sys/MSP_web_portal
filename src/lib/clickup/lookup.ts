import type { ClickUpDataset } from "./types";

/** Username de un userId de ClickUp, buscando en tasks/timeEntries. Barato:
 * no recalcula métricas, solo escanea el dataset ya cacheado en memoria. */
export function findUsername(dataset: ClickUpDataset, userId: number): string | null {
  for (const e of dataset.timeEntries) {
    if (e.userId === userId && e.username) return e.username;
  }
  for (const t of dataset.tasks) {
    const a = t.assignees.find((x) => x.id === userId);
    if (a?.username) return a.username;
  }
  return null;
}
