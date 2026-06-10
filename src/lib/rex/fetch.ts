/**
 * Fetch de la lista Rex Adoption de ClickUp + caché en memoria con TTL.
 * Aislado de la capa de datos principal (que cubre clientes activos).
 */
import { clickupGet } from "@/lib/clickup/client";
import { getClickUpConfig } from "@/lib/clickup/config";
import type { RexTask } from "./metrics";

const REX_LIST_ID = process.env.CLICKUP_REX_LIST_ID ?? "901713770010";
export const REX_BOARD_URL = `https://app.clickup.com/3016250/v/b/li/${REX_LIST_ID}`;

const toMs = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

interface RawTask {
  id: string;
  name: string;
  status?: { status?: string };
  priority?: { priority?: string } | null;
  assignees?: { id: number; username: string; email: string }[];
  date_created?: string;
  date_closed?: string;
  due_date?: string;
  parent?: string | null;
  url?: string;
}

export async function fetchRexTasks(): Promise<RexTask[]> {
  const cfg = getClickUpConfig();
  const out: RexTask[] = [];
  let page = 0;
  while (true) {
    const res = await clickupGet<{ tasks: RawTask[]; last_page?: boolean }>(
      cfg,
      `/list/${REX_LIST_ID}/task`,
      { params: { include_closed: true, subtasks: true, page } },
    );
    const tasks = res.tasks ?? [];
    for (const t of tasks) {
      out.push({
        id: t.id,
        name: t.name,
        status: (t.status?.status ?? "unknown").toLowerCase(),
        priority: t.priority?.priority ?? null,
        assignees: (t.assignees ?? []).map((a) => ({
          id: a.id,
          username: a.username ?? a.email ?? String(a.id),
          email: a.email ?? "",
        })),
        dateCreated: toMs(t.date_created),
        dateClosed: toMs(t.date_closed),
        dueDate: toMs(t.due_date),
        parent: t.parent ?? null,
        url: t.url ?? `https://app.clickup.com/t/${t.id}`,
      });
    }
    if (tasks.length === 0 || res.last_page) break;
    page += 1;
  }
  return out;
}

// ── Caché ──
interface Slot {
  data: RexTask[];
  expiresAt: number;
}
let slot: Slot | null = null;
let inflight: Promise<RexTask[]> | null = null;

export async function getCachedRexTasks(force = false): Promise<RexTask[]> {
  const now = Date.now();
  if (!force && slot && slot.expiresAt > now) return slot.data;
  if (!force && inflight) return inflight;
  const ttl = Number(process.env.MSP_CACHE_TTL ?? "1800") * 1000;
  inflight = fetchRexTasks()
    .then((data) => {
      slot = { data, expiresAt: Date.now() + ttl };
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function clearRexCache(): void {
  slot = null;
}
