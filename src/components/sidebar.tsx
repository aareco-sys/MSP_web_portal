"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  List as ListIcon,
  Rocket,
  Users,
} from "lucide-react";
import { useLocale, useT, useFormatters } from "@/lib/i18n/context";
import { useMetrics } from "@/hooks/use-data";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

const MAIN = [
  { href: "/", key: "overview", Icon: LayoutDashboard },
  { href: "/listas", key: "lists", Icon: ListIcon },
  { href: "/usuarios", key: "users", Icon: Users },
  { href: "/mensual", key: "monthly", Icon: BarChart3 },
  { href: "/rex", key: "rex", Icon: Rocket },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const params = useSearchParams();
  const qs = params.toString();
  const t = useT();
  const { locale, setLocale } = useLocale();
  const { fmtDate } = useFormatters();
  const { data } = useMetrics();
  const fetchedAt = data?.metrics.meta.fetchedAt ?? null;

  const href = (h: string) => `${h}${qs ? `?${qs}` : ""}`;
  const navLabel = (k: string) => t.nav[k as keyof typeof t.nav];

  const renderItem = (h: string, label: string, Icon: typeof Users) => (
    <li key={h}>
      <Link href={href(h)} className={cn("nav-item", pathname === h && "is-active")}>
        <Icon className="nav-item__icon" />
        {label}
      </Link>
    </li>
  );

  return (
    <aside className="sidebar">
      <Image
        className="sidebar__logo"
        src="/brand/dinocloud-10y-horizontal-white.png"
        alt="DinoCloud"
        width={150}
        height={30}
        priority
      />
      <div className="sidebar__product">{t.common.product}</div>

      <div className="nav-section">{t.nav.sectionMain}</div>
      <ul className="nav-list">
        {MAIN.map((i) => renderItem(i.href, navLabel(i.key), i.Icon))}
      </ul>

      <div className="nav-section">{t.nav.sectionReport}</div>
      <ul className="nav-list">{renderItem("/reporte", t.nav.report, FileText)}</ul>

      <div className="sidebar__spacer" />

      <div className="sidebar__foot">
        <div className="live-card">
          <div className="live-card__row">
            <span className="live-dot" />
            <span className="live-card__label">{t.misc.liveData}</span>
          </div>
          <div className="live-card__sync">
            {t.misc.lastSync}: {fetchedAt ? fmtDate(fetchedAt) : "—"}
          </div>
        </div>
        <div className="lang-toggle">
          {LOCALES.map((l: Locale) => (
            <button
              key={l}
              type="button"
              onClick={() => setLocale(l)}
              className={cn(locale === l && "is-active")}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
