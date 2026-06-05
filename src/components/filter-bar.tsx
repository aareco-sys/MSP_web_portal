"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { MultiSelect } from "./multi-select";
import { DateRangePicker } from "./date-range-picker";
import { useOptions, useRefresh } from "@/hooks/use-data";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

function useSetParam() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (key: string, value: string | string[] | undefined) => {
    const next = new URLSearchParams(params.toString());
    const v = Array.isArray(value) ? value.join(",") : value;
    if (!v) next.delete(key);
    else next.set(key, v);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };
}

export function FilterBar() {
  const params = useSearchParams();
  const setParam = useSetParam();
  const { data: options } = useOptions();
  const refresh = useRefresh();
  const t = useT();

  const getList = (k: string) =>
    (params.get(k)?.split(",").filter(Boolean) ?? []) as string[];

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
      <DateRangePicker />

      <div className="min-w-44 flex-1">
        <label className="mb-1 block text-xs text-neutral-500">{t.filters.folders}</label>
        <MultiSelect
          label={t.filters.allF}
          options={(options?.folders ?? []).map((f) => ({ value: f.id, label: f.name }))}
          selected={getList("folders")}
          onChange={(v) => setParam("folders", v)}
        />
      </div>
      <div className="min-w-44 flex-1">
        <label className="mb-1 block text-xs text-neutral-500">{t.filters.lists}</label>
        <MultiSelect
          label={t.filters.allF}
          options={(options?.lists ?? []).map((l) => ({ value: l.id, label: l.name }))}
          selected={getList("lists")}
          onChange={(v) => setParam("lists", v)}
        />
      </div>
      <div className="min-w-44 flex-1">
        <label className="mb-1 block text-xs text-neutral-500">{t.filters.users}</label>
        <MultiSelect
          label={t.filters.allM}
          options={(options?.users ?? []).map((u) => ({
            value: String(u.id),
            label: u.name,
          }))}
          selected={getList("users")}
          onChange={(v) => setParam("users", v)}
        />
      </div>

      <button
        type="button"
        onClick={() => refresh.mutate()}
        disabled={refresh.isPending}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800",
        )}
        title={t.filters.refreshTitle}
      >
        <RefreshCw className={cn("size-4", refresh.isPending && "animate-spin")} />
        {refresh.isPending ? t.filters.refreshing : t.filters.refresh}
      </button>
    </div>
  );
}
