/**
 * Configuración de acceso a Google Sheets (matriz de skills / fichas
 * técnicas). Todo viene de variables de entorno — NUNCA se hardcodean
 * credenciales (política DinoCloud). En prod los valores se inyectan desde
 * AWS Secrets Manager. Ver docs/google-sheets-setup.md.
 *
 * Este módulo se importa solo desde código server-side; la private key nunca
 * llega al browser.
 */

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  serviceAccountEmail: string;
  privateKey: string;
  /** Rango A1 (hoja + columnas) de la matriz de skills. */
  range: string;
  /** TTL de la caché en memoria (segundos). */
  cacheTtlSeconds: number;
}

/** Lee y valida la config. Lanza si falta algo (solo cuando se va a usar). */
export function getGoogleSheetsConfig(): GoogleSheetsConfig {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!spreadsheetId || !serviceAccountEmail || !rawKey) {
    throw new Error(
      "Falta configuración de Google Sheets (GOOGLE_SHEETS_SPREADSHEET_ID / " +
        "GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY). " +
        "Definilos en .env (local) o Secrets Manager (prod) — ver docs/google-sheets-setup.md.",
    );
  }
  return {
    spreadsheetId,
    serviceAccountEmail,
    // .env guarda la key con \n literales (escapados); Secrets Manager la
    // guarda con saltos de línea reales, así que el replace es un no-op ahí.
    privateKey: rawKey.replace(/\\n/g, "\n"),
    range: process.env.GOOGLE_SHEETS_SKILLS_RANGE ?? "Hoja 1!A:I",
    cacheTtlSeconds: Number(process.env.SKILLS_CACHE_TTL ?? "1800"),
  };
}
