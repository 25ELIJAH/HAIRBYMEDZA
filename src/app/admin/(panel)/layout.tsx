import { redirect } from "next/navigation";
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
  if (!session) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-lavender-50 md:flex">
      <AdminSidebar name={session.name} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
