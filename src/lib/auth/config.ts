/**
 * Configuración de autenticación (Cognito OIDC). Todo desde env — nunca se
 * hardcodean secretos (política DinoCloud). En prod se inyectan desde Secrets
 * Manager (AUTH_SECRET, COGNITO_CLIENT_SECRET) y env de App Runner (el resto).
 *
 * Solo se importa desde código server-side (proxy + route handlers de /api/auth).
 */

export interface AuthConfig {
  /** Dominio Hosted UI de Cognito, ej: msp-portal-123.auth.us-east-1.amazoncognito.com */
  hostedUiDomain: string;
  clientId: string;
  clientSecret: string;
  /** Issuer del user pool: https://cognito-idp.<region>.amazonaws.com/<poolId> */
  issuer: string;
  /** Base URL pública de la app (sin trailing slash), ej: https://xxx.awsapprunner.com */
  baseUrl: string;
  /** Secreto para firmar la cookie de sesión (HS256). */
  sessionSecret: string;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name} (auth).`);
  return v;
}

/** Config de auth. Lanza si falta algo (solo cuando la auth está habilitada). */
export function getAuthConfig(): AuthConfig {
  return {
    hostedUiDomain: required("COGNITO_HOSTED_UI_DOMAIN"),
    clientId: required("COGNITO_CLIENT_ID"),
    clientSecret: required("COGNITO_CLIENT_SECRET"),
    issuer: required("COGNITO_ISSUER"),
    baseUrl: required("AUTH_URL").replace(/\/+$/, ""),
    sessionSecret: required("AUTH_SECRET"),
  };
}

/** ¿Está habilitada la auth? Permite correr local sin Cognito (AUTH_DISABLED=1). */
export function isAuthEnabled(): boolean {
  return process.env.AUTH_DISABLED !== "1" && !!process.env.COGNITO_CLIENT_ID;
}

export const SESSION_COOKIE = "msp_session";
export const STATE_COOKIE = "msp_oauth_state";
export const PKCE_COOKIE = "msp_oauth_pkce";
export const RETRY_COOKIE = "msp_oauth_retry";
export const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 h (cubre la ventana de servicio)
export const STATE_TTL_SECONDS = 30 * 60; // 30 min para completar el login (MFA lento / setup inicial)

/** Rutas accesibles sin sesión. */
export const PUBLIC_PATHS = ["/api/health", "/api/auth/login", "/api/auth/callback", "/api/auth/logout"];

/** Rutas que el warm-up puede tocar con el header x-warmup-token. */
export const WARMUP_PATHS = ["/api/metrics", "/api/rex"];
