/** Tipos del dominio ClickUp, normalizados para el resto de la app. */

/** Tipo de estado según ClickUp (independiente del nombre, que varía por lista). */
export type StatusType = "open" | "custom" | "done" | "closed";

export interface Assignee {
  id: number;
  username: string;
  email: string;
}

export interface ClickUpList {
  id: string;
  name: string;
  folderId: string;
  folderName: string;
}

export interface Task {
  id: string;
  name: string;
  /** Nombre del estado actual (ej "in progress"). */
  status: string;
  /** Tipo del estado actual. */
  statusType: StatusType;
  listId: string;
  listName: string;
  folderId: string;
  folderName: string;
  assignees: Assignee[];
  tags: string[];
  priority: string | null;
  /** tiempo trackeado agregado en la tarea (ms). ClickUp lo expone en `time_spent`. */
  timeSpentMs: number;
  /** epoch ms. */
  dateCreated: number | null;
  dateClosed: number | null;
  dateDone: number | null;
}

/** Una entrada del historial de estados (de bulk_time_in_status). */
export interface StatusHistoryEntry {
  status: string;
  type: StatusType;
  /** epoch ms en que la tarea ENTRÓ a este estado. */
  since: number;
  /** minutos acumulados en este estado. */
  minutes: number;
  orderindex: number;
}

/** Una imputación de tiempo (un interval de /task/{id}/time). */
export interface TimeEntry {
  id: string;
  taskId: string | null;
  listId: string | null;
  folderId: string | null;
  userId: number;
  username: string;
  email: string;
  /** epoch ms en que se ejecutó la imputación. */
  start: number | null;
  durationMs: number;
  billable: boolean;
}

/** Dataset crudo traído de ClickUp, antes de calcular métricas. */
export interface ClickUpDataset {
  lists: ClickUpList[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  /** historial de estados por task id. */
  statusHistory: Record<string, StatusHistoryEntry[]>;
  /** epoch ms en que se trajo el dataset. */
  fetchedAt: number;
  /** rango temporal de las imputaciones traídas (epoch ms). */
  timeRange: { start: number; end: number };
}
