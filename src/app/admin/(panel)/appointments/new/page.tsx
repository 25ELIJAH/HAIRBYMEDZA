import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ManualBookingForm from "@/components/ManualBookingForm";
import { todayStr } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: { customer?: string };
}) {
  const [services, customer] = await Promise.all([
    prisma.service.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }] }),
    searchParams.customer && /^[a-z0-9]{8,40}$/i.test(searchParams.customer)
      ? prisma.customer.findUnique({ where: { id: searchParams.customer } })
      : null,
  ]);

  return (
    <div className="max-w-3xl">
      <Link href="/admin/appointments" className="text-sm text-royal-600 hover:underline">
        ← Appointments
      </Link>
      <header className="mb-6 mt-2">
        <h1 className="font-display text-3xl font-bold text-charcoal">Add a booking</h1>
        <p className="mt-1 text-sm text-charcoal-muted">
          For walk-ins, WhatsApp or phone bookings, or to re-enter clients you served before the
          website. Returning clients are matched by phone number automatically.
        </p>
      </header>
      <ManualBookingForm
        services={services.map((s) => ({
          id: s.id,
          name: s.active ? s.name : `${s.name} (hidden)`,
          priceKes: s.priceKes,
          outCallPriceKes: s.outCallPriceKes,
        }))}
        today={todayStr()}
        prefill={
          customer
            ? { name: customer.name, phone: customer.phone, email: customer.email || "" }
            : undefined
        }
      />
    </div>
  );
}
