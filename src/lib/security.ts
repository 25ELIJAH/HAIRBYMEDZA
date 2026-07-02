import { NextRequest, NextResponse } from "next/server";

/**
 * CSRF defence for JSON API routes. Browsers always attach an Origin header to
 * cross-origin (and same-origin non-GET) fetches, so a state-changing request
 * whose Origin does not match our host, or that has no Origin/Referer at all, is
 * rejected. Server Actions already have their own CSRF protection.
 */
export function sameOrigin(req: NextRequest): boolean {
  const host = req.headers.get("host");
  if (!host) return false;

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  // A state-changing request with neither Origin nor Referer is suspicious.
  return false;
}

/** Returns a 403 response when the request is not same-origin, otherwise null. */
export function requireSameOrigin(req: NextRequest): NextResponse | null {
  if (sameOrigin(req)) return null;
  return NextResponse.json(
    { error: "Request blocked." },
    { status: 403, headers: { "Cache-Control": "no-store" } }
  );
}
