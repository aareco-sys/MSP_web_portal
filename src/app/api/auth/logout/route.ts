import { NextResponse } from "next/server";
import { getAuthConfig, SESSION_COOKIE } from "@/lib/auth/config";
import { logoutUrl } from "@/lib/auth/oidc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cierra sesión: borra la cookie local y redirige al logout de Cognito. */
export function GET() {
  const cfg = getAuthConfig();
  const res = NextResponse.redirect(logoutUrl(cfg));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
