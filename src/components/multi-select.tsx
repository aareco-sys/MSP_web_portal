"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

export interface Option {
  value: string;
  label: string;
}

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  className,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const t = useT();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const sel = new Set(selected);
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase()),
  );
  const toggle = (v: string) => {
    const next = new Set(sel);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange([...next]);
  };

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      >
        <span className="truncate">
          {label}
          {selected.length > 0 ? (
            <span className="ml-1 rounded bg-blue-600 px-1.5 py-0.5 text-xs text-white">
              {selected.length}
            </span>
          ) : null}
        </span>
        <ChevronDown className="size-4 shrink-0 opacity-60" />
      </button>
      {open ? (
        <div className="absolute z-20 mt-1 max-h-72 w-full min-w-56 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex items-center gap-2 border-b border-neutral-100 p-2 dark:border-neutral-800">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.filters.search}
              className="w-full bg-transparent px-1 text-sm outline-none"
            />
            {selected.length > 0 ? (
              <button
                type="button"
                onClick={() => onChange([])}
                className="flex items-center gap-1 rounded px-1 text-xs text-neutral-500 hover:text-red-600"
              >
                <X className="size-3" /> {t.filters.clear}
              </button>
            ) : null}
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-2 py-3 text-center text-xs text-neutral-400">
                {t.filters.noResults}
              </div>
            ) : (
              filtered.map((o) => (
                <label
                  key={o.value}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <input
                    type="checkbox"
                    checked={sel.has(o.value)}
                    onChange={() => toggle(o.value)}
                    className="size-4 accent-blue-600"
                  />
                  <span className="truncate">{o.label}</span>
                </label>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
