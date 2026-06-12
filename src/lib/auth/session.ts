/**
 * Sesión de usuario como JWT firmado (HS256 con AUTH_SECRET), guardado en una
 * cookie HttpOnly. Verificable sin red (a diferencia del id_token de Cognito,
 * que se valida una sola vez en el callback contra el JWKS).
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { SESSION_TTL_SECONDS } from "./config";

export interface SessionUser {
  sub: string;
  email: string;
  name?: string;
}

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser, secret: string): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key(secret));
}

/** Devuelve el usuario si la cookie de sesión es válida y no expiró; si no, null. */
export async function verifySessionToken(
  token: string | undefined,
  secret: string,
): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"] });
    const p = payload as JWTPayload & { email?: string; name?: string };
    if (!p.sub || !p.email) return null;
    return { sub: p.sub, email: p.email, name: p.name };
  } catch {
    return null;
  }
}
