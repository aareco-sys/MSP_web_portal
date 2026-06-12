/**
 * Helpers OIDC para el flujo authorization-code (PKCE) contra el Hosted UI de
 * Cognito. Server-side only (route handlers de /api/auth).
 */
import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AuthConfig } from "./config";

const REDIRECT_PATH = "/api/auth/callback";

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(bytes = 32): string {
  return base64url(randomBytes(bytes));
}

/** PKCE: verifier aleatorio + challenge S256. */
export function pkcePair(): { verifier: string; challenge: string } {
  const verifier = randomToken(32);
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function authorizeUrl(cfg: AuthConfig, state: string, challenge: string): string {
  const u = new URL(`https://${cfg.hostedUiDomain}/oauth2/authorize`);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("redirect_uri", `${cfg.baseUrl}${REDIRECT_PATH}`);
  u.searchParams.set("scope", "openid email profile");
  u.searchParams.set("state", state);
  u.searchParams.set("code_challenge", challenge);
  u.searchParams.set("code_challenge_method", "S256");
  return u.toString();
}

export function logoutUrl(cfg: AuthConfig): string {
  const u = new URL(`https://${cfg.hostedUiDomain}/logout`);
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("logout_uri", cfg.baseUrl);
  return u.toString();
}

interface TokenResponse {
  id_token?: string;
  access_token?: string;
  error?: string;
  error_description?: string;
}

/** Intercambia el authorization code por tokens (Basic auth con el client secret). */
export async function exchangeCode(cfg: AuthConfig, code: string, verifier: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: cfg.clientId,
    code,
    redirect_uri: `${cfg.baseUrl}${REDIRECT_PATH}`,
    code_verifier: verifier,
  });
  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");
  const res = await fetch(`https://${cfg.hostedUiDomain}/oauth2/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${basic}`,
    },
    body,
  });
  const data = (await res.json()) as TokenResponse;
  if (!res.ok || !data.id_token) {
    throw new Error(`Token exchange falló: ${data.error ?? res.status} ${data.error_description ?? ""}`.trim());
  }
  return data.id_token;
}

// Cache del JWKS de Cognito entre requests (la URL es estable por user pool).
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export interface IdClaims {
  sub: string;
  email: string;
  name?: string;
}

/** Valida el id_token contra el JWKS de Cognito (firma + issuer + audience). */
export async function verifyIdToken(cfg: AuthConfig, idToken: string): Promise<IdClaims> {
  if (!jwks) jwks = createRemoteJWKSet(new URL(`${cfg.issuer}/.well-known/jwks.json`));
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: cfg.issuer,
    audience: cfg.clientId,
  });
  const sub = payload.sub;
  const email = (payload as { email?: string }).email;
  const name = (payload as { name?: string }).name;
  if (!sub || !email) throw new Error("id_token sin sub/email.");
  return { sub, email, name };
}
