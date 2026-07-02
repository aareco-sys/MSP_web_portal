"use client";

import { useMetrics } from "@/hooks/use-data";
import { Loading, ErrorState, Empty } from "@/components/states";
import { DataTable, type Column } from "@/components/data-table";
import { BarCard, DonutCard, LineCard } from "@/components/charts";
import { CHART, PALETTE, STATUS_TYPE_COLOR } from "@/components/ui";
import { useT, useFormatters } from "@/lib/i18n/context";
import type { ListMetrics, MonthlyBucket } from "@/lib/metrics";

export default function ListasPage() {
  const { data, isLoading, error } = useMetrics();
  const t = useT();
  const { fmtNum, fmtDur, monthLabel } = useFormatters();
  if (isLoading) return <Loading />;
  if (error) return <ErrorState message={(error as Error).message} />;
  const m = data!.metrics;
  if (m.byList.length === 0) return <Empty />;

  const dotColor = new Map(m.byList.map((l, i) => [l.listId, PALETTE[i % PALETTE.length]]));

  const columns: Column<ListMetrics>[] = [
    {
      key: "list",
      header: t.terms.list,
      render: (l) => (
        <span className="cell-name">
          <span className="dot" style={{ background: dotColor.get(l.listId) }} />
          <span className="font-semibold">{l.listName}</span>
        </span>
      ),
    },
    { key: "folder", header: t.terms.folder, render: (l) => <span className="badge badge--slate">{l.folderName}</span> },
    { key: "created", header: t.terms.created, align: "right", render: (l) => fmtNum(l.created) },
    { key: "open", header: t.terms.open, align: "right", render: (l) => fmtNum(l.open) },
    { key: "resolved", header: t.terms.resolved, align: "right", render: (l) => fmtNum(l.resolved) },
    { key: "subtasks", header: t.terms.subtasks, align: "right", render: (l) => fmtNum(l.subtasks) },
    { key: "hours", header: t.terms.hours, align: "right", render: (l) => fmtNum(l.hours, 1) },
    { key: "mttd", header: t.lists.mttdMed, align: "right", render: (l) => fmtDur(l.mttd.median) },
    { key: "mttr", header: t.lists.mttrMed, align: "right", render: (l) => fmtDur(l.mttr.median) },
    { key: "mttrp90", header: t.lists.mttrP90, align: "right", render: (l) => fmtDur(l.mttr.p90) },
    { key: "aging", header: t.lists.agingOpen, align: "right", render: (l) => fmtDur(l.avgAgingDays) },
  ];

  // Estado de tickets por cliente (apilado por tipo de estado) — top 12 por volumen.
  const statusByClient = [...m.byList]
    .sort((a, b) => b.total - a.total)
    .slice(0, 12)
    .map((l) => ({
      listName: l.listName,
      open: l.statusByType.open,
      custom: l.statusByType.custom,
      done: l.statusByType.done,
      closed: l.statusByType.closed,
    }));

  // Donut global por estado.
  const statusTotal = m.byStatus.reduce((s, x) => s + x.count, 0);
  const statusDonut = m.byStatus.map((s) => ({
    name: s.status,
    value: s.count,
    color: STATUS_TYPE_COLOR[s.type],
  }));

  // Creadas vs resueltas por cliente — top 12 por creadas.
  const flowData = [...m.byList]
    .sort((a, b) => b.created - a.created)
    .slice(0, 12)
    .map((l) => ({ listName: l.listName, created: l.created, resolved: l.resolved }));

  const mttrData = m.byList
    .filter((l) => l.mttr.median != null)
    .sort((a, b) => (b.mttr.median ?? 0) - (a.mttr.median ?? 0))
    .slice(0, 12)
    .map((l) => ({ listName: l.listName, mttr: l.mttr.median, mttd: l.mttd.median }));

  const hoursData = [...m.byList]
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 12)
    .map((l) => ({ listName: l.listName, hours: l.hours }));

  // Horas trackeadas por mes (respeta los filtros vía useMetrics → m.monthly).
  // Tendencia: regresión lineal por mínimos cuadrados sobre las horas.
  const monthsHours = m.monthly;
  const n = monthsHours.length;
  let trendAt: (i: number) => number | null = () => null;
  if (n >= 2) {
    const sx = monthsHours.reduce((s, _r, i) => s + i, 0);
    const sy = monthsHours.reduce((s, r) => s + r.hours, 0);
    const sxx = monthsHours.reduce((s, _r, i) => s + i * i, 0);
    const sxy = monthsHours.reduce((s, r, i) => s + i * r.hours, 0);
    const denom = n * sxx - sx * sx;
    const slope = denom !== 0 ? (n * sxy - sx * sy) / denom : 0;
    const intercept = (sy - slope * sx) / n;
    trendAt = (i) => Math.round((intercept + slope * i) * 10) / 10;
  }
  const hoursMonthlyChart = monthsHours.map((r, i) => ({
    label: monthLabel(r.month),
    hours: r.hours,
    trend: trendAt(i),
  })) as unknown as Record<string, unknown>[];

  const hoursByMonthColumns: Column<MonthlyBucket>[] = [
    {
      key: "month",
      header: t.terms.month,
      render: (r) => <span className="font-semibold">{monthLabel(r.month)}</span>,
    },
    { key: "hours", header: t.terms.hours, align: "right", render: (r) => fmtNum(r.hours, 1) },
  ];

  return (
    <>
      <div className="chart-row-2">
        <BarCard
          title={t.lists.statusByClient}
          data={statusByClient}
          xKey="listName"
          stacked
          bars={[
            { key: "open", name: t.statusType.open, color: STATUS_TYPE_COLOR.open },
            { key: "custom", name: t.statusType.custom, color: STATUS_TYPE_COLOR.custom },
            { key: "done", name: t.statusType.done, color: STATUS_TYPE_COLOR.done },
            { key: "closed", name: t.statusType.closed, color: STATUS_TYPE_COLOR.closed },
          ]}
          height={320}
        />
        <DonutCard
          title={t.lists.statusDist}
          data={statusDonut}
          centerTop={fmtNum(statusTotal)}
          centerBottom={t.terms.tasks}
        />
      </div>

      <div className="chart-row-eq">
        <BarCard
          title={t.lists.createdVsResolved}
          data={flowData}
          xKey="listName"
          bars={[
            { key: "created", name: t.terms.created, color: CHART.created },
            { key: "resolved", name: t.terms.resolved, color: CHART.resolved },
          ]}
          height={320}
        />
        <BarCard
          title={t.lists.mttrVsMttd}
          data={mttrData}
          xKey="listName"
          bars={[
            { key: "mttr", name: "MTTR", color: CHART.mttr },
            { key: "mttd", name: "MTTD", color: CHART.mttd },
          ]}
          height={320}
        />
      </div>

      <BarCard
        title={t.lists.hoursByList}
        data={hoursData}
        xKey="listName"
        horizontal
        bars={[{ key: "hours", name: t.terms.hours, color: CHART.hours }]}
        height={340}
      />

      <DataTable title={t.lists.detail} columns={columns} rows={m.byList} />

      <LineCard
        title={t.monthly.hoursByMonth}
        data={hoursMonthlyChart}
        xKey="label"
        lines={[
          { key: "hours", name: t.terms.hours, color: CHART.hours },
          { key: "trend", name: t.terms.trend, color: "#9aa0ad", dashed: true },
        ]}
        height={300}
      />

      <DataTable columns={hoursByMonthColumns} rows={m.monthly} />
    </>
  );
}
