"use client";

import { Inbox } from "lucide-react";
import { useT } from "@/lib/i18n/context";

export function Loading({ label }: { label?: string }) {
  const t = useT();
  return (
    <div className="loader">
      <div className="spinner" />
      {label ?? t.states.loading}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  const t = useT();
  const isToken = /CLICKUP_TOKEN/i.test(message);
  return (
    <div className="card" style={{ alignItems: "center", textAlign: "center", gap: 8, padding: 48 }}>
      <Inbox className="size-6" style={{ color: "var(--color-danger)" }} />
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{t.states.loadError}</div>
      <div style={{ fontSize: 14, color: "var(--color-fg-muted)", maxWidth: 460 }}>{message}</div>
      {isToken ? (
        <div style={{ fontSize: 12, color: "var(--color-fg-subtle)", maxWidth: 460 }}>
          {t.states.tokenHintPre}
          <code>CLICKUP_TOKEN</code>
          {t.states.tokenHintPost}
        </div>
      ) : null}
    </div>
  );
}

export function Empty({ label }: { label?: string }) {
  const t = useT();
  return (
    <div className="card" style={{ alignItems: "center", textAlign: "center", gap: 10, padding: 48, color: "var(--color-fg-muted)" }}>
      <Inbox className="size-7" style={{ color: "var(--color-fg-subtle)" }} />
      <div style={{ fontSize: 14 }}>{label ?? t.states.empty}</div>
    </div>
  );
}
