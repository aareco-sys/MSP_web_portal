"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useUserScorecard } from "@/hooks/use-data";
import { Loading, ErrorState, Empty } from "@/components/states";
import { KpiCard, Card, Avatar } from "@/components/ui";
import { BarCard, RadarCard } from "@/components/charts";
import { DataTable, type Column } from "@/components/data-table";
import { useT, useFormatters } from "@/lib/i18n/context";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export default function ScorecardPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useUserScorecard(id);
  const t = useT();
  const { fmtNum, fmtDur, monthLabel } = useFormatters();
  if (isLoading) return <Loading />;
  if (error) return <ErrorState message={(error as Error).message} />;
  const s = data!.scorecard;
  if (s.resolved === 0 && s.open === 0 && s.hours === 0) return <Empty />;

  const team = s.team;
  const tau = team.avgMttr || s.mttr.mean || 1;
  const speed = (m: number | null) => (m == null ? 0 : clamp(100 / (1 + m / tau)));
  const radar = [
    { axis: t.scorecard.axisThroughput, eng: clamp((s.resolved / team.maxResolved) * 100), team: clamp((team.avgResolved / team.maxResolved) * 100) },
    { axis: t.scorecard.axisHours, eng: clamp((s.hours / team.maxHours) * 100), team: clamp((team.avgHours / team.maxHours) * 100) },
    { axis: t.scorecard.axisSpeed, eng: speed(s.mttr.mean), team: speed(team.avgMttr) },
    { axis: t.scorecard.axisQuality, eng: clamp(100 - s.reopenRate), team: clamp(100 - team.avgReopenRate) },
    { axis: t.scorecard.axisPunctuality, eng: clamp(100 - s.overdueRate), team: clamp(100 - team.avgOverdueRate) },
  ];

  const teamHint = t.scorecard.teamHint;
  const monthly = s.monthly.map((b) => ({ label: monthLabel(b.month), resolved: b.resolved, hours: b.hours }));

  const clientCols: Column<{ listName: string; resolved: number; hours: number }>[] = [
    { key: "client", header: t.terms.list, render: (r) => <span className="font-semibold">{r.listName}</span> },
    { key: "resolved", header: t.terms.resolved, align: "right", render: (r) => fmtNum(r.resolved) },
    { key: "hours", header: t.terms.hours, align: "right", render: (r) => fmtNum(r.hours, 1) },
  ];

  return (
    <>
      <div data-noprint>
        <Link href="/usuarios" className="dc-link" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--color-fg-muted)" }}>
          <ChevronLeft style={{ width: 14, height: 14 }} /> {t.scorecard.back}
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={s.username} />
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>{s.username}</h2>
          {s.email ? <div style={{ fontSize: 13, color: "var(--color-fg-muted)" }}>{s.email}</div> : null}
        </div>
      </div>

      <div className="grid kpi-grid">
        <KpiCard label={t.terms.resolved} value={s.resolved} hint={teamHint(fmtNum(team.avgResolved, 1))} />
        <KpiCard label={t.terms.hours} value={fmtNum(s.hours, 1)} unit="h" hint={teamHint(fmtNum(team.avgHours, 1))} />
        <KpiCard label={t.scorecard.hoursPerTask} value={fmtNum(s.hoursPerResolved, 1)} hint={teamHint(fmtNum(team.avgHoursPerResolved, 1))} />
        <KpiCard label={t.overview.mttrMean} value={fmtDur(s.mttr.mean)} hint={teamHint(fmtDur(team.avgMttr))} />
        <KpiCard label={t.overview.mttdMean} value={fmtDur(s.mttd.mean)} />
        <KpiCard label={t.overview.reopenRate} value={`${fmtNum(s.reopenRate, 1)}%`} hint={teamHint(`${fmtNum(team.avgReopenRate, 1)}%`)} />
        <KpiCard label={t.scorecard.overdueRate} value={`${fmtNum(s.overdueRate, 1)}%`} hint={teamHint(`${fmtNum(team.avgOverdueRate, 1)}%`)} />
        <KpiCard label={t.scorecard.clients} value={s.clients} />
      </div>

      <div className="chart-row-eq">
        <RadarCard
          title={t.scorecard.radarTitle}
          data={radar}
          engName={t.scorecard.eng}
          teamName={t.scorecard.teamAvg}
        />
        <BarCard
          title={t.scorecard.monthlyThroughput}
          data={monthly}
          xKey="label"
          bars={[
            { key: "resolved", name: t.terms.resolved, color: "#3daa6e" },
            { key: "hours", name: t.terms.hours, color: "#3466c3" },
          ]}
          height={300}
        />
      </div>

      {s.byClient.length > 0 ? (
        <DataTable title={t.scorecard.byClient} columns={clientCols} rows={s.byClient} />
      ) : null}

      <Card>
        <p style={{ fontSize: 12, color: "var(--color-fg-subtle)" }}>{t.scorecard.caveat}</p>
      </Card>
    </>
  );
}
