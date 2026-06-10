"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMetrics } from "@/hooks/use-data";
import { Loading, ErrorState, Empty } from "@/components/states";
import { DataTable, type Column } from "@/components/data-table";
import { BarCard } from "@/components/charts";
import { Avatar, CHART } from "@/components/ui";
import { useT, useFormatters } from "@/lib/i18n/context";
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
  const maxHours = Math.max(1, ...m.byUser.map((u) => u.hours));
  const top = m.byUser.slice(0, 15);

  const columns: Column<UserMetrics>[] = [
    {
      key: "user",
      header: t.terms.user,
      render: (u) =>
        u.userId === 0 ? (
          <span className="muted" style={{ color: "var(--color-fg-subtle)" }}>{t.terms.unassigned}</span>
        ) : (
          <Link
            href={`/usuarios/${u.userId}${qs ? `?${qs}` : ""}`}
            className="cell-user"
            style={{ color: "var(--color-fg)" }}
          >
            <Avatar name={u.username} />
            <span className="font-semibold dc-link">{u.username}</span>
          </Link>
        ),
    },
    { key: "total", header: t.terms.tasks, align: "right", render: (u) => fmtNum(u.total) },
    { key: "open", header: t.terms.open, align: "right", render: (u) => fmtNum(u.open) },
    { key: "resolved", header: t.terms.resolved, align: "right", render: (u) => fmtNum(u.resolved) },
    {
      key: "hours",
      header: t.terms.hours,
      align: "right",
      render: (u) => (
        <span className="bar-cell">
          <span className="minibar" style={{ width: `${(u.hours / maxHours) * 70 + 4}px` }} />
          {fmtNum(u.hours, 1)}
        </span>
      ),
    },
  ];

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

      <DataTable title={t.users.detail} columns={columns} rows={m.byUser} />
    </>
  );
}
