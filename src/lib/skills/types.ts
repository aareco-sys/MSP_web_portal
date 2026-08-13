/** Modelo de dominio de la matriz de skills (fichas técnicas). */

export interface SkillLevel {
  name: string;
  /** nivel de autopercepción (columna "Nivel de dominio Autopercepcion"). */
  self: number | null;
  /** nivel validado (columna "Validacion"). */
  validated: number | null;
  /** override vigente si existe (columna "Validación 2026"). */
  validated2026: number | null;
  /** observaciones de la fila (columna "Observaciones"). */
  note: string;
}

/** Una persona tal como viene de la hoja, antes de calcular la vista. */
export interface PersonSkills {
  /** nombre completo, sin el prefijo "[merged] ". */
  name: string;
  aws: SkillLevel[];
  dev: SkillLevel[];
  /** certificaciones obtenidas ("Cloud Practitioner · Foundational", …). */
  certs: string[];
  /** formación / capacitación completada. */
  form: string[];
}

/** Dataset completo, ya parseado, cacheado en memoria. */
export interface SkillsDataset {
  people: PersonSkills[];
  fetchedAt: number;
}

/* ---------- Vista computada (lo que consume la UI) ---------- */

export interface SkillBarView {
  name: string;
  /** nivel vigente (validated2026 ?? validated ?? 0), 0–4. */
  level: number;
  /** "3" o "3.5" para mostrar. */
  label: string;
  pct: string; // "75%"
  fill: string;
  numColor: string;
  /** Observaciones de la hoja; vacío cuando hay autopercepción divergente (ver selfDeviation). */
  note: string;
  /** Autopercepción, solo cuando difiere del nivel validado base (i18n-friendly: es un número, no un string armado). */
  selfDeviation: number | null;
}

export interface RadarAxisView {
  axis: string;
  /** promedio del área, 0–4. */
  value: number;
}

export interface FichaView {
  name: string;
  first: string;
  initials: string;
  avg: string;
  aws: SkillBarView[];
  dev: SkillBarView[];
  certs: string[];
  form: string[];
  radar: RadarAxisView[];
  radarBest: { label: string; value: string };
  radarWorst: { label: string; value: string };
  metrics: {
    strongCount: number;
    totalSkills: number;
    certCount: number;
    weakCount: number;
  };
}
