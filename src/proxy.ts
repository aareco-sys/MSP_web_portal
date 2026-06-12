/**
 * Proxy (ex-middleware en Next 16): protege TODAS las rutas. Sin sesión válida,
 * las páginas redirigen al login de Cognito y las APIs devuelven 401.
 * Excepciones: /api/health, /api/auth/* y el warm-up interno (header secreto).
 */
import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";
import { SESSION_COOKIE, PUBLIC_PATHS, WARMUP_PATHS, isAuthEnabled } from "@/lib/auth/config";

export async function proxy(req: NextRequest) {
  if (!isAuthEnabled()) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Rutas públicas (health + flujo de auth).
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  // Warm-up interno: la Lambda manda x-warmup-token para precalentar las cachés.
  const warmupToken = process.env.WARMUP_TOKEN;
  if (
    warmupToken &&
    WARMUP_PATHS.includes(pathname) &&
    req.headers.get("x-warmup-token") === warmupToken
  ) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  const user = secret
    ? await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value, secret)
    : null;
  if (user) return NextResponse.next();

  // No autenticado.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/api/auth/login", req.url));
}

export const config = {
  // Corre en todo menos estáticos/assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|woff2?|ttf)$).*)",
  ],
};
