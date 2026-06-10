"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Card } from "./ui";
import { useT } from "@/lib/i18n/context";
import type { InProgressTask } from "@/lib/rex";

export function RexInProgress({
  count,
  tasks,
}: {
  count: number;
  tasks: InProgressTask[];
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const name = (a: string) => (a === "__unassigned" ? t.terms.unassigned : a);

  const moreBtn = (
    <button
      type="button"
      className="btn btn--ghost"
      onClick={() => setOpen((o) => !o)}
      disabled={tasks.length === 0}
    >
      {open ? <ChevronUp /> : <ChevronDown />}
      {open ? t.rex.less : t.rex.more}
    </button>
  );

  return (
    <Card title={t.rex.inProgressTitle} right={moreBtn}>
      <div className="kpi__value" style={{ color: "#D49215" }}>
        {count}
      </div>
      <div className="kpi__hint" style={{ marginTop: 4 }}>
        {t.rex.inProgressHint(String(count))}
      </div>

      <ul
        className="rex-ip-detail"
        style={{
          listStyle: "none",
          margin: "16px 0 0",
          padding: 0,
          display: open ? "flex" : "none",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {tasks.map((task) => (
            <li
              key={task.id}
              style={{ borderTop: "1px solid var(--color-border)", paddingTop: 10 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="dot" style={{ background: "#D49215" }} />
                <a
                  href={task.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontWeight: 600, color: "var(--color-fg)", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  {task.name}
                  <ExternalLink style={{ width: 12, height: 12, opacity: 0.5 }} />
                </a>
                <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-fg-muted)" }}>
                  {name(task.assignee)}
                </span>
              </div>

              {task.subtasks.length > 0 ? (
                <ul style={{ listStyle: "none", margin: "8px 0 0 18px", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  {task.subtasks.map((s) => (
                    <li key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                      <span className="dot" style={{ background: s.statusColor }} />
                      <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-fg)" }}>
                        {s.name}
                      </a>
                      <span className="badge badge--slate" style={{ fontSize: 10 }}>{s.status}</span>
                      <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-fg-subtle)" }}>
                        {name(s.assignee)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ margin: "6px 0 0 18px", fontSize: 12, color: "var(--color-fg-subtle)" }}>
                  {t.rex.noSubtasks}
                </div>
              )}
            </li>
          ))}
      </ul>
    </Card>
  );
}
