"use client";

import { useMetrics } from "@/hooks/use-data";
import { Loading, ErrorState, Empty } from "@/components/states";
import { DataTable, type Column } from "@/components/data-table";
import { BarCard } from "@/components/charts";
import { ExportButton } from "@/components/export-button";
import { useT, useFormatters } from "@/lib/i18n/context";
import type { ListMetrics } from "@/lib/metrics";

export default function ListasPage() {
  const { data, isLoading, error } = useMetrics();
  const t = useT();
  const { fmtNum, fmtDays } = useFormatters();
  if (isLoading) return <Loading />;
  if (error) return <ErrorState message={(error as Error).message} />;
  const m = data!.metrics;
  if (m.byList.length === 0) return <Empty />;

  const columns: Column<ListMetrics>[] = [
    { key: "list", header: t.terms.list, render: (l) => <span className="font-medium">{l.listName}</span> },
    { key: "folder", header: t.terms.folder, render: (l) => <span className="text-neutral-500">{l.folderName}</span> },
    { key: "created", header: t.terms.created, align: "right", render: (l) => fmtNum(l.created) },
    { key: "open", header: t.terms.open, align: "right", render: (l) => fmtNum(l.open) },
    { key: "resolved", header: t.terms.resolved, align: "right", render: (l) => fmtNum(l.resolved) },
    { key: "hours", header: t.terms.hours, align: "right", render: (l) => fmtNum(l.hours, 1) },
    { key: "mttd", header: t.lists.mttdMed, align: "right", render: (l) => fmtDays(l.mttd.median) },
    { key: "mttr", header: t.lists.mttrMed, align: "right", render: (l) => fmtDays(l.mttr.median) },
    { key: "mttrp90", header: t.lists.mttrP90, align: "right", render: (l) => fmtDays(l.mttr.p90) },
    { key: "aging", header: t.lists.agingOpen, align: "right", render: (l) => fmtDays(l.avgAgingDays) },
  ];

  const mttrData = m.byList
    .filter((l) => l.mttr.median != null)
    .slice(0, 15)
    .map((l) => ({ listName: l.listName, mttr: l.mttr.median, mttd: l.mttd.median }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t.lists.title}</h1>
        <ExportButton />
      </div>

      <BarCard
        title={t.lists.mttrVsMttd}
        data={mttrData}
        xKey="listName"
        bars={[
          { key: "mttr", name: "MTTR", color: "#dc2626" },
          { key: "mttd", name: "MTTD", color: "#f59e0b" },
        ]}
        height={320}
      />

      <DataTable title={t.lists.detail} columns={columns} rows={m.byList} />

      <BarCard
        title={t.lists.hoursByList}
        data={m.byList.slice(0, 15).map((l) => ({ listName: l.listName, hours: l.hours }))}
        xKey="listName"
        bars={[{ key: "hours", name: t.terms.hours, color: "#2563eb" }]}
        height={300}
      />
    </div>
  );
}
