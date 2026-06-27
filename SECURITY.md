# Security overview

This document summarises the security controls in the Magdalene Medza booking
system and the recommended steps before going to production.

> Note on stack: this app uses a **custom bcrypt + JWT (jose) session in an
> httpOnly cookie** for the single admin account, and **Prisma + SQLite**. It
> does **not** use NextAuth. Bookings are anonymous (no customer accounts).

## What is implemented

### Authentication & authorization
- Admin passwords are hashed with **bcrypt**; plaintext is never stored.
- Session is a signed **JWT (HS256)** stored in an **httpOnly, SameSite=Lax,
  Secure-in-production** cookie. JavaScript cannot read it (mitigates XSS token theft).
- `AUTH_SECRET` is validated at boot: the app **refuses to start in production**
  with a missing/short secret.
- **Middleware** (`src/middleware.ts`) protects `/admin/*` and `/api/admin/*`,
  verifying the JWT signature **and** that the role is in `OWNER`/`ADMIN`.
- Every admin Server Action also calls `requireAdmin()` (defence in depth — a
  request that somehow bypassed middleware is still rejected).
- Login errors are identical for "no such user" and "wrong password" to avoid
  **user enumeration**.

### Input validation & sanitisation
- All external input is parsed with **Zod** (`src/lib/validation.ts`): the public
  booking + availability APIs and every admin form (login, services, settings,
  blocked dates, theme). Zod trims and length-limits values.
- URLs (image links, map pins) are restricted to `https://` or local `/uploads/`,
  blocking `javascript:`/`data:` URLs from being rendered into an `href`.
- **SQL injection** is prevented by Prisma's parameterised queries (no string
  concatenation into SQL).
- **Stored XSS** is mitigated because React escapes all rendered text by default.

### Rate limiting (`src/lib/rate-limit.ts`)
- Login: 6 / account / 10 min **and** 20 / IP / 10 min (brute-force defence).
- Bookings: 8 / IP / 5 min.
- Availability: 60 / IP / min.
- Uploads: 30 / IP / 5 min.

### Bot protection
- The booking form has a hidden **honeypot** field (`company`). Submissions that
  fill it are silently dropped.

### File uploads (`/api/admin/upload`)
- Admin-only. Validates MIME type (jpg/png/webp/gif) and size (max 8 MB).
- Stored with a random UUID filename (no user-controlled paths → no path traversal).

### Security headers
- `src/middleware.ts` sets a **Content-Security-Policy**. Production uses a
  per-request **nonce** with `strict-dynamic`; development relaxes `script-src`
  so hot-reload works. CSP also sets `frame-ancestors 'none'` (clickjacking),
  `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`.
- `next.config.mjs` sets `X-Frame-Options`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `Permissions-Policy`, and `Strict-Transport-Security`.
- `poweredByHeader` is disabled (no `X-Powered-By` leak).

### CSRF
- Next.js Server Actions are CSRF-resistant: they require a POST with the action
  id and Next verifies the `Origin`/`Host` for actions. The session cookie is
  `SameSite=Lax`, which blocks cross-site form posts. The JSON booking API only
  accepts `application/json` bodies (not a simple cross-site form post).

## Before production — checklist
1. **Set a strong `AUTH_SECRET`** (`openssl rand -base64 48`).
2. **Change the seeded admin password** and use a unique passphrase.
3. **Move to Postgres** (Supabase/Neon/RDS) and set `DATABASE_URL` with TLS;
   change the Prisma provider to `postgresql`.
4. **Back the rate limiter with Redis/Upstash** — the in-memory limiter only
   works per process and resets on deploy (fine for a single instance).
5. **Persist uploads** to object storage (S3/Supabase Storage) if hosting on a
   serverless/ephemeral filesystem (Vercel) — `public/uploads` is not durable there.
6. **Serve over HTTPS** so `Secure` cookies + HSTS take effect.
7. **Logging/monitoring**: send `console.error` to a sink (Sentry/Logtail) and
   alert on repeated 401/429s.
8. **CORS**: keep the API same-origin. If you must allow another origin, gate it
   explicitly via `ALLOWED_ORIGINS` rather than `*`.
9. **Dependencies**: run `npm audit` and keep Next.js/Prisma patched.
10. **Backups**: schedule regular database backups.
