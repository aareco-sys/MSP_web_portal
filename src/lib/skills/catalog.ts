/**
 * Catálogo fijo de la matriz de skills: qué tecnologías existen, en qué
 * orden se muestran y cómo se agrupan en el radar por área. Es taxonomía de
 * producto (no viene de la hoja) — la hoja solo aporta los niveles.
 */

export const AWS_SKILLS = [
  "EC2",
  "ALB",
  "S3",
  "RDS",
  "Lambda",
  "DynamoDB",
  "ECS",
  "EKS",
  "CloudWatch",
  "IAM",
  "Cost Management",
  "Route 53",
  "CloudFront",
  "WAF",
  "DBMS",
  "Control Tower",
  "AWS Organizations",
] as const;

export const DEV_SKILLS = [
  "IaC",
  "GIT",
  "CI/CD",
  "Linux",
  "Docker",
  "Networking",
  "Infrastructure monitoring",
  "Application monitoring",
  "GitOps",
] as const;

export type AreaKey =
  | "compute"
  | "data"
  | "network"
  | "security"
  | "observability"
  | "automation";

/** Agrupación de las 26 skills en 6 áreas técnicas, para el radar. */
export const AREA_GROUPS: { key: AreaKey; skills: string[] }[] = [
  { key: "compute", skills: ["EC2", "ECS", "EKS", "Lambda"] },
  { key: "data", skills: ["S3", "RDS", "DynamoDB", "DBMS"] },
  { key: "network", skills: ["ALB", "Route 53", "CloudFront", "Networking"] },
  {
    key: "security",
    skills: ["IAM", "WAF", "Control Tower", "AWS Organizations", "Cost Management"],
  },
  {
    key: "observability",
    skills: ["CloudWatch", "Infrastructure monitoring", "Application monitoring"],
  },
  { key: "automation", skills: ["IaC", "GIT", "CI/CD", "Docker", "GitOps", "Linux"] },
];

/** Rampa de color por nivel (0–4): fondo/texto para chips, si se necesitaran. */
export const LEVEL_RAMP = [
  { bg: "#f4f5f7", fg: "#9aa0ad" },
  { bg: "#d8f0e1", fg: "#0e5733" },
  { bg: "#7ec9a0", fg: "#062818" },
  { bg: "#3daa6e", fg: "#ffffff" },
  { bg: "#093921", fg: "#ffffff" },
] as const;

export function levelFill(level: number): string {
  return level >= 3 ? "#093921" : "#3daa6e";
}

export function levelNumColor(level: number): string {
  return level <= 1 ? "#9aa0ad" : "#093921";
}

/** "3" o "3.5" — enteros sin decimales, medios niveles con un decimal. */
export function formatLevel(level: number): string {
  return Number.isInteger(level) ? String(level) : level.toFixed(1);
}

/** Normaliza un nombre para comparar sin importar acentos/mayúsculas/espacios. */
export function normalizeName(raw: string): string {
  return raw
    .replace(/\[merged\]/gi, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
