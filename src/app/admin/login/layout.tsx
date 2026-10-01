// Rendered per request so the login page's scripts get the CSP nonce. A
// statically pre-rendered page has no nonce, so the browser blocks its JavaScript.
export const dynamic = "force-dynamic";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
