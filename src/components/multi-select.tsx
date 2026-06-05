"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
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
}: {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
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
  const toggle = (v: string) =>
    onChange(sel.has(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  const summary = selected.length === 0 ? label : t.filters.selected(String(selected.length));

  return (
    <div className="dropdown" ref={ref}>
      <button
        type="button"
        className={`dropdown__trigger ${open ? "is-open" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span style={{ color: selected.length ? "var(--color-fg)" : "var(--color-fg-subtle)" }}>
          {summary}
        </span>
        <ChevronDown />
      </button>
      {open ? (
        <div className="dropdown__panel">
          <input
            className="dropdown__search"
            placeholder={t.filters.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {filtered.map((o) => {
            const isSel = sel.has(o.value);
            return (
              <div
                key={o.value}
                className={`opt ${isSel ? "is-sel" : ""}`}
                onClick={() => toggle(o.value)}
              >
                <span className="opt__check">{isSel ? <Check /> : null}</span>
                <span className="truncate">{o.label}</span>
              </div>
            );
          })}
          {filtered.length === 0 ? (
            <div className="opt" style={{ color: "var(--color-fg-subtle)" }}>
              {t.filters.noResults}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
