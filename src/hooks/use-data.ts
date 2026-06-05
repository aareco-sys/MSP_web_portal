"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import type { MetricsResult } from "@/lib/metrics";

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
