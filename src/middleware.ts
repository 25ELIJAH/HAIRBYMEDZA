import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-only-insecure-secret"
);
const ADMIN_ROLES = ["OWNER", "ADMIN"];
const isProd = process.env.NODE_ENV === "production";

// Build the Content-Security-Policy. In production we use a per-request nonce
// with 'strict-dynamic' (the strongest practical policy). In development we
// relax script-src so Next.js hot-reload (which uses eval + inline scripts)
// keeps working.
function buildCsp(nonce: string): string {
  const script = isProd
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'`
    : `'self' 'unsafe-inline' 'unsafe-eval'`;
  const connect = isProd
    ? `'self' https://api.web3forms.com`
    : `'self' https://api.web3forms.com ws: wss:`;
  return [
    `default-src 'self'`,
    `script-src ${script}`,
    `style-src 'self' 'unsafe-inline'`, // Tailwind + inline theme styles
    `img-src 'self' data: blob: https:`, // uploads, Unsplash, admin-pasted https images
    `font-src 'self' data:`,
    `connect-src ${connect}`, // booking email goes to Web3Forms from the browser
    `frame-src https://www.google.com https://maps.google.com`, // map embed
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`, // clickjacking protection
    isProd ? `upgrade-insecure-requests` : ``,
  ]
    .filter(Boolean)
    .join("; ");
}

async function isValidAdmin(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret);
    return ADMIN_ROLES.includes(String(payload.role));
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  // ── Auth gates ────────────────────────────────────────────────
  const needsAdmin =
    (pathname.startsWith("/admin") && pathname !== "/admin/login") ||
    pathname.startsWith("/api/admin");

  if (needsAdmin) {
    const ok = await isValidAdmin(req.cookies.get("medz_admin")?.value);
    if (!ok) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Not authorised" }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  // ── CSP (with nonce in production) ────────────────────────────
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  if (isProd) requestHeaders.set("Content-Security-Policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  // Run on everything except static assets and image files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|uploads/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)",
  ],
};
