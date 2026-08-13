/**
 * Caché en memoria de la matriz de skills (mismo patrón que
 * clickup/cache.ts). Se trae una sola vez por TTL; los requests concurrentes
 * colapsan en un solo fetch a Sheets.
 */
import { getGoogleSheetsConfig } from "@/lib/sheets/config";
import { fetchSheetRows } from "@/lib/sheets/client";
import { parseSkillsSheet } from "./parse";
import type { PersonSkills, SkillsDataset } from "./types";

interface CacheSlot {
  data: SkillsDataset;
  expiresAt: number;
}

let slot: CacheSlot | null = null;
let inflight: Promise<SkillsDataset> | null = null;

export interface GetSkillsOptions {
  /** ignora la caché y vuelve a consultar Sheets. */
  force?: boolean;
}

export async function getCachedSkills(opts: GetSkillsOptions = {}): Promise<SkillsDataset> {
  const now = Date.now();
  if (!opts.force && slot && slot.expiresAt > now) return slot.data;
  if (!opts.force && inflight) return inflight;

  const cfg = getGoogleSheetsConfig();
  inflight = fetchSheetRows(cfg)
    .then((rows) => {
      const people: PersonSkills[] = parseSkillsSheet(rows);
      const data: SkillsDataset = { people, fetchedAt: Date.now() };
      slot = { data, expiresAt: Date.now() + cfg.cacheTtlSeconds * 1000 };
      return data;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** Limpia la caché (usado por /api/refresh). */
export function clearSkillsCache(): void {
  slot = null;
}
