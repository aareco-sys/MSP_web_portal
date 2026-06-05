"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  DEFAULT_LOCALE,
  INTL_LOCALE,
  LOCALE_COOKIE,
  type Locale,
} from "./config";
import { DICTIONARIES, type Messages } from "./dictionaries";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    // persistir 1 año; legible por el server para fijar <html lang>.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t: DICTIONARIES[locale] }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n debe usarse dentro de <I18nProvider>");
  return ctx;
}

/** Diccionario del idioma actual (acceso tipado: t.overview.title). */
export function useT(): Messages {
  return useI18n().t;
}

/** Idioma actual + setter. */
export function useLocale(): { locale: Locale; setLocale: (l: Locale) => void } {
  const { locale, setLocale } = useI18n();
  return { locale, setLocale };
}

/** Formateadores ligados al idioma actual. */
export function useFormatters() {
  const { locale } = useI18n();
  const intl = INTL_LOCALE[locale];
  return useMemo(
    () => ({
      fmtNum: (n: number | null | undefined, decimals = 0): string =>
        n == null
          ? "—"
          : n.toLocaleString(intl, {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            }),
      fmtDays: (d: number | null | undefined): string =>
        d == null
          ? "—"
          : `${d.toLocaleString(intl, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} d`,
      /** Duración legible: < 1 día → "X.X h", si no "X.X d". */
      fmtDur: (d: number | null | undefined): string => {
        if (d == null) return "—";
        const n1 = (x: number) =>
          x.toLocaleString(intl, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        return d < 1 ? `${n1(d * 24)} h` : `${n1(d)} d`;
      },
      fmtDate: (ms: number | null | undefined): string =>
        ms == null
          ? "—"
          : new Date(ms).toLocaleString(intl, {
              dateStyle: "medium",
              timeStyle: "short",
            }),
      /** Etiqueta de mes 'YYYY-MM' → "mar 26" / "Mar 26". */
      monthLabel: (ym: string): string => {
        const [y, m] = ym.split("-");
        const idx = Number(m) - 1;
        const d = new Date(2000, idx, 1);
        const mon = d.toLocaleString(intl, { month: "short" }).replace(".", "");
        return `${mon} ${y.slice(2)}`;
      },
    }),
    [intl],
  );
}
