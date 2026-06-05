import { NextResponse } from "next/server";
import { getCachedDataset } from "@/lib/clickup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Opciones para poblar los selectores de filtros (carpetas, listas, usuarios). */
export async function GET() {
  try {
    const ds = await getCachedDataset();

    const folders = new Map<string, string>();
    for (const l of ds.lists) folders.set(l.folderId, l.folderName);

    const users = new Map<number, { id: number; name: string }>();
    for (const t of ds.tasks)
      for (const a of t.assignees)
        if (!users.has(a.id)) users.set(a.id, { id: a.id, name: a.username });
    for (const e of ds.timeEntries)
      if (e.userId && !users.has(e.userId))
        users.set(e.userId, { id: e.userId, name: e.username });

    return NextResponse.json({
      folders: [...folders.entries()].map(([id, name]) => ({ id, name })),
      lists: ds.lists.map((l) => ({
        id: l.id,
        name: l.name,
        folderId: l.folderId,
      })),
      users: [...users.values()].sort((a, b) => a.name.localeCompare(b.name)),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
