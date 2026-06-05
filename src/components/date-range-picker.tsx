"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DayPicker, type DateRange } from "react-day-picker";
import { es, enUS } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { CalendarDays, ChevronDown, ChevronLeft, X } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/** YYYY-MM-DD en hora local (sin saltos de zona horaria de toISOString). */
function ymd(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
/** YYYY-MM-DD → Date en hora local. */
function parseYmd(s: string): Date | undefined {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return undefined;
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

  const start = params.get("start") ?? "";
  const end = params.get("end") ?? "";

  const setRange = (s: string | undefined, e: string | undefined) => {
    const next = new URLSearchParams(params.toString());
    if (s) next.set("start", s);
    else next.delete("start");
    if (e) next.set("end", e);
    else next.delete("end");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const today = () => new Date();
  const presets: Preset[] = [
    { key: "today", label: t.dates.today, range: () => ({ start: ymd(today()), end: ymd(today()) }) },
    { key: "last7", label: t.dates.last7, range: () => ({ start: ymd(daysAgo(6)), end: ymd(today()) }) },
    { key: "last30", label: t.dates.last30, range: () => ({ start: ymd(daysAgo(29)), end: ymd(today()) }) },
    { key: "last90", label: t.dates.last90, range: () => ({ start: ymd(daysAgo(89)), end: ymd(today()) }) },
    {
      key: "thisMonth",
      label: t.dates.thisMonth,
      range: () => {
        const d = today();
        return { start: ymd(new Date(d.getFullYear(), d.getMonth(), 1)), end: ymd(d) };
      },
    },
    {
      key: "lastMonth",
      label: t.dates.lastMonth,
      range: () => {
        const d = today();
        return {
          start: ymd(new Date(d.getFullYear(), d.getMonth() - 1, 1)),
          end: ymd(new Date(d.getFullYear(), d.getMonth(), 0)),
        };
      },
    },
    {
      key: "thisYear",
      label: t.dates.thisYear,
      range: () => {
        const d = today();
        return { start: ymd(new Date(d.getFullYear(), 0, 1)), end: ymd(d) };
      },
    },
  ];

  const activePreset = presets.find((p) => {
    const r = p.range();
    return r.start === start && r.end === end;
  });
  const buttonLabel =
    !start && !end
      ? t.dates.allTime
      : activePreset
        ? activePreset.label
        : `${start || "…"} → ${end || t.dates.to}`;

  const selected: DateRange | undefined = start
    ? { from: parseYmd(start), to: end ? parseYmd(end) : undefined }
    : undefined;

  const onSelectRange = (range: DateRange | undefined) => {
    if (!range?.from) {
      setRange(undefined, undefined);
      return;
    }
    setRange(ymd(range.from), range.to ? ymd(range.to) : undefined);
  };

  const openPanel = () => {
    // si ya hay un rango que no es preset, abrir directo en el calendario.
    setMode(start && !activePreset ? "custom" : "presets");
    setOpen((o) => !o);
  };

  return (
    <div className="relative" ref={ref}>
      <label className="mb-1 block text-xs text-neutral-500">{t.dates.range}</label>
      <button
        type="button"
        onClick={openPanel}
        className="flex min-w-56 items-center justify-between gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      >
        <span className="flex items-center gap-2">
          <CalendarDays className="size-4 opacity-60" />
          {buttonLabel}
        </span>
        <span className="flex items-center gap-1">
          {start || end ? (
            <X
              className="size-3.5 opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                setRange(undefined, undefined);
              }}
            />
          ) : null}
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        </span>
      </button>

      {open ? (
        <div className="absolute z-30 mt-1 w-72 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {mode === "presets" ? (
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => {
                  setRange(undefined, undefined);
                  setOpen(false);
                }}
                className={cn(
                  "rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800",
                  !start && !end && "bg-blue-50 font-medium text-blue-700 dark:bg-blue-950/40",
                )}
              >
                {t.dates.allTime}
              </button>
              {presets.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    const r = p.range();
                    setRange(r.start, r.end);
                    setOpen(false);
                  }}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800",
                    activePreset?.key === p.key &&
                      "bg-blue-50 font-medium text-blue-700 dark:bg-blue-950/40",
                  )}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setMode("custom")}
                className="col-span-2 mt-1 rounded-md border border-dashed border-neutral-300 px-2 py-1.5 text-center text-sm text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
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
                  className="flex items-center gap-1 rounded px-1 text-xs text-neutral-500 hover:text-blue-600"
                >
                  <ChevronLeft className="size-3.5" /> {t.dates.range}
                </button>
                <span className="text-xs text-neutral-500">
                  {start || "…"} → {end || t.dates.to}
                </span>
              </div>
              <div
                className="rdp-wrapper flex justify-center text-neutral-800 dark:text-neutral-100"
                style={
                  {
                    "--rdp-accent-color": "#2563eb",
                    "--rdp-accent-background-color": "#dbeafe",
                    "--rdp-day-width": "36px",
                    "--rdp-day-height": "36px",
                    "--rdp-font-size": "0.8rem",
                  } as React.CSSProperties
                }
              >
                <DayPicker
                  mode="range"
                  numberOfMonths={1}
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
