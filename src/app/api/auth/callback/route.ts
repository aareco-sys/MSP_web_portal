import { NextResponse, type NextRequest } from "next/server";
import {
  getAuthConfig,
  STATE_COOKIE,
  PKCE_COOKIE,
  SESSION_COOKIE,
  RETRY_COOKIE,
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

  // State ausente/expirado/no coincidente (cookie vieja, login en otra pestaña,
  // o demora > TTL). En vez de trabar al usuario, reintentamos el login UNA vez
  // automaticamente; si vuelve a fallar, mostramos un mensaje claro (sin loop).
  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    const alreadyRetried = req.cookies.get(RETRY_COOKIE)?.value === "1";
    if (!alreadyRetried) {
      const res = NextResponse.redirect(new URL("/api/auth/login", cfg.baseUrl));
      res.cookies.set(RETRY_COOKIE, "1", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 120,
      });
      return res;
    }
    const res = NextResponse.json(
      {
        error:
          "No se pudo iniciar sesión. Probá de nuevo; si persiste, habilitá las cookies del sitio o usá otro navegador.",
      },
      { status: 400 },
    );
    res.cookies.delete(RETRY_COOKIE);
    return res;
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
    res.cookies.delete(RETRY_COOKIE);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de autenticación";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
