"use client";

import { usePathname } from "next/navigation";
import { Download, Globe, LogOut } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { FilterBar } from "./filter-bar";

type SectionKey = "overview" | "lists" | "users" | "monthly" | "rex" | "report";

const ROUTE_SECTION: Record<string, SectionKey> = {
  "/": "overview",
  "/listas": "lists",
  "/usuarios": "users",
  "/mensual": "monthly",
  "/rex": "rex",
  "/reporte": "report",
};

export function Topbar() {
  const pathname = usePathname();
  const t = useT();

  const section =
    ROUTE_SECTION[pathname] ?? (pathname.startsWith("/usuarios/") ? "users" : "overview");
  const isReport = section === "report";
  const sectionT = t[section];

  return (
    <header className="topbar">
      <div className="topbar__row">
        <div className="topbar__title">
          <div className="section-eyebrow">{t.nav[section]}</div>
          <h1>{sectionT.title}</h1>
          <p>{sectionT.subtitle}</p>
        </div>
        <div className="topbar__actions" data-noprint>
          <span className="badge badge--slate">
            <Globe style={{ width: 14, height: 14 }} /> {t.common.region}
          </span>
          {/* Descarga el dashboard ACTUAL (imprime/guarda PDF de esta vista,
              respetando filtros). En /reporte se usa su propio botón. */}
          {!isReport ? (
            <button type="button" className="btn btn--primary" onClick={() => window.print()}>
              <Download /> {t.common.exportPdf}
            </button>
          ) : null}
          {/* Cierre de sesión (Cognito). El proxy protege todas las rutas. */}
          <a className="btn btn--ghost" href="/api/auth/logout" title="Cerrar sesión">
            <LogOut style={{ width: 14, height: 14 }} />
          </a>
        </div>
      </div>
      {!isReport ? <FilterBar /> : null}
    </header>
  );
}
