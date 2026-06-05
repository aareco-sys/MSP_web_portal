"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { Card } from "./ui";
import { useT } from "@/lib/i18n/context";

export function Loading({ label }: { label?: string }) {
  const t = useT();
  return (
    <Card className="flex items-center justify-center gap-3 py-16 text-neutral-500">
      <Loader2 className="size-5 animate-spin" />
      {label ?? t.states.loading}
    </Card>
  );
}

export function ErrorState({ message }: { message: string }) {
  const t = useT();
  const isToken = /CLICKUP_TOKEN/i.test(message);
  return (
    <Card className="flex flex-col items-center gap-2 border-red-200 py-12 text-center dark:border-red-900/50">
      <AlertTriangle className="size-6 text-red-500" />
      <div className="font-medium">{t.states.loadError}</div>
      <div className="max-w-md text-sm text-neutral-500">{message}</div>
      {isToken ? (
        <div className="mt-2 max-w-md text-xs text-neutral-400">
          {t.states.tokenHintPre}
          <code>CLICKUP_TOKEN</code>
          {t.states.tokenHintPost}
        </div>
      ) : null}
    </Card>
  );
}

export function Empty({ label }: { label?: string }) {
  const t = useT();
  return (
    <Card className="py-12 text-center text-sm text-neutral-500">
      {label ?? t.states.empty}
    </Card>
  );
}
