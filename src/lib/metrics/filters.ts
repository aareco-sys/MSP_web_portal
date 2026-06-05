/** Parseo de filtros desde URLSearchParams (compartido por API y páginas). */
import type { MetricsFilters } from "./types";

const list = (v: string | null): string[] | undefined => {
  if (!v) return undefined;
  const arr = v.split(",").map((s) => s.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
};

/** Acepta `start`/`end` como epoch ms o `YYYY-MM-DD` (año 2000–2100). */
const dateMs = (v: string | null, endOfDay = false): number | undefined => {
  if (!v) return undefined;
  if (/^\d+$/.test(v)) return Number(v);
  // Año razonable: descarta valores corruptos como "0026-01-01".
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec(v);
  if (!match) return undefined;
  const year = Number(match[1]);
  if (year < 2000 || year > 2100) return undefined;
  const t = Date.parse(endOfDay ? `${v}T23:59:59Z` : `${v}T00:00:00Z`);
  return Number.isFinite(t) ? t : undefined;
};

export function parseFilters(params: URLSearchParams): MetricsFilters {
  return {
    start: dateMs(params.get("start")),
    end: dateMs(params.get("end"), true),
    folderIds: list(params.get("folders")),
    listIds: list(params.get("lists")),
    userIds: list(params.get("users"))?.map(Number).filter(Number.isFinite),
  };
}
