import { createHmac, timingSafeEqual } from "crypto";

export const AUTH_COOKIE_NAME = "celebra_session";
const secret = process.env.AUTH_TOKEN_SECRET ?? "dev-insecure-secret-change-me";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
};

export function readAuthCookie(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`));
  return match?.[1] ?? null;
}

// ponytail: stateless HMAC-signed token, no session table, no revoke.
export function signToken(payload: AuthUser): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + TTL_MS }),
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token: string): (AuthUser & { exp: number }) | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;

  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AuthUser & {
      exp: number;
    };
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
