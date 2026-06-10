"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import type { MetricsResult, UserScorecard } from "@/lib/metrics";
import type { RexMetrics } from "@/lib/rex";

export interface FilterOptions {
  folders: { id: string; name: string }[];
  lists: { id: string; name: string; folderId: string }[];
  users: { id: number; name: string }[];
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
  return body as T;
}

/** Métricas según los filtros presentes en la URL. */
export function useMetrics() {
  const params = useSearchParams();
  const qs = params.toString();
  return useQuery({
    queryKey: ["metrics", qs],
    queryFn: () =>
      getJson<{ metrics: MetricsResult; cache: { fetchedAt: number | null } }>(
        `/api/metrics${qs ? `?${qs}` : ""}`,
      ),
  });
}

/** Métricas de Rex Adoption (lista fija); usa rango de fechas + asignados. */
export function useRex() {
  const params = useSearchParams();
  const qs = new URLSearchParams();
  for (const k of ["start", "end", "users"]) {
    const v = params.get(k);
    if (v) qs.set(k, v);
  }
  const q = qs.toString();
  return useQuery({
    queryKey: ["rex", q],
    queryFn: () =>
      getJson<{
        metrics: RexMetrics;
        board: string;
        assignees: { id: number; name: string }[];
      }>(`/api/rex${q ? `?${q}` : ""}`),
  });
}

/** Scorecard de un ingeniero; respeta rango + carpetas/listas de la URL. */
export function useUserScorecard(userId: string) {
  const params = useSearchParams();
  const qs = new URLSearchParams();
  for (const k of ["start", "end", "folders", "lists"]) {
    const v = params.get(k);
    if (v) qs.set(k, v);
  }
  const q = qs.toString();
  return useQuery({
    queryKey: ["scorecard", userId, q],
    queryFn: () => getJson<{ scorecard: UserScorecard }>(`/api/users/${userId}${q ? `?${q}` : ""}`),
  });
}

export function useOptions() {
  return useQuery({
    queryKey: ["options"],
    queryFn: () => getJson<FilterOptions>("/api/options"),
    staleTime: 5 * 60_000,
  });
}

/** Botón 🔄: limpia la caché del server y refetchea todo. */
export function useRefresh() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetch("/api/refresh", { method: "POST" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries(),
  });
}
