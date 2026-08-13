import { NextResponse } from "next/server";
import { findUsername, getCachedDataset } from "@/lib/clickup";
import { buildFicha, findPersonByName, getCachedSkills } from "@/lib/skills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = Number(id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const dataset = await getCachedDataset();
    const username = findUsername(dataset, userId);
    if (!username) {
      return NextResponse.json({ ficha: null });
    }

    const skills = await getCachedSkills();
    const person = findPersonByName(skills.people, username);
    if (!person) {
      return NextResponse.json({ ficha: null });
    }

    return NextResponse.json({ ficha: buildFicha(person) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
