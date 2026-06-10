import { NextResponse } from "next/server";
import { getCachedDataset } from "@/lib/clickup";
import { computeUserScorecard } from "@/lib/metrics";
import { parseFilters } from "@/lib/metrics/filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = Number(id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }
    const filters = parseFilters(new URL(req.url).searchParams);
    const dataset = await getCachedDataset();
    const scorecard = computeUserScorecard(dataset, userId, filters);
    return NextResponse.json({ scorecard });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
