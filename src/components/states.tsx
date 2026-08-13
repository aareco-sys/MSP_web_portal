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

/** Nombre de env var faltante mencionado en el mensaje (CLICKUP_TOKEN,
 * GOOGLE_SERVICE_ACCOUNT_EMAIL, etc.), si lo hay. */
function missingEnvVar(message: string): string | null {
  return message.match(/[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+/)?.[0] ?? null;
}

export function ErrorState({ message }: { message: string }) {
  const t = useT();
  const envVar = missingEnvVar(message);
  return (
    <div className="card" style={{ alignItems: "center", textAlign: "center", gap: 8, padding: 48 }}>
      <Inbox className="size-6" style={{ color: "var(--color-danger)" }} />
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{t.states.loadError}</div>
      <div style={{ fontSize: 14, color: "var(--color-fg-muted)", maxWidth: 460 }}>{message}</div>
      {envVar ? (
        <div style={{ fontSize: 12, color: "var(--color-fg-subtle)", maxWidth: 460 }}>
          {t.states.tokenHintPre}
          <code>{envVar}</code>
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
