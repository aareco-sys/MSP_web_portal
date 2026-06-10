"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { MultiSelect } from "./multi-select";
import { DateRangePicker } from "./date-range-picker";
import { useOptions, useRefresh, useRex } from "@/hooks/use-data";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/** Filtro de asignado para /rex (opciones tomadas de la propia lista Rex).
 *  Vive en su propio componente para que useRex solo se monte en esa ruta. */
function RexAssigneeFilter({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const t = useT();
  const { data } = useRex();
  const options = (data?.assignees ?? []).map((a) => ({
    value: String(a.id),
    label: a.name,
  }));
  return (
    <div className="filter">
      <span className="filter__label">{t.rex.responsible}</span>
      <MultiSelect label={t.filters.allM} options={options} selected={selected} onChange={onChange} />
    </div>
  );
}

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { data: options } = useOptions();
  const refresh = useRefresh();
  const t = useT();

  const getList = (k: string) =>
    (params.get(k)?.split(",").filter(Boolean) ?? []) as string[];

  /** Actualiza varios params en una sola navegación. */
  const setParams = (updates: Record<string, string[] | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      const v = value?.join(",");
      if (!v) next.delete(key);
      else next.set(key, v);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const selectedFolders = getList("folders");
  // Cascada: las listas se acotan a las carpetas elegidas.
  const listOptions = (options?.lists ?? [])
    .filter((l) => selectedFolders.length === 0 || selectedFolders.includes(l.folderId))
    .map((l) => ({ value: l.id, label: l.name }));

  // Rex es una lista fija: solo aplica el rango de fechas.
  const isRex = pathname === "/rex";

  return (
    <div className="filterbar" data-noprint>
      <div className="filter">
        <span className="filter__label">{t.dates.range}</span>
        <DateRangePicker />
      </div>
      {!isRex ? (
        <>
          <div className="filter">
            <span className="filter__label">{t.filters.folders}</span>
            <MultiSelect
              label={t.filters.allF}
              options={(options?.folders ?? []).map((f) => ({ value: f.id, label: f.name }))}
              selected={selectedFolders}
              onChange={(v) => setParams({ folders: v, lists: undefined })}
            />
          </div>
          <div className="filter">
            <span className="filter__label">{t.filters.lists}</span>
            <MultiSelect
              label={t.filters.allF}
              options={listOptions}
              selected={getList("lists")}
              onChange={(v) => setParams({ lists: v })}
            />
          </div>
          <div className="filter">
            <span className="filter__label">{t.filters.users}</span>
            <MultiSelect
              label={t.filters.allM}
              options={(options?.users ?? []).map((u) => ({ value: String(u.id), label: u.name }))}
              selected={getList("users")}
              onChange={(v) => setParams({ users: v })}
            />
          </div>
        </>
      ) : (
        <RexAssigneeFilter
          selected={getList("users")}
          onChange={(v) => setParams({ users: v })}
        />
      )}

      <div style={{ flex: 1 }} />

      <button
        type="button"
        className="btn btn--ghost"
        onClick={() => refresh.mutate()}
        disabled={refresh.isPending}
        title={t.filters.refreshTitle}
      >
        <RefreshCw className={cn(refresh.isPending && "spin")} />
        {refresh.isPending ? t.filters.refreshing : t.filters.refresh}
      </button>
    </div>
  );
}
