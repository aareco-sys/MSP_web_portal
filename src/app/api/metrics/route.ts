import { NextResponse } from "next/server";
import { getCachedDataset, getCacheMeta } from "@/lib/clickup";
import { computeMetrics } from "@/lib/metrics";
import { parseFilters } from "@/lib/metrics/filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const filters = parseFilters(url.searchParams);
    const dataset = await getCachedDataset();
    const metrics = computeMetrics(dataset, filters);
    return NextResponse.json({ metrics, cache: getCacheMeta() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
