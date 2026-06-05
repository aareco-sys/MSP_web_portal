"use client";

import { useMetrics } from "@/hooks/use-data";
import { Loading, ErrorState, Empty } from "@/components/states";
import { DataTable, type Column } from "@/components/data-table";
import { BarCard, LineCard } from "@/components/charts";
import { ExportButton } from "@/components/export-button";
import { useT, useFormatters } from "@/lib/i18n/context";
import type { MonthlyBucket } from "@/lib/metrics";

interface Row extends MonthlyBucket {
  createdDelta: number | null;
  resolvedDelta: number | null;
  hoursDelta: number | null;
}

function withDeltas(rows: MonthlyBucket[]): Row[] {
  return rows.map((r, i) => {
    const prev = rows[i - 1];
    const d = (a: number, b: number | undefined) => (b == null ? null : a - b);
    return {
      ...r,
      createdDelta: d(r.created, prev?.created),
      resolvedDelta: d(r.resolved, prev?.resolved),
      hoursDelta: prev ? Math.round((r.hours - prev.hours) * 10) / 10 : null,
    };
  });
}

function Delta({ value, fmt }: { value: number | null; fmt: (n: number, d?: number) => string }) {
  if (value == null || value === 0)
    return <span className="text-neutral-400">→</span>;
  const up = value > 0;
  return (
    <span className={up ? "text-green-600" : "text-red-600"}>
      {up ? "▲" : "▼"} {fmt(Math.abs(value), Number.isInteger(value) ? 0 : 1)}
    </span>
  );
}

export default function MensualPage() {
  const { data, isLoading, error } = useMetrics();
  const t = useT();
  const { fmtNum, fmtDays } = useFormatters();
  if (isLoading) return <Loading />;
  if (error) return <ErrorState message={(error as Error).message} />;
  const m = data!.metrics;
  if (m.monthly.length === 0) return <Empty />;

  const rows = withDeltas(m.monthly);
  const columns: Column<Row>[] = [
    { key: "month", header: t.terms.month, render: (r) => <span className="font-medium">{r.month}</span> },
    { key: "created", header: t.terms.created, align: "right", render: (r) => fmtNum(r.created) },
    { key: "cd", header: t.monthly.delta, align: "right", render: (r) => <Delta value={r.createdDelta} fmt={fmtNum} /> },
    { key: "resolved", header: t.terms.resolved, align: "right", render: (r) => fmtNum(r.resolved) },
    { key: "rd", header: t.monthly.delta, align: "right", render: (r) => <Delta value={r.resolvedDelta} fmt={fmtNum} /> },
    { key: "hours", header: t.terms.hours, align: "right", render: (r) => fmtNum(r.hours, 1) },
    { key: "hd", header: t.monthly.delta, align: "right", render: (r) => <Delta value={r.hoursDelta} fmt={fmtNum} /> },
    { key: "mttr", header: "MTTR", align: "right", render: (r) => fmtDays(r.mttrDays) },
    { key: "mttd", header: "MTTD", align: "right", render: (r) => fmtDays(r.mttdDays) },
  ];

  const monthlyData = m.monthly as unknown as Record<string, unknown>[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t.monthly.title}</h1>
        <ExportButton />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarCard
          title={t.monthly.createdVsResolved}
          data={monthlyData}
          xKey="month"
          bars={[
            { key: "created", name: t.terms.created, color: "#2563eb" },
            { key: "resolved", name: t.terms.resolved, color: "#16a34a" },
          ]}
        />
        <LineCard
          title={t.monthly.mttrMttdByMonth}
          data={monthlyData}
          xKey="month"
          lines={[
            { key: "mttrDays", name: "MTTR", color: "#dc2626" },
            { key: "mttdDays", name: "MTTD", color: "#f59e0b" },
          ]}
        />
      </div>

      <LineCard
        title={t.monthly.hoursByMonth}
        data={monthlyData}
        xKey="month"
        lines={[{ key: "hours", name: t.terms.hours, color: "#7c3aed" }]}
      />

      <DataTable title={t.monthly.detail} columns={columns} rows={rows} />
    </div>
  );
}
