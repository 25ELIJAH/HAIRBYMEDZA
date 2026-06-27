// Tiny in-memory rate limiter (per IP + bucket). Good enough for a single
// instance. For multi-instance / serverless hosting, back this with
// Redis / Upstash (see SECURITY.md) — an in-memory map is per-process only.

import { NextResponse } from "next/server";

interface Entry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Entry>();

// Occasionally sweep expired entries so the map can't grow forever.
function sweep(now: number) {
  if (buckets.size < 500) return;
  for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  sweep(now);
  const entry = buckets.get(key);

  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (entry.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true, retryAfter: 0 };
}

/** Best-effort client IP from common proxy headers. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Convenience guard for route handlers. Returns a ready-to-send 429 response
 * when the limit is exceeded, or null when the request may proceed.
 *
 *   const blocked = guard(req, "book", 8, 5 * 60_000);
 *   if (blocked) return blocked;
 */
export function guard(
  req: Request,
  bucket: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const { ok, retryAfter } = rateLimit(`${bucket}:${clientIp(req)}`, limit, windowMs);
  if (ok) return null;
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "Cache-Control": "no-store",
      },
    }
  );
}
