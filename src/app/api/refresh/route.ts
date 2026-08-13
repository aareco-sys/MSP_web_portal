import { NextResponse } from "next/server";
import { clearDatasetCache, getCachedDataset, getCacheMeta } from "@/lib/clickup";
import { clearRexCache } from "@/lib/rex";
import { clearSkillsCache } from "@/lib/skills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Limpia la caché y re-trae el dataset (botón 🔄). */
export async function POST() {
  try {
    clearDatasetCache();
    clearRexCache();
    // Solo invalida; no fuerza el re-fetch acá (Sheets puede no estar
    // configurado y no debe romper el refresh principal de ClickUp).
    clearSkillsCache();
    await getCachedDataset({ force: true });
    return NextResponse.json({ ok: true, cache: getCacheMeta() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
