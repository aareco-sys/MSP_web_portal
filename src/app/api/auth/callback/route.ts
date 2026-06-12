import { NextResponse, type NextRequest } from "next/server";
import {
  getAuthConfig,
  STATE_COOKIE,
  PKCE_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "@/lib/auth/config";
import { exchangeCode, verifyIdToken } from "@/lib/auth/oidc";
import { createSessionToken } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Callback OIDC: valida state, intercambia el code, verifica el id_token y crea la sesión. */
export async function GET(req: NextRequest) {
  const cfg = getAuthConfig();
  const url = new URL(req.url);

  if (url.searchParams.get("error")) {
    return NextResponse.redirect(new URL("/api/auth/login", cfg.baseUrl));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = req.cookies.get(STATE_COOKIE)?.value;
  const verifier = req.cookies.get(PKCE_COOKIE)?.value;

  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    return NextResponse.json({ error: "OAuth state inválido" }, { status: 400 });
  }

  try {
    const idToken = await exchangeCode(cfg, code, verifier);
    const claims = await verifyIdToken(cfg, idToken);
    const session = await createSessionToken(claims, cfg.sessionSecret);

    const res = NextResponse.redirect(new URL("/", cfg.baseUrl));
    res.cookies.set(SESSION_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    res.cookies.delete(STATE_COOKIE);
    res.cookies.delete(PKCE_COOKIE);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de autenticación";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
