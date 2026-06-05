"use client";

import { useSearchParams } from "next/navigation";
import { FileDown } from "lucide-react";
import { useT } from "@/lib/i18n/context";

/** Abre el endpoint de PDF con los filtros actuales en una pestaña nueva. */
export function ExportButton() {
  const params = useSearchParams();
  const qs = params.toString();
  const t = useT();
  return (
    <a
      href={`/reporte${qs ? `?${qs}` : ""}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
    >
      <FileDown className="size-4" />
      {t.common.exportPdf}
    </a>
  );
}
