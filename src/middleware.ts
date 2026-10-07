import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { adminLoginPath } from "./lib/admin-path";

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
  // The admin is hidden: the sign-in page lives only at the owner's private
  // address, and every /admin page answers "page not found" to anyone who
  // is not signed in, so the site gives no hint that an admin area exists.
  const loginPath = adminLoginPath();
  const isLoginPage = pathname === loginPath;
  const notFound = () => {
    const url = req.nextUrl.clone();
    url.pathname = "/__not-found";
    url.search = "";
    const res = NextResponse.rewrite(url, { status: 404 });
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return res;
  };

  if (pathname === "/admin/login") return notFound();

  const needsAdmin = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const signedIn =
    needsAdmin || isLoginPage ? await isValidAdmin(req.cookies.get("medz_admin")?.value) : false;

  if (needsAdmin && !signedIn) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return notFound();
  }
  // Already signed in: the private address goes straight to the dashboard.
  if (isLoginPage && signedIn && req.method === "GET") {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // ── CSP (with nonce in production) ────────────────────────────
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  if (isProd) requestHeaders.set("Content-Security-Policy", csp);

  // The private address shows the sign-in page without changing the URL.
  const res = isLoginPage
    ? NextResponse.rewrite(new URL("/admin/login", req.url), { request: { headers: requestHeaders } })
    : NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  // Keep the admin area and APIs out of search indexes.
  if (isLoginPage || pathname.startsWith("/admin") || pathname.startsWith("/api")) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return res;
}

export const config = {
  // Run on everything except static assets and image files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|uploads/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)",
  ],
};
