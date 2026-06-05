"use client";

import { useMetrics } from "@/hooks/use-data";
import { Loading, ErrorState, Empty } from "@/components/states";
import { DataTable, type Column } from "@/components/data-table";
import { BarCard } from "@/components/charts";
import { ExportButton } from "@/components/export-button";
import { useT, useFormatters } from "@/lib/i18n/context";
import type { UserMetrics } from "@/lib/metrics";

export default function UsuariosPage() {
  const { data, isLoading, error } = useMetrics();
  const t = useT();
  const { fmtNum } = useFormatters();
  if (isLoading) return <Loading />;
  if (error) return <ErrorState message={(error as Error).message} />;
  const m = data!.metrics;
  if (m.byUser.length === 0) return <Empty />;

  const columns: Column<UserMetrics>[] = [
    { key: "user", header: t.terms.user, render: (u) => <span className="font-medium">{u.userId === 0 ? t.terms.unassigned : u.username}</span> },
    { key: "total", header: t.terms.tasks, align: "right", render: (u) => fmtNum(u.total) },
    { key: "open", header: t.terms.open, align: "right", render: (u) => fmtNum(u.open) },
    { key: "resolved", header: t.terms.resolved, align: "right", render: (u) => fmtNum(u.resolved) },
    { key: "hours", header: t.terms.hours, align: "right", render: (u) => fmtNum(u.hours, 1) },
  ];

  const nameOf = (u: UserMetrics) => (u.userId === 0 ? t.terms.unassigned : u.username);
  const top = m.byUser.slice(0, 15);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t.users.title}</h1>
        <ExportButton />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarCard
          title={t.users.hoursByUser}
          data={top.map((u) => ({ user: nameOf(u), hours: u.hours }))}
          xKey="user"
          bars={[{ key: "hours", name: t.terms.hours, color: "#2563eb" }]}
          height={320}
        />
        <BarCard
          title={t.users.loadByUser}
          data={top.map((u) => ({ user: nameOf(u), open: u.open, resolved: u.resolved }))}
          xKey="user"
          bars={[
            { key: "open", name: t.terms.open, color: "#f59e0b" },
            { key: "resolved", name: t.terms.resolved, color: "#16a34a" },
          ]}
          height={320}
        />
      </div>

      <DataTable title={t.users.detail} columns={columns} rows={m.byUser} />
    </div>
  );
}
