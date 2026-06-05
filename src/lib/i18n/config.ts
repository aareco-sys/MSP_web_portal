/** Configuración de i18n (ES/EN) para el portal. */

export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

/** Nombre de la cookie donde se persiste la preferencia de idioma. */
export const LOCALE_COOKIE = "locale";

/** Locale de Intl usado para formatear números/fechas según el idioma. */
export const INTL_LOCALE: Record<Locale, string> = {
  es: "es-AR",
  en: "en-US",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "es" || value === "en";
}

export function resolveLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
