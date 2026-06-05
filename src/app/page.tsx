"use client";

import { useMetrics } from "@/hooks/use-data";
import { Loading, ErrorState, Empty } from "@/components/states";
import { KpiCard, STATUS_TYPE_COLOR } from "@/components/ui";
import { BarCard, DonutCard, LineCard } from "@/components/charts";
import { ExportButton } from "@/components/export-button";
import { useT, useFormatters } from "@/lib/i18n/context";

export default function OverviewPage() {
  const { data, isLoading, error } = useMetrics();
  const t = useT();
  const { fmtNum, fmtDays } = useFormatters();
  if (isLoading) return <Loading />;
  if (error) return <ErrorState message={(error as Error).message} />;
  const m = data!.metrics;
  if (m.totals.scopedTotal === 0) return <Empty />;

  const statusData = m.byStatus.map((s) => ({
    name: s.status,
    value: s.count,
    color: STATUS_TYPE_COLOR[s.type] ?? undefined,
  }));
  const topLists = m.byList.slice(0, 10).map((l) => ({
    listName: l.listName,
    open: l.open,
    resolved: l.resolved,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t.overview.title}</h1>
        <ExportButton />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label={t.terms.created} value={m.totals.created} />
        <KpiCard label={t.terms.open} value={m.totals.open} />
        <KpiCard label={t.overview.resolvedRange} value={m.totals.resolved} />
        <KpiCard label={t.overview.hoursTracked} value={fmtNum(m.totals.hours, 1)} />
        <KpiCard
          label={t.overview.mttrMean}
          value={fmtDays(m.totals.mttr.mean)}
          hint={t.overview.medianHint(fmtDays(m.totals.mttr.median))}
        />
        <KpiCard
          label={t.overview.mttdMean}
          value={fmtDays(m.totals.mttd.mean)}
          hint={t.overview.medianHint(fmtDays(m.totals.mttd.median))}
        />
        <KpiCard label={t.terms.unassigned} value={m.totals.unassigned} />
        <KpiCard
          label={t.overview.reopenRate}
          value={`${fmtNum(m.totals.reopenRate, 1)}%`}
          hint={t.overview.reopenHint(fmtNum(m.totals.reopened))}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LineCard
          title={t.overview.monthlyTrend}
          data={m.monthly as unknown as Record<string, unknown>[]}
          xKey="month"
          lines={[
            { key: "created", name: t.terms.created },
            { key: "resolved", name: t.terms.resolved },
          ]}
        />
        <DonutCard title={t.overview.statusDist} data={statusData} />
      </div>

      <BarCard
        title={t.overview.topLists}
        data={topLists}
        xKey="listName"
        bars={[
          { key: "open", name: t.terms.open, color: "#f59e0b" },
          { key: "resolved", name: t.terms.resolved, color: "#16a34a" },
        ]}
        height={320}
      />
    </div>
  );
}
