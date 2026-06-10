"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Download, Globe } from "lucide-react";
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
  const params = useSearchParams();
  const qs = params.toString();
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
          {!isReport ? (
            <Link className="btn btn--primary" href={`/reporte${qs ? `?${qs}` : ""}`}>
              <Download /> {t.common.exportPdf}
            </Link>
          ) : null}
        </div>
      </div>
      {!isReport ? <FilterBar /> : null}
    </header>
  );
}
