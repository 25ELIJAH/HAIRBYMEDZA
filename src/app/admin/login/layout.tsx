// Rendered per request so the login page's scripts get the CSP nonce. A
// statically pre-rendered page has no nonce, so the browser blocks its JavaScript.
export const dynamic = "force-dynamic";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  // Same typeface as the rest of the admin.
  return (
    <div
      className="font-sans"
      style={{ "--font-display": "var(--font-admin)", "--font-body": "var(--font-admin)" } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
