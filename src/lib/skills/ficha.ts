/**
 * Construye la vista de "ficha técnica" (FichaView) a partir de un
 * PersonSkills ya parseado: nivel vigente por skill, colores, radar por área
 * y métricas resumen. Puerto de la lógica del prototipo de Claude Design
 * (Component.person/skill/radarOf en el export .dc.html), adaptado a datos
 * en vivo de Sheets en vez de un snapshot hardcodeado.
 */
import { AREA_GROUPS, formatLevel, levelFill, levelNumColor, normalizeName } from "./catalog";
import type { FichaView, PersonSkills, RadarAxisView, SkillBarView, SkillLevel } from "./types";

/** Nivel vigente: Validación 2026 pisa a Validación cuando existe. */
function currentLevel(s: SkillLevel): number {
  if (s.validated2026 != null) return s.validated2026;
  return s.validated ?? 0;
}

function toBarView(s: SkillLevel): SkillBarView {
  const level = currentLevel(s);
  const validatedBase = s.validated ?? 0;
  const hasDeviation = s.self != null && s.self !== validatedBase;
  return {
    name: s.name,
    level,
    label: formatLevel(level),
    pct: `${(level / 4) * 100}%`,
    fill: levelFill(level),
    numColor: levelNumColor(level),
    // Se muestra uno u otro, nunca ambos (mismo criterio que el prototipo):
    // la nota de la hoja, o la autopercepción cuando diverge de lo validado.
    note: hasDeviation ? "" : s.note,
    selfDeviation: hasDeviation ? (s.self as number) : null,
  };
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function radarOf(all: SkillBarView[]): RadarAxisView[] {
  const byName = new Map(all.map((s) => [normalizeName(s.name), s.level]));
  return AREA_GROUPS.map((group) => {
    const levels = group.skills
      .map((name) => byName.get(normalizeName(name)))
      .filter((v): v is number => v != null);
    const value = levels.length ? levels.reduce((sum, v) => sum + v, 0) / levels.length : 0;
    return { axis: group.key, value };
  });
}

/** Arma la vista completa para render. `axisLabel` traduce la key del área. */
export function buildFicha(person: PersonSkills): FichaView {
  const aws = person.aws.map(toBarView);
  const dev = person.dev.map(toBarView);
  const all = [...aws, ...dev];

  const avg = all.length ? all.reduce((s, x) => s + x.level, 0) / all.length : 0;
  const strongCount = all.filter((x) => x.level >= 3).length;
  const weakCount = all.filter((x) => x.level <= 1).length;

  const radar = radarOf(all);
  const ranked = [...radar].sort((a, b) => b.value - a.value);
  const best = ranked[0] ?? { axis: "", value: 0 };
  const worst = ranked[ranked.length - 1] ?? { axis: "", value: 0 };

  const parts = person.name.trim().split(/\s+/);

  return {
    name: person.name,
    first: parts[0] ?? person.name,
    initials: initialsOf(person.name),
    avg: avg.toFixed(1),
    aws,
    dev,
    certs: person.certs,
    form: person.form,
    radar,
    radarBest: { label: best.axis, value: formatLevel(best.value) },
    radarWorst: { label: worst.axis, value: formatLevel(worst.value) },
    metrics: {
      strongCount,
      totalSkills: all.length,
      certCount: person.certs.length,
      weakCount,
    },
  };
}

/** Busca a la persona de la hoja que corresponde a un username de ClickUp. */
export function findPersonByName(people: PersonSkills[], username: string): PersonSkills | null {
  const target = normalizeName(username);
  return people.find((p) => normalizeName(p.name) === target) ?? null;
}
