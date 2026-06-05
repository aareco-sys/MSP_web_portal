import { cn, fmtNum } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
      {children}
    </h3>
  );
}

export function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <div className="text-sm text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">
        {typeof value === "number" ? fmtNum(value) : value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-neutral-400">{hint}</div>
      ) : null}
    </Card>
  );
}

/** Paleta para charts y estados. */
export const PALETTE = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#0d9488",
];

/** Color por tipo de estado de ClickUp. */
export const STATUS_TYPE_COLOR: Record<string, string> = {
  open: "#87909e",
  custom: "#f59e0b",
  done: "#16a34a",
  closed: "#2563eb",
};
