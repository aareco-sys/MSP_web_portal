/**
 * Configuración de acceso a ClickUp. Todo viene de variables de entorno —
 * NUNCA se hardcodean tokens (política DinoCloud). En prod los valores se
 * inyectan desde AWS Secrets Manager.
 *
 * Este módulo se importa solo desde código server-side (route handlers,
 * server components, scripts CLI y tests); el token nunca llega al browser.
 */

export interface ClickUpConfig {
  token: string;
  /** team/workspace id (para /team/{id}/time_entries). */
  teamId: string;
  /** space id del espacio MSP. */
  spaceId: string;
  /** Carpetas a incluir (clientes activos: Latam + US). */
  activeFolderIds: string[];
  /** Concurrencia de llamadas a la API. */
  concurrency: number;
  /** TTL de la caché en memoria (segundos). */
  cacheTtlSeconds: number;
}

function envList(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Lee y valida la config. Lanza si falta el token (solo cuando se va a usar). */
export function getClickUpConfig(): ClickUpConfig {
  const token = process.env.CLICKUP_TOKEN;
  if (!token) {
    throw new Error(
      "Falta CLICKUP_TOKEN. Definilo en .env (local) o Secrets Manager (prod).",
    );
  }
  return {
    token,
    teamId: process.env.CLICKUP_TEAM_ID ?? "3016250",
    spaceId: process.env.CLICKUP_SPACE_ID ?? "90020465072",
    // MSP Latam clients (90021032350) + MSP US clients (90179149892)
    activeFolderIds: envList("CLICKUP_ACTIVE_FOLDER_IDS", [
      "90021032350",
      "90179149892",
    ]),
    concurrency: Number(process.env.CLICKUP_CONCURRENCY ?? "16"),
    cacheTtlSeconds: Number(process.env.MSP_CACHE_TTL ?? "1800"),
  };
}

export const CLICKUP_API = "https://api.clickup.com/api/v2";
