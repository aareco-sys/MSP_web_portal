"use client";

import {
  Clock,
  CircleCheck,
  Gauge,
  Inbox,
  ListTree,
  RotateCcw,
  SquarePlus,
  Timer,
  UserX,
} from "lucide-react";
import { useMetrics } from "@/hooks/use-data";
import { Loading, ErrorState, Empty } from "@/components/states";
import { KpiCard, CHART, STATUS_TYPE_COLOR, PRIORITY_COLOR } from "@/components/ui";
import { BarCard, DonutCard, LineCard } from "@/components/charts";
import { useT, useFormatters } from "@/lib/i18n/context";

export default function OverviewPage() {
  const { data, isLoading, error } = useMetrics();
  const t = useT();
  const { fmtNum, fmtDur, monthLabel } = useFormatters();
  if (isLoading) return <Loading />;
  if (error) return <ErrorState message={(error as Error).message} />;
  const m = data!.metrics;
  if (m.totals.scopedTotal === 0) return <Empty />;

  const statusTotal = m.byStatus.reduce((s, x) => s + x.count, 0);
  const statusData = m.byStatus.map((s) => ({
    name: s.status,
    value: s.count,
    color: STATUS_TYPE_COLOR[s.type],
  }));
  const priorityData = m.byPriority.map((p) => {
    const key = p.priority.toLowerCase();
    const known = key in PRIORITY_COLOR;
    return {
      name: known ? t.priority[key as keyof typeof t.priority] : t.priority.none,
      value: p.count,
      color: known ? PRIORITY_COLOR[key] : "#9aa0ad",
    };
  });
  const topLists = m.byList.slice(0, 8).map((l) => ({
    listName: l.listName,
    resolved: l.resolved,
    open: l.open,
  }));
  const monthly = m.monthly.map((b) => ({ ...b, label: monthLabel(b.month) }));

  return (
    <>
      <div className="grid kpi-grid">
        <KpiCard
          label={t.terms.tasks}
          value={m.totals.scopedTotal}
          icon={<ListTree />}
          tone="slate"
          hint={`${fmtNum(m.totals.subtasks)} ${t.terms.subtasks.toLowerCase()}`}
        />
        <KpiCard label={t.overview.createdRange} value={m.totals.created} icon={<SquarePlus />} tone="green" />
        <KpiCard
          label={t.overview.openBacklog}
          value={m.totals.open}
          icon={<Inbox />}
          tone="amber"
          hint={`${fmtNum(m.totals.unassigned)} ${t.terms.unassigned.toLowerCase()}`}
        />
        <KpiCard label={t.overview.resolvedRange} value={m.totals.resolved} icon={<CircleCheck />} tone="green" />
        <KpiCard label={t.overview.hoursTracked} value={fmtNum(m.totals.hours, 1)} unit="h" icon={<Clock />} tone="blue" />
        <KpiCard
          label={t.overview.mttrMean}
          value={fmtDur(m.totals.mttr.mean)}
          icon={<Timer />}
          tone="slate"
          hint={t.overview.medianHint(fmtDur(m.totals.mttr.median))}
        />
        <KpiCard
          label={t.overview.mttdMean}
          value={fmtDur(m.totals.mttd.mean)}
          icon={<Gauge />}
          tone="slate"
          hint={t.overview.medianHint(fmtDur(m.totals.mttd.median))}
        />
        <KpiCard label={t.terms.unassigned} value={m.totals.unassigned} icon={<UserX />} tone="slate" />
        <KpiCard
          label={t.overview.reopenRate}
          value={`${fmtNum(m.totals.reopenRate, 1)}%`}
          icon={<RotateCcw />}
          tone="slate"
          hint={t.overview.reopenHint(fmtNum(m.totals.reopened))}
        />
      </div>

      <div className="chart-row-2">
        <LineCard
          title={t.overview.monthlyTrend}
          data={monthly as unknown as Record<string, unknown>[]}
          xKey="label"
          area
          lines={[
            { key: "created", name: t.terms.created, color: CHART.created },
            { key: "resolved", name: t.terms.resolved, color: CHART.resolved },
          ]}
        />
        <DonutCard
          title={t.overview.statusDist}
          data={statusData}
          centerTop={fmtNum(statusTotal)}
          centerBottom={t.terms.tasks}
        />
      </div>

      <div className="chart-row-eq">
        <BarCard
          title={t.overview.topLists}
          data={topLists}
          xKey="listName"
          stacked
          bars={[
            { key: "resolved", name: t.terms.resolved, color: CHART.resolved },
            { key: "open", name: t.terms.open, color: CHART.open },
          ]}
          height={300}
        />
        <DonutCard title={t.overview.priorityDist} data={priorityData} />
      </div>
    </>
  );
}
