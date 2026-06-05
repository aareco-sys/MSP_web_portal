"use client";

import { Languages } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <div
      data-noprint
      className="flex items-center gap-1 rounded-lg border border-neutral-300 p-0.5 dark:border-neutral-700"
      title="Idioma / Language"
    >
      <Languages className="ml-1 size-3.5 text-neutral-400" />
      {LOCALES.map((l: Locale) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={cn(
            "rounded px-2 py-1 text-xs font-medium uppercase transition-colors",
            locale === l
              ? "bg-blue-600 text-white"
              : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
