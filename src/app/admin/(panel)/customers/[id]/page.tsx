import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CustomerForm } from "@/components/CustomerTools";
import { PaymentBadge, StatusBadge, TypeBadge } from "@/components/StatusBadge";
import { formatPhone } from "@/lib/phone";
import { formatKes, minutesToLabel, prettyDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function CustomerPage({ params }: { params: { id: string } }) {
  if (!/^[a-z0-9]{8,40}$/i.test(params.id)) notFound();
  const c = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      appointments: {
        include: { service: true, payments: { where: { status: "SUCCESS" } } },
        orderBy: [{ date: "desc" }, { startMin: "desc" }],
      },
    },
  });
  if (!c) notFound();

  const honored = c.appointments.filter((a) => a.status !== "CANCELLED");
  const paid = c.appointments.reduce((s, a) => s + a.amountPaid, 0);
  const completed = c.appointments.filter((a) => a.status === "COMPLETED").length;
  const wa = c.phone.replace(/[^0-9]/g, "");

  return (
    <div>
      <Link href="/admin/customers" className="text-sm text-royal-600 hover:underline">
        ← Customers
      </Link>
      <header className="mb-6 mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-charcoal">{c.name}</h1>
          <p className="mt-1 text-sm text-charcoal-muted">
            {formatPhone(c.phone)}
            {c.email ? ` · ${c.email}` : ""} · client since{" "}
            {c.createdAt.toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="btn-outline !px-4 !py-2 text-sm">
            WhatsApp
          </a>
          <Link href={`/admin/appointments/new?customer=${c.id}`} className="btn-primary !px-4 !py-2 text-sm">
            + New booking
          </Link>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Stat label="Bookings" value={String(honored.length)} />
        <Stat label="Completed" value={String(completed)} />
        <Stat label="Total paid" value={formatKes(paid)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="card p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">Booking history</h2>
          {c.appointments.length === 0 ? (
            <p className="py-6 text-center text-sm text-charcoal-muted">No bookings yet.</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {c.appointments.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-2 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-charcoal">{a.service.name}</p>
                    <p className="text-xs text-charcoal-muted">
                      {prettyDate(a.date)} · {minutesToLabel(a.startMin)} · {formatKes(a.priceKes)}
                      {a.amountPaid > 0 ? ` · paid ${formatKes(a.amountPaid)}` : ""}
                      {a.payments.some((p) => p.receiptNumber)
                        ? ` · ${a.payments.map((p) => p.receiptNumber).filter(Boolean).join(", ")}`
                        : ""}
                    </p>
                  </div>
                  <TypeBadge type={a.serviceType} />
                  <StatusBadge status={a.status} />
                  <PaymentBadge status={a.paymentStatus} />
                </li>
              ))}
            </ul>
          )}
          <Link
            href={`/admin/appointments?filter=all&q=${encodeURIComponent(c.phone.slice(-9))}`}
            className="mt-3 inline-block text-sm text-royal-600 hover:underline"
          >
            Manage these bookings →
          </Link>
        </section>
        <section className="card h-fit p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">Client details</h2>
          <CustomerForm customer={{ id: c.id, name: c.name, phone: c.phone, email: c.email, notes: c.notes }} />
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-charcoal-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-charcoal">{value}</p>
    </div>
  );
}
