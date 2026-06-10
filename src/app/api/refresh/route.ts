import { NextResponse } from "next/server";
import { clearDatasetCache, getCachedDataset, getCacheMeta } from "@/lib/clickup";
import { clearRexCache } from "@/lib/rex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Limpia la caché y re-trae el dataset (botón 🔄). */
export async function POST() {
  try {
    clearDatasetCache();
    clearRexCache();
    await getCachedDataset({ force: true });
    return NextResponse.json({ ok: true, cache: getCacheMeta() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
