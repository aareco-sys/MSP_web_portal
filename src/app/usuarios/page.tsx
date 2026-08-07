"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useMetrics } from "@/hooks/use-data";
import { Loading, ErrorState, Empty } from "@/components/states";
import { BarCard } from "@/components/charts";
import { Avatar, CHART } from "@/components/ui";
import { useT, useFormatters } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import type { UserMetrics } from "@/lib/metrics";

export default function UsuariosPage() {
  const { data, isLoading, error } = useMetrics();
  const searchParams = useSearchParams();
  const t = useT();
  const { fmtNum } = useFormatters();
  if (isLoading) return <Loading />;
  if (error) return <ErrorState message={(error as Error).message} />;
  const m = data!.metrics;
  if (m.byUser.length === 0) return <Empty />;

  const qs = searchParams.toString();
  const nameOf = (u: UserMetrics) => (u.userId === 0 ? t.terms.unassigned : u.username);
  const top = m.byUser.slice(0, 15);
  const engineers = m.byUser.filter((u) => u.userId !== 0).length;

  // Capacidad del rango (160 h/mes prorrateadas); null si no hay rango de fechas.
  const cap = m.meta.capacityHours;
  const assignedPct = (u: UserMetrics) => (cap ? (u.hours / cap) * 100 : null);
  const pctCell = (v: number | null) => (v == null ? "—" : `${fmtNum(v, 0)}%`);

  const renderCard = (u: UserMetrics) => {
    const pct = assignedPct(u);
    const width = pct == null ? 0 : Math.min(100, pct);
    const over = pct != null && pct > 100;
    const clickable = u.userId !== 0;

    const inner = (
      <>
        <div className="eng-card__head">
          <Avatar name={nameOf(u)} />
          <div className="eng-card__id">
            <span className="eng-card__name">{nameOf(u)}</span>
            <span className="eng-card__meta">{u.email || "—"}</span>
          </div>
          {clickable ? <ChevronRight className="eng-card__chev" /> : null}
        </div>

        <div className="eng-card__stats">
          <div className="eng-stat">
            <span className="eng-stat__v">{fmtNum(u.resolved)}</span>
            <span className="eng-stat__l">{t.terms.resolved}</span>
          </div>
          <div className="eng-stat">
            <span className="eng-stat__v">{fmtNum(u.open)}</span>
            <span className="eng-stat__l">{t.terms.open}</span>
          </div>
          <div className="eng-stat">
            <span className="eng-stat__v">
              {fmtNum(u.hours, 1)}
              <span className="unit">h</span>
            </span>
            <span className="eng-stat__l">{t.terms.hours}</span>
          </div>
        </div>

        <div className="eng-card__caption">
          {t.users.tasksMeta(fmtNum(u.total), fmtNum(u.projects), fmtNum(u.subtasks))}
        </div>

        <div className="eng-card__cap">
          <div className="eng-cap__row">
            <span>{t.users.assignedPct}</span>
            <b>{pctCell(pct)}</b>
          </div>
          <div className="eng-cap__track">
            <span
              className={cn("eng-cap__fill", over && "eng-cap__fill--over")}
              style={{ width: `${width}%` }}
            />
          </div>
        </div>
      </>
    );

    if (!clickable) {
      return (
        <div key="unassigned" className="eng-card eng-card--static">
          {inner}
        </div>
      );
    }
    return (
      <Link key={u.userId} href={`/usuarios/${u.userId}${qs ? `?${qs}` : ""}`} className="eng-card">
        {inner}
      </Link>
    );
  };

  return (
    <>
      <div className="chart-row-eq">
        <BarCard
          title={t.users.hoursByUser}
          sub={t.users.avgHint}
          data={top.map((u) => ({ user: nameOf(u), hours: u.hours }))}
          xKey="user"
          horizontal
          bars={[{ key: "hours", name: t.terms.hours, color: CHART.hours }]}
          height={360}
        />
        <BarCard
          title={t.users.loadByUser}
          data={top.map((u) => ({ user: nameOf(u), resolved: u.resolved, open: u.open }))}
          xKey="user"
          horizontal
          stacked
          bars={[
            { key: "resolved", name: t.terms.resolved, color: CHART.resolved },
            { key: "open", name: t.terms.open, color: CHART.open },
          ]}
          height={360}
        />
      </div>

      <p style={{ fontSize: 13, color: "var(--color-fg-subtle)", margin: "4px 2px 0" }}>
        {t.users.capacityHint(cap != null ? fmtNum(cap, 0) : "—")}
      </p>

      <section>
        <div className="eng-head">
          <div>
            <div className="card__title">{t.users.cardsTitle}</div>
            <div className="card__sub">{t.users.cardsSub(fmtNum(engineers))}</div>
          </div>
        </div>
        <div className="eng-grid">{m.byUser.map(renderCard)}</div>
      </section>
    </>
  );
}
