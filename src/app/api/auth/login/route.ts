import { NextResponse } from "next/server";
import { getAuthConfig, STATE_COOKIE, PKCE_COOKIE } from "@/lib/auth/config";
import { authorizeUrl, pkcePair, randomToken } from "@/lib/auth/oidc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Inicia el flujo OIDC: setea state + PKCE y redirige al Hosted UI de Cognito. */
export function GET() {
  const cfg = getAuthConfig();
  const state = randomToken(16);
  const { verifier, challenge } = pkcePair();

  const res = NextResponse.redirect(authorizeUrl(cfg, state, challenge));
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600, // 10 min para completar el login
  };
  res.cookies.set(STATE_COOKIE, state, opts);
  res.cookies.set(PKCE_COOKIE, verifier, opts);
  return res;
}
