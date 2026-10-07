// The owner's private sign-in address. It is not linked anywhere on the site;
// the owner bookmarks it. Set ADMIN_LOGIN_PATH in Vercel (e.g. /medza-desk-4821)
// and redeploy to change it. /admin/login itself answers "page not found".
// Safe to import from middleware (no Node APIs).

const FALLBACK = "/owner-desk";

export function adminLoginPath(): string {
  const raw = (process.env.ADMIN_LOGIN_PATH || "").trim();
  // One path segment of letters, numbers, - or _, never under /admin or /api.
  const clean = raw.replace(/^\/+|\/+$/g, "");
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(clean) || /^(admin|api|book|pay|_next)$/i.test(clean)) {
    return FALLBACK;
  }
  return `/${clean}`;
}
