// Lightweight admin auth: bcrypt-hashed passwords + a signed JWT in an
// httpOnly cookie. No external auth provider needed. Swap for Supabase Auth
// later by replacing these helpers.

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "medz_admin";

// Resolve and validate the signing secret. A weak/missing secret means anyone
// could forge an admin session, so we refuse to run with one in production.
const rawSecret = process.env.AUTH_SECRET || "";
if (process.env.NODE_ENV === "production" && rawSecret.length < 32) {
  throw new Error(
    "AUTH_SECRET is missing or too short. Set a random 32+ character secret " +
      "before running in production (e.g. `openssl rand -base64 48`)."
  );
}
if (process.env.NODE_ENV !== "production" && rawSecret.length < 16) {
  console.warn("[auth] AUTH_SECRET is weak. Generate one: openssl rand -base64 48");
}
const secret = new TextEncoder().encode(rawSecret || "dev-only-insecure-secret");

// Roles permitted into the admin area.
export const ADMIN_ROLES = ["OWNER", "ADMIN"];

export interface SessionPayload {
  sub: string; // admin user id
  name: string;
  email: string;
  role: string;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      sub: String(payload.sub),
      name: String(payload.name),
      email: String(payload.email),
      role: String(payload.role),
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

/** Read + verify the session from the request cookies (server components/routes). */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
