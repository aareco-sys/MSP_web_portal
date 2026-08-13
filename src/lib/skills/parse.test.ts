import { describe, expect, it } from "vitest";
import { parseSkillsSheet } from "./parse";
import { buildFicha, findPersonByName } from "./ficha";
import { AWS_SKILLS, DEV_SKILLS } from "./catalog";

const HEADER = [
  "Colaborador",
  "Type",
  "Tecnology/skill",
  "Subtype",
  "Observaciones",
  "Nivel de dominio Autopercepcion",
  "Validacion",
  "Validación 2026",
  "Conocimiento unico",
];

// Filas representativas del esquema real de la hoja (ver
// docs/google-sheets-setup.md), cubriendo: nivel sin diferencia
// self/validated, autopercepción distinta a lo validado, override
// "Validación 2026", certs, formación y filas que deben ignorarse.
const ROWS = [
  HEADER,
  ["[merged] Ana Test", "TechSkill", "AWS", "EC2", "", "3", "3", "", "No"],
  ["[merged] Ana Test", "", "AWS", "S3", "", "2", "1", "", "No"],
  [
    "[merged] Ana Test",
    "",
    "DevOps/SRE",
    "IaC",
    "terraform/cloudformation",
    "2",
    "2",
    "3",
    "No",
  ],
  ["[merged] Ana Test", "Capacitacion", "Certificacion Associate", "Solutions Architect", "", "", "", "", "TRUE"],
  ["[merged] Ana Test", "Capacitación", "Formación en Agile Management", "", "", "", "", "", "TRUE"],
  ["[merged] Ana Test", "Capacitacion", "GenIA", "XXX", "", "", "", "", "FALSE"],
  ["[merged] Ana Test", "Productividad", "", "", "", "", "", "", ""],
];

describe("parseSkillsSheet", () => {
  it("agrupa las filas por persona y descarta el encabezado", () => {
    const people = parseSkillsSheet(ROWS);
    expect(people).toHaveLength(1);
    expect(people[0].name).toBe("Ana Test"); // sin el prefijo "[merged] "
  });

  it("arma aws[]/dev[] en el orden del catálogo, con niveles crudos", () => {
    const [person] = parseSkillsSheet(ROWS);
    expect(person.aws).toHaveLength(AWS_SKILLS.length);
    expect(person.dev).toHaveLength(DEV_SKILLS.length);

    const ec2 = person.aws.find((s) => s.name === "EC2")!;
    expect(ec2).toMatchObject({ self: 3, validated: 3, validated2026: null });

    const s3 = person.aws.find((s) => s.name === "S3")!;
    expect(s3).toMatchObject({ self: 2, validated: 1, validated2026: null });

    // skill sin fila en la hoja: queda en null, no undefined/crash.
    const rds = person.aws.find((s) => s.name === "RDS")!;
    expect(rds).toMatchObject({ self: null, validated: null, validated2026: null });

    const iac = person.dev.find((s) => s.name === "IaC")!;
    expect(iac).toMatchObject({
      self: 2,
      validated: 2,
      validated2026: 3,
      note: "terraform/cloudformation",
    });
  });

  it("extrae certs y formación solo cuando 'Conocimiento unico' es TRUE", () => {
    const [person] = parseSkillsSheet(ROWS);
    expect(person.certs).toEqual(["Solutions Architect · Associate"]);
    expect(person.form).toEqual(["Agile management"]);
  });
});

describe("buildFicha", () => {
  it("usa Validación 2026 como nivel vigente cuando existe, si no Validacion", () => {
    const [person] = parseSkillsSheet(ROWS);
    const ficha = buildFicha(person);

    const ec2 = ficha.aws.find((s) => s.name === "EC2")!;
    expect(ec2.level).toBe(3); // sin override -> validated

    const iac = ficha.dev.find((s) => s.name === "IaC")!;
    expect(iac.level).toBe(3); // Validación 2026 pisa a Validacion(2)
  });

  it("marca la nota como autopercepción cuando difiere de lo validado", () => {
    const [person] = parseSkillsSheet(ROWS);
    const ficha = buildFicha(person);

    const s3 = ficha.aws.find((s) => s.name === "S3")!;
    expect(s3.level).toBe(1); // usa validated, no self
    expect(s3.selfDeviation).toBe(2);
    expect(s3.note).toBe("");

    const ec2 = ficha.aws.find((s) => s.name === "EC2")!;
    expect(ec2.selfDeviation).toBeNull(); // self === validated -> sin desvío
    expect(ec2.note).toBe(""); // y Observaciones vacío

    const iac = ficha.dev.find((s) => s.name === "IaC")!;
    expect(iac.selfDeviation).toBeNull(); // self === validated (base)
    expect(iac.note).toBe("terraform/cloudformation"); // -> usa Observaciones
  });

  it("agrupa el radar en las 6 áreas técnicas y calcula mejor/peor", () => {
    const [person] = parseSkillsSheet(ROWS);
    const ficha = buildFicha(person);

    expect(ficha.radar).toHaveLength(6);
    const compute = ficha.radar.find((a) => a.axis === "compute")!;
    // EC2=3, ECS/EKS/Lambda sin dato (0) -> promedio 0.75
    expect(compute.value).toBeCloseTo(0.75);

    expect(ficha.radarBest.label).toBe("compute");
    expect(ficha.metrics.totalSkills).toBe(AWS_SKILLS.length + DEV_SKILLS.length);
  });

  it("cuenta certificaciones y skills en nivel 3+ para las métricas", () => {
    const [person] = parseSkillsSheet(ROWS);
    const ficha = buildFicha(person);
    expect(ficha.metrics.certCount).toBe(1);
    // EC2 (3) e IaC (3, por el override 2026) son las únicas en nivel 3+.
    expect(ficha.metrics.strongCount).toBe(2);
  });
});

describe("findPersonByName", () => {
  it("matchea sin importar mayúsculas/acentos/espacios", () => {
    const people = parseSkillsSheet(ROWS);
    expect(findPersonByName(people, "ana   test")).not.toBeNull();
    expect(findPersonByName(people, "ANA TEST")).not.toBeNull();
    expect(findPersonByName(people, "Alguien Más")).toBeNull();
  });
});
