/**
 * Caché en memoria del dataset (single-instance, como el plan de deploy).
 * El dataset se trae con un rango amplio (últimos N meses) una sola vez; los
 * filtros de fecha se aplican en la capa de métricas, sin re-fetchear.
 */
import { getClickUpConfig } from "./config";
import { loadDataset, type LoadOptions } from "./fetch";
import type { ClickUpDataset } from "./types";

interface CacheSlot {
  data: ClickUpDataset;
  expiresAt: number;
}

let slot: CacheSlot | null = null;
let inflight: Promise<ClickUpDataset> | null = null;

/** Cuántos meses hacia atrás traer para soportar comparación mensual. */
const LOOKBACK_DAYS = Number(process.env.MSP_LOOKBACK_DAYS ?? "400");
const DAY_MS = 86_400_000;

export interface GetDatasetOptions {
  /** ignora la caché y vuelve a consultar la API. */
  force?: boolean;
}

export async function getCachedDataset(
  opts: GetDatasetOptions = {},
): Promise<ClickUpDataset> {
  const now = Date.now();
  if (!opts.force && slot && slot.expiresAt > now) {
    return slot.data;
  }
  // colapsa requests concurrentes en un solo fetch.
  if (!opts.force && inflight) return inflight;

  const cfg = getClickUpConfig();
  const loadOpts: LoadOptions = {
    start: now - LOOKBACK_DAYS * DAY_MS,
    end: now,
    includeStatusHistory: true,
  };

  inflight = loadDataset(cfg, loadOpts)
    .then((data) => {
      slot = { data, expiresAt: Date.now() + cfg.cacheTtlSeconds * 1000 };
      return data;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** Limpia la caché (usado por /api/refresh y el botón 🔄). */
export function clearDatasetCache(): void {
  slot = null;
}

/** Metadata de la caché para mostrar "última actualización". */
export function getCacheMeta(): { fetchedAt: number | null; expiresAt: number | null } {
  return {
    fetchedAt: slot?.data.fetchedAt ?? null,
    expiresAt: slot?.expiresAt ?? null,
  };
}
