"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DayPicker, type DateRange } from "react-day-picker";
import { es, enUS } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { CalendarDays, ChevronDown, ChevronLeft, X } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

function ymd(d: Date): string {
  const y = `${d.getFullYear()}`.padStart(4, "0");
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}
/** YYYY-MM-DD con un año razonable (evita el bug del año de 2 dígitos → 1926). */
function isValidYmd(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const y = Number(s.slice(0, 4));
  return y >= 2000 && y <= 2100;
}
function parseYmd(s: string): Date | undefined {
  if (!isValidYmd(s)) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

interface Preset {
  key: string;
  label: string;
  range: () => { start: string; end: string };
}

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const t = useT();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"presets" | "custom">("presets");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const rawStart = params.get("start") ?? "";
  const rawEnd = params.get("end") ?? "";
  // Solo se aceptan fechas con año razonable; valores corruptos se descartan.
  const start = isValidYmd(rawStart) ? rawStart : "";
  const end = isValidYmd(rawEnd) ? rawEnd : "";

  const setRange = (s: string | undefined, e: string | undefined) => {
    const next = new URLSearchParams(params.toString());
    if (s) next.set("start", s);
    else next.delete("start");
    if (e) next.set("end", e);
    else next.delete("end");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  // Limpia de la URL cualquier fecha inválida heredada (p.ej. "0026-01-01").
  useEffect(() => {
    if ((rawStart && !start) || (rawEnd && !end)) {
      setRange(start || undefined, end || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawStart, rawEnd]);

  const today = () => new Date();
  const presets: Preset[] = [
    { key: "today", label: t.dates.today, range: () => ({ start: ymd(today()), end: ymd(today()) }) },
    { key: "last7", label: t.dates.last7, range: () => ({ start: ymd(daysAgo(6)), end: ymd(today()) }) },
    { key: "last30", label: t.dates.last30, range: () => ({ start: ymd(daysAgo(29)), end: ymd(today()) }) },
    { key: "last90", label: t.dates.last90, range: () => ({ start: ymd(daysAgo(89)), end: ymd(today()) }) },
    { key: "thisMonth", label: t.dates.thisMonth, range: () => { const d = today(); return { start: ymd(new Date(d.getFullYear(), d.getMonth(), 1)), end: ymd(d) }; } },
    { key: "lastMonth", label: t.dates.lastMonth, range: () => { const d = today(); return { start: ymd(new Date(d.getFullYear(), d.getMonth() - 1, 1)), end: ymd(new Date(d.getFullYear(), d.getMonth(), 0)) }; } },
    { key: "thisYear", label: t.dates.thisYear, range: () => { const d = today(); return { start: ymd(new Date(d.getFullYear(), 0, 1)), end: ymd(d) }; } },
  ];

  const activePreset = presets.find((p) => {
    const r = p.range();
    return r.start === start && r.end === end;
  });
  const label =
    !start && !end
      ? t.dates.allTime
      : activePreset
        ? activePreset.label
        : `${start || "…"} → ${end || t.dates.to}`;

  const selected: DateRange | undefined = start
    ? { from: parseYmd(start), to: end ? parseYmd(end) : undefined }
    : undefined;

  const onSelectRange = (range: DateRange | undefined) => {
    if (!range?.from) return setRange(undefined, undefined);
    setRange(ymd(range.from), range.to ? ymd(range.to) : undefined);
  };

  const openPanel = () => {
    setMode(start && !activePreset ? "custom" : "presets");
    setOpen((o) => !o);
  };

  const presetBtn =
    "rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-[var(--dc-green-25)] transition-colors";

  return (
    <div className="dropdown" ref={ref}>
      <button
        type="button"
        className={cn("dropdown__trigger", open && "is-open")}
        onClick={openPanel}
        style={{ minWidth: 190 }}
      >
        <span className="flex items-center gap-2">
          <CalendarDays style={{ width: 15, height: 15, color: "var(--color-fg-subtle)" }} />
          {label}
        </span>
        <span className="flex items-center gap-1">
          {start || end ? (
            <X
              style={{ width: 14, height: 14 }}
              onClick={(e) => {
                e.stopPropagation();
                setRange(undefined, undefined);
              }}
            />
          ) : null}
          <ChevronDown />
        </span>
      </button>

      {open ? (
        <div className="dropdown__panel" style={{ width: mode === "custom" ? 300 : 250, maxHeight: "none" }}>
          {mode === "presets" ? (
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => { setRange(undefined, undefined); setOpen(false); }}
                className={cn(presetBtn, !start && !end && "bg-[var(--dc-green-50)] font-semibold text-[var(--dc-green-800)]")}
              >
                {t.dates.allTime}
              </button>
              {presets.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => { const r = p.range(); setRange(r.start, r.end); setOpen(false); }}
                  className={cn(presetBtn, activePreset?.key === p.key && "bg-[var(--dc-green-50)] font-semibold text-[var(--dc-green-800)]")}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setMode("custom")}
                className="col-span-2 mt-1 rounded-md border border-dashed border-[var(--color-border-strong)] px-2 py-1.5 text-center text-[13px] text-[var(--color-fg-muted)] hover:bg-[var(--dc-green-25)]"
              >
                {t.dates.custom} →
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMode("presets")}
                  className="flex items-center gap-1 rounded px-1 text-xs text-[var(--color-fg-subtle)] hover:text-[var(--color-brand)]"
                >
                  <ChevronLeft style={{ width: 14, height: 14 }} /> {t.dates.range}
                </button>
                <span className="text-xs text-[var(--color-fg-subtle)]">
                  {start || "…"} → {end || t.dates.to}
                </span>
              </div>
              <div
                className="flex justify-center"
                style={
                  {
                    "--rdp-accent-color": "var(--dc-green-500)",
                    "--rdp-accent-background-color": "var(--dc-green-50)",
                    "--rdp-day-width": "36px",
                    "--rdp-day-height": "36px",
                    "--rdp-font-size": "0.8rem",
                    color: "var(--color-fg)",
                  } as React.CSSProperties
                }
              >
                <DayPicker
                  mode="range"
                  numberOfMonths={1}
                  captionLayout="dropdown"
                  startMonth={new Date(2018, 0)}
                  endMonth={new Date(new Date().getFullYear() + 1, 11)}
                  selected={selected}
                  onSelect={onSelectRange}
                  defaultMonth={selected?.from ?? new Date()}
                  locale={locale === "es" ? es : enUS}
                />
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
