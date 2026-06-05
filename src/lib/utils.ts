import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea números con separador de miles (es-AR). */
export function fmtNum(n: number | null | undefined, decimals = 0): string {
  if (n == null) return "—";
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Días → texto legible ("2,3 d" / "—"). */
export function fmtDays(d: number | null | undefined): string {
  if (d == null) return "—";
  return `${fmtNum(d, 1)} d`;
}

export function fmtDate(ms: number | null | undefined): string {
  if (ms == null) return "—";
  return new Date(ms).toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
