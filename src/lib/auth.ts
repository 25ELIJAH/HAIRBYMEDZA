// Admin auth: bcrypt-hashed passwords + a signed JWT in an httpOnly cookie.
// Hardened with a per-account token version (for instant session revocation)
// and an account-lockout check. No external auth provider needed.

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

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
  tv: number; // token version at issue time
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2d") // shorter lifetime limits the blast radius of a stolen cookie
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
      tv: Number(payload.tv ?? 0),
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
    maxAge: 60 * 60 * 24 * 2,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

/** Read + verify the JWT from the request cookies. Fast, no database hit. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Strong admin check for sensitive paths (admin pages + mutations): verifies the
 * JWT, then confirms against the database that the account still exists, has an
 * admin role, is not locked, and the token has not been revoked (tokenVersion).
 */
export async function getVerifiedAdmin(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session || !ADMIN_ROLES.includes(session.role)) return null;
  const user = await prisma.adminUser.findUnique({ where: { id: session.sub } });
  if (!user) return null;
  if (!ADMIN_ROLES.includes(user.role)) return null;
  if (user.tokenVersion !== session.tv) return null; // session revoked
  if (user.lockedUntil && user.lockedUntil > new Date()) return null; // locked
  return session;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
