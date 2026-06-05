"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMetrics } from "@/hooks/use-data";
import { Loading, ErrorState } from "@/components/states";
import { KpiCard, STATUS_TYPE_COLOR } from "@/components/ui";
import { BarCard, DonutCard, LineCard } from "@/components/charts";
import { DataTable, type Column } from "@/components/data-table";
import { useT, useFormatters } from "@/lib/i18n/context";
import type { ListMetrics } from "@/lib/metrics";

export default function ReportePage() {
  const { data, isLoading, error } = useMetrics();
  const t = useT();
  const { fmtNum, fmtDays, fmtDate } = useFormatters();
  const printed = useRef(false);
  const [generatedAt] = useState(() => Date.now());

  useEffect(() => {
    if (data && !printed.current) {
      printed.current = true;
      // pequeño delay para que los charts terminen de renderizar.
      const tmr = setTimeout(() => window.print(), 900);
      return () => clearTimeout(tmr);
    }
  }, [data]);

  if (isLoading) return <Loading label={t.states.generatingReport} />;
  if (error) return <ErrorState message={(error as Error).message} />;
  const m = data!.metrics;
  const confidential = t.common.confidential;

  const statusData = m.byStatus.map((s) => ({
    name: s.status,
    value: s.count,
    color: STATUS_TYPE_COLOR[s.type] ?? undefined,
  }));

  const listCols: Column<ListMetrics>[] = [
    { key: "list", header: t.terms.list, render: (l) => l.listName },
    { key: "total", header: t.terms.total, align: "right", render: (l) => fmtNum(l.total) },
    { key: "open", header: t.terms.open, align: "right", render: (l) => fmtNum(l.open) },
    { key: "resolved", header: t.terms.resolved, align: "right", render: (l) => fmtNum(l.resolved) },
    { key: "hours", header: t.terms.hours, align: "right", render: (l) => fmtNum(l.hours, 1) },
    { key: "mttd", header: t.lists.mttdMed, align: "right", render: (l) => fmtDays(l.mttd.median) },
    { key: "mttr", header: t.lists.mttrMed, align: "right", render: (l) => fmtDays(l.mttr.median) },
  ];

  const rangeText =
    m.meta.filters.start || m.meta.filters.end
      ? t.report.range(
          m.meta.filters.start ? fmtDate(m.meta.filters.start) : t.report.rangeStart,
          m.meta.filters.end ? fmtDate(m.meta.filters.end) : t.report.rangeEnd,
        )
      : t.report.rangeFull;

  return (
    <div className="space-y-6">
      {/* Controles (no salen en el PDF) */}
      <div data-noprint className="flex items-center justify-between">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          {t.report.back}
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t.report.printSave}
        </button>
      </div>

      {/* Encabezado del reporte */}
      <div className="border-b border-neutral-300 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{t.report.title}</h1>
          <span className="text-xs font-semibold uppercase tracking-wide text-red-600">
            {confidential}
          </span>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          {t.report.generated(fmtDate(generatedAt), fmtDate(m.meta.fetchedAt))} · {rangeText}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <KpiCard label={t.terms.created} value={m.totals.created} />
        <KpiCard label={t.terms.open} value={m.totals.open} />
        <KpiCard label={t.terms.resolved} value={m.totals.resolved} />
        <KpiCard label={t.terms.hours} value={fmtNum(m.totals.hours, 1)} />
        <KpiCard label={t.overview.mttrMean} value={fmtDays(m.totals.mttr.mean)} hint={t.overview.medianHint(fmtDays(m.totals.mttr.median))} />
        <KpiCard label={t.overview.mttdMean} value={fmtDays(m.totals.mttd.mean)} />
        <KpiCard label={t.terms.unassigned} value={m.totals.unassigned} />
        <KpiCard label={t.overview.reopenRate} value={`${fmtNum(m.totals.reopenRate, 1)}%`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <LineCard
          title={t.overview.monthlyTrend}
          data={m.monthly as unknown as Record<string, unknown>[]}
          xKey="month"
          lines={[
            { key: "created", name: t.terms.created },
            { key: "resolved", name: t.terms.resolved },
          ]}
          height={240}
        />
        <DonutCard title={t.overview.statusDist} data={statusData} height={240} />
      </div>

      <div className="print-break">
        <DataTable title={t.report.listMetrics} columns={listCols} rows={m.byList} />
      </div>

      <BarCard
        title={t.report.mttrByList}
        data={m.byList
          .filter((l) => l.mttr.median != null)
          .slice(0, 20)
          .map((l) => ({ listName: l.listName, mttr: l.mttr.median }))}
        xKey="listName"
        bars={[{ key: "mttr", name: "MTTR", color: "#dc2626" }]}
        height={300}
      />

      <footer className="border-t border-neutral-300 pt-3 text-center text-xs text-neutral-400">
        {confidential} · DinoCloud MSP · {t.report.footer}
      </footer>
    </div>
  );
}
