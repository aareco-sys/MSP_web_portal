import { NextResponse } from "next/server";
import { getCachedRexTasks, computeRexMetrics, REX_BOARD_URL } from "@/lib/rex";
import { parseFilters } from "@/lib/metrics/filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const { start, end, userIds } = parseFilters(url.searchParams);
    const all = await getCachedRexTasks();

    // Asignados disponibles (de TODA la lista, para que el selector no se vacíe
    // al filtrar). Se excluyen tareas sin asignar.
    const assigneeMap = new Map<number, string>();
    for (const t of all)
      for (const a of t.assignees) if (a.id) assigneeMap.set(a.id, a.username);
    const assignees = [...assigneeMap.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const tasks = userIds?.length
      ? all.filter((t) => t.assignees.some((a) => userIds.includes(a.id)))
      : all;

    const metrics = computeRexMetrics(tasks, { start, end });
    return NextResponse.json({ metrics, board: REX_BOARD_URL, assignees });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
