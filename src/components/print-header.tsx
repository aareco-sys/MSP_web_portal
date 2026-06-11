"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useT, useFormatters } from "@/lib/i18n/context";

const ROUTE_SECTION: Record<string, "overview" | "lists" | "users" | "monthly"> = {
  "/": "overview",
  "/listas": "lists",
  "/usuarios": "users",
  "/mensual": "monthly",
};

/**
 * Encabezado de reporte que aparece SOLO al imprimir/descargar (clase
 * .print-only). Da contexto al PDF del dashboard actual: logo, nombre de la
 * vista, rango de fechas activo y marca confidencial. /reporte y /rex tienen su
 * propio encabezado, así que acá se omiten.
 */
export function PrintHeader() {
  const pathname = usePathname();
  const params = useSearchParams();
  const t = useT();
  const { fmtDate } = useFormatters();
  const [generatedAt] = useState(() => Date.now());

  if (pathname.startsWith("/reporte") || pathname.startsWith("/rex")) return null;

  const section =
    ROUTE_SECTION[pathname] ?? (pathname.startsWith("/usuarios/") ? "users" : "overview");
  const name = t.nav[section];

  const start = params.get("start");
  const end = params.get("end");
  const range =
    start || end
      ? t.report.range(start ?? t.report.rangeStart, end ?? t.report.rangeEnd)
      : t.report.rangeFull;

  return (
    <div className="print-only report-head" style={{ marginBottom: 16 }}>
      <div>
        <Image
          className="report-head__logo"
          src="/brand/dinocloud-10y-horizontal-color.png"
          alt="DinoCloud"
          width={200}
          height={40}
        />
        <h1 style={{ marginTop: 8, fontSize: 20, fontWeight: 700 }}>
          MSP Metrics — {name}
        </h1>
      </div>
      <div className="report-meta">
        <div className="confidential-badge">{t.common.confidential}</div>
        <div style={{ marginTop: 4 }}>{t.common.generated(fmtDate(generatedAt))}</div>
        <div>{range}</div>
      </div>
    </div>
  );
}
