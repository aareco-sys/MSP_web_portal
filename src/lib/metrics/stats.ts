/** Estadística básica para agregar métricas (toleran arrays vacíos). */

export interface Summary {
  mean: number | null;
  median: number | null;
  p90: number | null;
  count: number;
}

export function summarize(values: number[]): Summary {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  const count = xs.length;
  if (count === 0) return { mean: null, median: null, p90: null, count: 0 };
  const mean = xs.reduce((s, v) => s + v, 0) / count;
  return {
    mean,
    median: percentile(xs, 50),
    p90: percentile(xs, 90),
    count,
  };
}

/** Percentil por interpolación lineal sobre un array YA ordenado asc. */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo);
}

export const MS_PER_DAY = 86_400_000;
export const msToDays = (ms: number): number => ms / MS_PER_DAY;
export const msToHours = (ms: number): number => ms / 3_600_000;

/** Capacidad mensual por ingeniero (base para % de disponibilidad). Override: MSP_HOURS_PER_MONTH. */
export const HOURS_PER_MONTH = Number(process.env.MSP_HOURS_PER_MONTH ?? "160");
/** Milisegundos de un mes promedio (para prorratear la capacidad por rango). */
export const MS_PER_MONTH = 30.4375 * MS_PER_DAY;
/** Capacidad de horas para el rango [start,end]; null si el rango es abierto (sin fechas). */
export function capacityHoursForRange(start?: number, end?: number): number | null {
  if (start == null || end == null) return null;
  return Math.round(HOURS_PER_MONTH * ((end - start) / MS_PER_MONTH) * 100) / 100;
}

/** Mes UTC 'YYYY-MM' de un epoch ms (determinístico para tests). */
export function monthKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 7);
}
