import type { Summary } from "./stats";

/** Filtros que llegan desde la UI (todos opcionales). */
export interface MetricsFilters {
  /** rango por fecha de creación / imputación (epoch ms). */
  start?: number;
  end?: number;
  /** ids de carpetas a incluir. */
  folderIds?: string[];
  /** ids de listas a incluir. */
  listIds?: string[];
  /** ids de usuarios (assignee / imputador) a incluir. */
  userIds?: number[];
}

export interface ListMetrics {
  listId: string;
  listName: string;
  folderName: string;
  /** tareas relevantes a la ventana (creadas ∪ resueltas ∪ abiertas-al-fin). */
  total: number;
  created: number; // creadas en el rango
  open: number; // backlog al final del rango (foto)
  resolved: number; // resueltas en el rango (throughput)
  unassigned: number; // abiertas sin asignar (foto)
  /** subtareas del cliente en scope (no cuentan como tickets; solo desglose). */
  subtasks: number;
  statusCounts: Record<string, number>;
  /** conteo por tipo de estado de ClickUp (para la barra apilada por cliente). */
  statusByType: { open: number; custom: number; done: number; closed: number };
  hours: number; // horas imputadas en el rango
  avgAgingDays: number | null; // antigüedad media de las abiertas (al fin del rango)
  mttd: Summary; // en días, sobre resueltas en el rango
  mttr: Summary; // en días, sobre resueltas en el rango
}

export interface UserMetrics {
  userId: number;
  username: string;
  email: string;
  total: number;
  open: number;
  resolved: number;
  hours: number;
  /** subtareas asignadas al ingeniero en scope (solo desglose). */
  subtasks: number;
  /** cantidad de clientes/listas donde trabaja (tareas asignadas ∪ horas cargadas). */
  projects: number;
}

export interface MonthlyBucket {
  month: string; // 'YYYY-MM'
  created: number;
  resolved: number;
  hours: number;
  mttrDays: number | null; // media del mes
  mttdDays: number | null;
  /** subtareas creadas en el mes (solo desglose; no cuentan como tickets). */
  subtasks: number;
}

export interface StatusCount {
  status: string;
  type: string;
  count: number;
}

export interface MetricsResult {
  totals: {
    /** tareas de nivel superior en scope (sin filtro de fecha) — para empty-state/contexto. */
    scopedTotal: number;
    /** subtareas en scope (excluidas de los conteos; sus horas sí cuentan). */
    subtasks: number;
    created: number; // creadas en el rango
    open: number; // backlog al final del rango (foto)
    resolved: number; // resueltas en el rango (throughput)
    unassigned: number; // abiertas sin asignar (foto)
    hours: number; // horas imputadas en el rango
    reopened: number; // entre las resueltas en el rango
    reopenRate: number; // % de resueltas que se reabrieron
    mttd: Summary;
    mttr: Summary;
  };
  byList: ListMetrics[];
  byUser: UserMetrics[];
  byStatus: StatusCount[];
  byPriority: { priority: string; count: number }[];
  monthly: MonthlyBucket[];
  avgTimeInStatus: { status: string; type: string; avgMinutes: number; count: number }[];
  meta: {
    fetchedAt: number;
    timeRange: { start: number; end: number };
    filters: MetricsFilters;
    /** capacidad del rango (160 h/mes prorrateadas). null si no hay rango de fechas. */
    capacityHours: number | null;
  };
}
