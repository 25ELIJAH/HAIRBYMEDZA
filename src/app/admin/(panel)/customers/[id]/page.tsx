import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CustomerForm } from "@/components/CustomerTools";
import { formatPhone } from "@/lib/phone";
import { formatKes, minutesToLabel, shortDate } from "@/lib/time";

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

  const since = c.createdAt.toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi", month: "short", year: "numeric" });
  const statusText: Record<string, string> = {
    PENDING: "Pending",
    CONFIRMED: "Confirmed",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };

  return (
    <div>
      <Link href="/admin/customers" className="text-sm font-medium text-charcoal-muted hover:text-charcoal">
        Clients
      </Link>
      <div className="mb-5 mt-2 sm:mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-charcoal sm:text-2xl">{c.name}</h1>
        <p className="mt-0.5 text-[13px] text-charcoal-muted sm:text-sm">
          {formatPhone(c.phone)}
          {c.email ? ` · ${c.email}` : ""} · since {since}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="btn-outline !px-4 !py-2.5 text-sm">
            WhatsApp
          </a>
          <Link href={`/admin/appointments/new?customer=${c.id}`} className="btn-primary !px-4 !py-2.5 text-sm">
            New booking
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200">
        <Stat label="Bookings" value={String(honored.length)} />
        <Stat label="Completed" value={String(completed)} />
        <Stat label="Paid" value={formatKes(paid)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-charcoal">History</h2>
            <Link
              href={`/admin/appointments?filter=all&q=${encodeURIComponent(c.phone.slice(-9))}`}
              className="text-sm font-medium text-royal-700"
            >
              Manage
            </Link>
          </div>
          {c.appointments.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-charcoal-muted">No bookings yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {c.appointments.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-charcoal">{a.service.name}</p>
                    <p className="text-[13px] text-charcoal-muted">
                      {shortDate(a.date)}, {minutesToLabel(a.startMin)} · {a.serviceType === "OUTCALL" ? "Home" : "Studio"}
                    </p>
                    <p className="text-xs text-charcoal-muted">{statusText[a.status] || a.status}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-charcoal">{formatKes(a.priceKes)}</p>
                    <p className={`text-xs ${a.amountPaid >= a.priceKes ? "text-emerald-700" : "text-charcoal-muted"}`}>
                      {a.amountPaid >= a.priceKes ? "Paid" : a.amountPaid > 0 ? `Paid ${formatKes(a.amountPaid)}` : "Not paid"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="h-fit rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-semibold text-charcoal">Details</h2>
          <CustomerForm customer={{ id: c.id, name: c.name, phone: c.phone, email: c.email, notes: c.notes }} />
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-3.5 sm:p-5">
      <p className="text-xs text-charcoal-muted">{label}</p>
      <p className="mt-1 truncate text-base font-semibold tabular-nums text-charcoal sm:text-2xl">{value}</p>
    </div>
  );
}
