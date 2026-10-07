import { notFound } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import { getVerifiedAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verified against the database: exists, admin role, not locked, not revoked.
  const session = await getVerifiedAdmin();
  if (!session) notFound();

  return (
    // The admin uses one plain typeface (Inter) for headings and text alike.
    <div
      className="min-h-screen bg-gray-50 font-sans text-charcoal antialiased md:flex"
      style={{ "--font-display": "var(--font-body)" } as React.CSSProperties}
    >
      <AdminSidebar name={session.name} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-8 sm:pt-10 md:pb-12">{children}</div>
      </main>
    </div>
  );
}
