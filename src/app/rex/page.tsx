"use client";

import { useState } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { useRex } from "@/hooks/use-data";
import { Loading, ErrorState, Empty } from "@/components/states";
import { KpiCard, Card } from "@/components/ui";
import { DonutCard } from "@/components/charts";
import { DataTable, type Column } from "@/components/data-table";
import { RexInProgress } from "@/components/rex-in-progress";
import { useT, useFormatters } from "@/lib/i18n/context";
import type { Slice } from "@/lib/rex";

function ProgressBar({ slices, total }: { slices: Slice[]; total: number }) {
  const denom = total || 1;
  return (
    <div
      style={{ display: "flex", height: 26, overflow: "hidden", borderRadius: 8, border: "1px solid var(--color-border)" }}
    >
      {slices.map((s) => (
        <span
          key={s.key}
          title={`${s.label}: ${s.count}`}
          style={{ width: `${(s.count / denom) * 100}%`, background: s.color }}
        />
      ))}
    </div>
  );
}

function PriorityBars({ items }: { items: Slice[] }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div style={{ display: "flex", height: 220, alignItems: "flex-end", gap: 16, paddingTop: 8 }}>
      {items.map((i) => (
        <div key={i.key} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
          <span style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{i.count}</span>
          <div style={{ width: "62%", minHeight: 2, height: `${(i.count / max) * 100}%`, background: i.color, borderRadius: "5px 5px 0 0" }} />
          <span style={{ fontSize: 12, color: "var(--color-fg-muted)", marginTop: 8 }}>{i.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function RexPage() {
  const { data, isLoading, error } = useRex();
  const t = useT();
  const { fmtNum, fmtDate } = useFormatters();
  const [generatedAt] = useState(() => Date.now());
  if (isLoading) return <Loading />;
  if (error) return <ErrorState message={(error as Error).message} />;
  const m = data!.metrics;
  if (m.total === 0) return <Empty />;

  const label = (s: Slice) => (s.key === "__unassigned" ? t.terms.unassigned : s.label);
  const statusData = m.byStatus.map((s) => ({ name: s.label, value: s.count, color: s.color }));
  const assigneeData = m.openByAssignee.map((s) => ({ name: label(s), value: s.count, color: s.color }));

  const completed = m.completedList.map((r) => ({
    name: r.name,
    assignee: r.assignee === "__unassigned" ? t.terms.unassigned : r.assignee,
  }));
  const completedCols: Column<{ name: string; assignee: string }>[] = [
    { key: "task", header: t.rex.task, render: (r) => r.name },
    { key: "assignee", header: t.rex.responsible, render: (r) => <span className="muted" style={{ color: "var(--color-fg-muted)" }}>{r.assignee}</span> },
  ];

  const rangeText = t.report.range(fmtDate(m.range.start), fmtDate(m.range.end));

  return (
    <>
      {/* Encabezado que aparece solo en el PDF */}
      <div className="print-only report-head">
        <div>
          <Image
            className="report-head__logo"
            src="/brand/dinocloud-10y-horizontal-color.png"
            alt="DinoCloud"
            width={200}
            height={40}
          />
          <h1 style={{ marginTop: 8, fontSize: 22, fontWeight: 700 }}>{t.rex.title}</h1>
        </div>
        <div className="report-meta">
          <div className="confidential-badge">{t.common.confidential}</div>
          <div style={{ marginTop: 4 }}>{t.report.generated(fmtDate(generatedAt), fmtDate(generatedAt))}</div>
          <div>{rangeText}</div>
        </div>
      </div>

      <div className="grid kpi-grid">
        <KpiCard label={t.rex.open} value={m.open} />
        <KpiCard label={t.rex.overdue} value={m.overdue} tone={m.overdue > 0 ? "amber" : "green"} />
        <KpiCard label={t.rex.total} value={m.total} />
        <KpiCard label={t.rex.closed} value={m.closed} tone="green" />
      </div>

      <Card title={t.rex.progress}>
        <ProgressBar slices={m.byStatus} total={m.total} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13, color: "var(--color-fg-muted)" }}>
          <span>{t.rex.progressHint(fmtNum(m.done), fmtNum(m.total))}</span>
          <span style={{ fontFamily: "var(--font-ui)" }}>{t.rex.donePct(fmtNum(m.donePct, 1))}</span>
        </div>
      </Card>

      <RexInProgress count={m.inProgressCount} tasks={m.inProgress} />

      <div className="chart-row-eq">
        <DonutCard title={t.rex.workloadByStatus} data={statusData} centerTop={fmtNum(m.total)} centerBottom={t.terms.tasks} />
        {m.byPriority.length > 0 ? (
          <Card title={t.rex.priorityBreakdown}>
            <PriorityBars items={m.byPriority} />
          </Card>
        ) : (
          <Card title={t.rex.priorityBreakdown}>
            <p style={{ padding: "48px 0", textAlign: "center", color: "var(--color-fg-subtle)", fontSize: 14 }}>{t.rex.noPriority}</p>
          </Card>
        )}
      </div>

      <div className="chart-row-eq">
        <DonutCard title={t.rex.openByAssignee} data={assigneeData} centerTop={fmtNum(m.open)} centerBottom={t.terms.tasks} />
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", alignContent: "start" }}>
          <KpiCard label={t.rex.createdRange} value={m.created} />
          <KpiCard label={t.rex.completedRange} value={m.completed} tone="green" />
        </div>
      </div>

      {completed.length > 0 ? (
        <DataTable title={t.rex.completedTitle} columns={completedCols} rows={completed} />
      ) : (
        <Card title={t.rex.completedTitle}>
          <p style={{ color: "var(--color-fg-subtle)", fontSize: 14 }}>{t.rex.noCompleted}</p>
        </Card>
      )}

      <a
        href={data!.board}
        target="_blank"
        rel="noopener noreferrer"
        data-noprint
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-brand)" }}
      >
        <ExternalLink style={{ width: 14, height: 14 }} /> {t.rex.board}
      </a>
    </>
  );
}
