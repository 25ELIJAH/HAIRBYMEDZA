import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
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
      <Link href="/admin/appointments" className="text-sm font-medium text-charcoal-muted hover:text-charcoal">
        Bookings
      </Link>
      <PageHeader
        title="Add a booking"
        subtitle="Walk-ins, phone bookings and past clients."
      />
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
