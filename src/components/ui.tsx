import { cn } from "@/lib/utils";

export function Card({
  title,
  sub,
  right,
  className,
  bodyClass,
  children,
}: {
  title?: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  bodyClass?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("card", className)}>
      {title || right ? (
        <div className="card__head">
          <div>
            {title ? <div className="card__title">{title}</div> : null}
            {sub ? <div className="card__sub">{sub}</div> : null}
          </div>
          {right}
        </div>
      ) : null}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

/** Compat: título de card suelto (algunas vistas lo usan). */
export function CardTitle({ children }: { children: React.ReactNode }) {
  return <div className="card__title">{children}</div>;
}

type Tone = "green" | "blue" | "amber" | "slate";
const TONE_CLASS: Record<Tone, string> = {
  green: "",
  blue: "kpi__icon--blue",
  amber: "kpi__icon--amber",
  slate: "kpi__icon--slate",
};

export function KpiCard({
  label,
  value,
  unit,
  icon,
  tone = "green",
  hint,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  tone?: Tone;
  hint?: React.ReactNode;
}) {
  return (
    <div className="kpi">
      <div className="kpi__head">
        <span className="kpi__label">{label}</span>
        {icon ? <span className={cn("kpi__icon", TONE_CLASS[tone])}>{icon}</span> : null}
      </div>
      <div className="kpi__value">
        {value}
        {unit ? <span className="unit">{unit}</span> : null}
      </div>
      {hint ? <div className="kpi__hint">{hint}</div> : null}
    </div>
  );
}

/* ---------- Brand chart palette ---------- */
export const CHART = {
  created: "#0e5733",
  resolved: "#3daa6e",
  open: "#d49215",
  hours: "#3466c3",
  mttr: "#c2362f",
  mttd: "#d49215",
} as const;

export const STATUS_TYPE_COLOR: Record<string, string> = {
  open: "#9aa0ad",
  custom: "#d49215",
  done: "#3daa6e",
  closed: "#0e5733",
};

export const PRIORITY_COLOR: Record<string, string> = {
  urgent: "#c2362f",
  high: "#d49215",
  normal: "#3daa6e",
  low: "#b6e4c8",
};

/** Paleta categórica de marca (usuarios/listas). */
export const PALETTE = [
  "#3daa6e",
  "#0e5733",
  "#7ec9a0",
  "#3466c3",
  "#d49215",
  "#1f8a5b",
  "#b6e4c8",
  "#565d6d",
  "#5a86d8",
  "#2ea36a",
  "#d6dae0",
];

/** Color de avatar determinístico a partir de un nombre. */
const AVATAR_COLORS = [
  "#3daa6e",
  "#0e5733",
  "#3466c3",
  "#1f8a5b",
  "#2655a8",
  "#2ea36a",
  "#565d6d",
  "#d49215",
];
export function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 9973;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
export function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

export function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar" style={{ background: avatarColor(name) }}>
      {initials(name) || "—"}
    </span>
  );
}
