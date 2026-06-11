import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prototipo de diseño (referencia, no es código de la app).
    "design_handoff_msp_portal_redesign/**",
    // Config de tooling Node (CommonJS) — no es código de la app.
    "ecosystem.config.cjs",
  ]),
]);

export default eslintConfig;
