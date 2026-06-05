"use client";

import { useState } from "react";
import Image from "next/image";
import { Printer } from "lucide-react";
import { useMetrics } from "@/hooks/use-data";
import { Loading, ErrorState } from "@/components/states";
import { KpiCard, STATUS_TYPE_COLOR, CHART } from "@/components/ui";
import { BarCard, DonutCard, LineCard } from "@/components/charts";
import { DataTable, type Column } from "@/components/data-table";
import { useT, useFormatters } from "@/lib/i18n/context";
import type { ListMetrics } from "@/lib/metrics";

export default function ReportePage() {
  const { data, isLoading, error } = useMetrics();
  const t = useT();
  const { fmtNum, fmtDur, fmtDate, monthLabel } = useFormatters();
  const [generatedAt] = useState(() => Date.now());
  if (isLoading) return <Loading label={t.states.generatingReport} />;
  if (error) return <ErrorState message={(error as Error).message} />;
  const m = data!.metrics;

  const statusTotal = m.byStatus.reduce((s, x) => s + x.count, 0);
  const statusData = m.byStatus.map((s) => ({ name: s.status, value: s.count, color: STATUS_TYPE_COLOR[s.type] }));
  const monthly = m.monthly.map((b) => ({ ...b, label: monthLabel(b.month) }));
  const mttrData = m.byList
    .filter((l) => l.mttr.median != null)
    .sort((a, b) => (b.mttr.median ?? 0) - (a.mttr.median ?? 0))
    .slice(0, 20)
    .map((l) => ({ listName: l.listName, mttr: l.mttr.median }));

  const cols: Column<ListMetrics>[] = [
    { key: "list", header: t.terms.list, render: (l) => <span className="font-semibold">{l.listName}</span> },
    { key: "created", header: t.terms.created, align: "right", render: (l) => fmtNum(l.created) },
    { key: "open", header: t.terms.open, align: "right", render: (l) => fmtNum(l.open) },
    { key: "resolved", header: t.terms.resolved, align: "right", render: (l) => fmtNum(l.resolved) },
    { key: "hours", header: t.terms.hours, align: "right", render: (l) => fmtNum(l.hours, 1) },
    { key: "mttd", header: t.lists.mttdMed, align: "right", render: (l) => fmtDur(l.mttd.median) },
    { key: "mttr", header: t.lists.mttrMed, align: "right", render: (l) => fmtDur(l.mttr.median) },
  ];

  const f = m.meta.filters;
  const rangeText =
    f.start || f.end
      ? t.report.range(f.start ? fmtDate(f.start) : t.report.rangeStart, f.end ? fmtDate(f.end) : t.report.rangeEnd)
      : t.report.rangeFull;

  return (
    <div className="report-shell">
      <div data-noprint style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button type="button" className="btn btn--primary" onClick={() => window.print()}>
          <Printer /> {t.report.printSave}
        </button>
      </div>

      <div className="report-page">
        <div className="report-head">
          <Image
            className="report-head__logo"
            src="/brand/dinocloud-10y-horizontal-color.png"
            alt="DinoCloud"
            width={200}
            height={40}
          />
          <div className="report-meta">
            <div className="confidential-badge">{t.common.confidential}</div>
            <div style={{ marginTop: 4 }}>{t.report.generated(fmtDate(generatedAt), fmtDate(m.meta.fetchedAt))}</div>
            <div>{rangeText}</div>
          </div>
        </div>

        <div className="content" style={{ padding: 0, gap: 24 }}>
          <div className="grid kpi-grid">
            <KpiCard label={t.overview.createdRange} value={m.totals.created} />
            <KpiCard label={t.overview.openBacklog} value={m.totals.open} />
            <KpiCard label={t.overview.resolvedRange} value={m.totals.resolved} />
            <KpiCard label={t.overview.hoursTracked} value={fmtNum(m.totals.hours, 1)} unit="h" />
            <KpiCard label={t.overview.mttrMean} value={fmtDur(m.totals.mttr.mean)} hint={t.overview.medianHint(fmtDur(m.totals.mttr.median))} />
            <KpiCard label={t.overview.mttdMean} value={fmtDur(m.totals.mttd.mean)} />
            <KpiCard label={t.terms.unassigned} value={m.totals.unassigned} />
            <KpiCard label={t.overview.reopenRate} value={`${fmtNum(m.totals.reopenRate, 1)}%`} />
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
              height={240}
            />
            <DonutCard title={t.overview.statusDist} data={statusData} height={240} centerTop={fmtNum(statusTotal)} centerBottom={t.terms.tasks} />
          </div>

          <div className="print-break">
            <DataTable title={t.report.listMetrics} columns={cols} rows={m.byList} />
          </div>

          <BarCard
            title={t.report.mttrByList}
            data={mttrData}
            xKey="listName"
            horizontal
            bars={[{ key: "mttr", name: "MTTR", color: CHART.mttr }]}
            height={Math.max(240, mttrData.length * 26)}
          />
        </div>

        <div className="report-foot">{t.common.confidential} · DinoCloud MSP · {t.report.footer}</div>
      </div>
    </div>
  );
}
