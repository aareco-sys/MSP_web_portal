"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useMetrics } from "@/hooks/use-data";
import { Loading, ErrorState, Empty } from "@/components/states";
import { DataTable, type Column } from "@/components/data-table";
import { BarCard, LineCard } from "@/components/charts";
import { CHART } from "@/components/ui";
import { useT, useFormatters } from "@/lib/i18n/context";
import type { MonthlyBucket } from "@/lib/metrics";

interface Row extends MonthlyBucket {
  label: string;
  createdDelta: number | null;
  resolvedDelta: number | null;
  hoursDelta: number | null;
}

function Delta({ value, fmt }: { value: number | null; fmt: (n: number) => string }) {
  if (value == null) return <span className="delta delta--flat">—</span>;
  if (value === 0)
    return (
      <span className="delta delta--flat">
        <Minus />
      </span>
    );
  const up = value > 0;
  return (
    <span className={`delta ${up ? "delta--up" : "delta--down"}`}>
      {up ? <ArrowUp /> : <ArrowDown />}
      {fmt(Math.abs(value))}
    </span>
  );
}

export default function MensualPage() {
  const { data, isLoading, error } = useMetrics();
  const t = useT();
  const { fmtNum, fmtDur, monthLabel } = useFormatters();
  if (isLoading) return <Loading />;
  if (error) return <ErrorState message={(error as Error).message} />;
  const m = data!.metrics;
  if (m.monthly.length === 0) return <Empty />;

  const rows: Row[] = m.monthly.map((r, i) => {
    const prev = m.monthly[i - 1];
    const d = (a: number, b: number | undefined) => (b == null ? null : a - b);
    return {
      ...r,
      label: monthLabel(r.month),
      createdDelta: d(r.created, prev?.created),
      resolvedDelta: d(r.resolved, prev?.resolved),
      hoursDelta: prev ? Math.round((r.hours - prev.hours) * 10) / 10 : null,
    };
  });
  const chartData = rows as unknown as Record<string, unknown>[];

  const columns: Column<Row>[] = [
    { key: "month", header: t.terms.month, render: (r) => <span className="font-semibold">{r.label}</span> },
    { key: "created", header: t.terms.created, align: "right", render: (r) => fmtNum(r.created) },
    { key: "cd", header: t.monthly.delta, align: "right", render: (r) => <Delta value={r.createdDelta} fmt={(n) => fmtNum(n)} /> },
    { key: "resolved", header: t.terms.resolved, align: "right", render: (r) => fmtNum(r.resolved) },
    { key: "rd", header: t.monthly.delta, align: "right", render: (r) => <Delta value={r.resolvedDelta} fmt={(n) => fmtNum(n)} /> },
    { key: "subtasks", header: t.terms.subtasks, align: "right", render: (r) => fmtNum(r.subtasks) },
    { key: "hours", header: t.terms.hours, align: "right", render: (r) => fmtNum(r.hours, 1) },
    { key: "hd", header: t.monthly.delta, align: "right", render: (r) => <Delta value={r.hoursDelta} fmt={(n) => fmtNum(n, 1)} /> },
    { key: "mttr", header: "MTTR", align: "right", render: (r) => fmtDur(r.mttrDays) },
    { key: "mttd", header: "MTTD", align: "right", render: (r) => fmtDur(r.mttdDays) },
  ];

  return (
    <>
      <div className="chart-row-eq">
        <BarCard
          title={t.monthly.createdVsResolved}
          data={chartData}
          xKey="label"
          bars={[
            { key: "created", name: t.terms.created, color: CHART.created },
            { key: "resolved", name: t.terms.resolved, color: CHART.resolved },
          ]}
        />
        <LineCard
          title={t.monthly.mttrMttdByMonth}
          data={chartData}
          xKey="label"
          lines={[
            { key: "mttrDays", name: "MTTR", color: CHART.mttr },
            { key: "mttdDays", name: "MTTD", color: CHART.mttd },
          ]}
        />
      </div>

      <LineCard
        title={t.monthly.hoursByMonth}
        data={chartData}
        xKey="label"
        area
        lines={[{ key: "hours", name: t.terms.hours, color: CHART.hours }]}
      />

      <DataTable title={t.monthly.detail} columns={columns} rows={rows} />
    </>
  );
}
