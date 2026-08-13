/**
 * Parseo de las filas crudas de la hoja "matriz de skills" al modelo de
 * dominio (PersonSkills[]). Columnas esperadas (ver
 * docs/google-sheets-setup.md):
 *
 *   Colaborador | Type | Tecnology/skill | Subtype | Observaciones |
 *   Nivel de dominio Autopercepcion | Validacion | Validación 2026 |
 *   Conocimiento unico
 */
import { AWS_SKILLS, DEV_SKILLS, normalizeName } from "./catalog";
import type { PersonSkills, SkillLevel } from "./types";

const COL = {
  name: 0,
  type: 1,
  category: 2,
  subtype: 3,
  note: 4,
  self: 5,
  validated: 6,
  validated2026: 7,
  hasIt: 8,
} as const;

const CERT_CATEGORY_LEVEL: { match: RegExp; suffix: string }[] = [
  { match: /fundant|fundac|foundation/i, suffix: "Foundational" },
  { match: /associate/i, suffix: "Associate" },
  { match: /pro|specialty/i, suffix: "Professional" },
];

function toNumber(v: unknown): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toBool(v: unknown): boolean {
  return String(v).trim().toUpperCase() === "TRUE";
}

/** "Formación en Habilidades Blandas" -> "Habilidades blandas". */
function sentenceCase(raw: string): string {
  const stripped = raw.replace(/^Formaci[oó]n\s+(en|de)\s+/i, "").trim();
  if (!stripped) return stripped;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1).toLowerCase();
}

/** "SysOps Administrator/Developer" -> "SysOps Administrator / Developer". */
function titleCaseSlashed(raw: string): string {
  return raw
    .split("/")
    .map((part) => {
      const p = part.trim();
      return p.replace(/\b\w/g, (c) => c.toUpperCase());
    })
    .join(" / ");
}

function certLevelSuffix(category: string): string | null {
  const hit = CERT_CATEGORY_LEVEL.find((c) => c.match.test(category));
  return hit?.suffix ?? null;
}

interface RawRow {
  name: string;
  type: string;
  category: string;
  subtype: string;
  note: string;
  self: number | null;
  validated: number | null;
  validated2026: number | null;
  hasIt: boolean;
}

function toRawRow(cells: string[]): RawRow | null {
  const rawName = String(cells[COL.name] ?? "").trim();
  if (!rawName) return null;
  return {
    name: rawName.replace(/\[merged\]/gi, "").trim(),
    type: String(cells[COL.type] ?? "").trim(),
    category: String(cells[COL.category] ?? "").trim(),
    subtype: String(cells[COL.subtype] ?? "").trim(),
    note: String(cells[COL.note] ?? "").trim(),
    self: toNumber(cells[COL.self]),
    validated: toNumber(cells[COL.validated]),
    validated2026: toNumber(cells[COL.validated2026]),
    hasIt: toBool(cells[COL.hasIt]),
  };
}

function buildSkillList(
  catalog: readonly string[],
  rowsByNormalizedSubtype: Map<string, RawRow>,
): SkillLevel[] {
  return catalog.map((name) => {
    const row = rowsByNormalizedSubtype.get(normalizeName(name));
    return {
      name,
      self: row?.self ?? null,
      validated: row?.validated ?? null,
      validated2026: row?.validated2026 ?? null,
      note: row?.note ?? "",
    };
  });
}

/** Parsea el bloque de filas de una persona (ya agrupadas por nombre). */
function buildPerson(name: string, rows: RawRow[]): PersonSkills {
  const awsRows = new Map<string, RawRow>();
  const devRows = new Map<string, RawRow>();
  const certs: string[] = [];
  const form: string[] = [];

  for (const row of rows) {
    const categoryNorm = normalizeName(row.category);
    if (categoryNorm === "aws" && row.subtype) {
      awsRows.set(normalizeName(row.subtype), row);
      continue;
    }
    if (categoryNorm === "devops/sre" && row.subtype) {
      devRows.set(normalizeName(row.subtype), row);
      continue;
    }
    if (!/^capacitaci/i.test(row.type)) continue;
    if (!row.hasIt) continue;

    if (/^certificacion/i.test(row.category) && row.subtype) {
      const level = certLevelSuffix(row.category);
      certs.push(level ? `${titleCaseSlashed(row.subtype)} · ${level}` : titleCaseSlashed(row.subtype));
      continue;
    }
    if (/^gen ?ia$/i.test(row.category)) continue; // placeholder, sin dato real
    if (row.category) form.push(sentenceCase(row.category));
  }

  return {
    name,
    aws: buildSkillList(AWS_SKILLS, awsRows),
    dev: buildSkillList(DEV_SKILLS, devRows),
    certs,
    form,
  };
}

/** Parsea la hoja completa (con fila de encabezados en [0]) a PersonSkills[]. */
export function parseSkillsSheet(rows: string[][]): PersonSkills[] {
  const dataRows = rows.slice(1); // salteá el encabezado
  const byName = new Map<string, RawRow[]>();
  const order: string[] = [];

  for (const cells of dataRows) {
    const row = toRawRow(cells);
    if (!row) continue;
    if (!byName.has(row.name)) {
      byName.set(row.name, []);
      order.push(row.name);
    }
    byName.get(row.name)!.push(row);
  }

  return order.map((name) => buildPerson(name, byName.get(name)!));
}
