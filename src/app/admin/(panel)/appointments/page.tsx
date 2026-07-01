import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AppointmentCard, { ApptData } from "@/components/AppointmentCard";
import { todayStr } from "@/lib/time";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "PENDING", label: "Pending" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "all", label: "All" },
];

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: { filter?: string; date?: string };
}) {
  const filter = searchParams.filter || "upcoming";
  const today = todayStr();

  let where: any = {};
  if (filter === "upcoming") {
    where = { date: { gte: today }, status: { in: ["PENDING", "CONFIRMED"] } };
  } else if (["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"].includes(filter)) {
    where = { status: filter };
  }
  if (searchParams.date) where.date = searchParams.date;

  const appts = await prisma.appointment.findMany({
    where,
    include: { customer: true, service: true },
    orderBy: [{ date: filter === "COMPLETED" || filter === "CANCELLED" ? "desc" : "asc" }, { startMin: "asc" }],
    take: 100,
  });

  const data: ApptData[] = appts.map((a) => ({
    id: a.id,
    date: a.date,
    startMin: a.startMin,
    endMin: a.endMin,
    status: a.status,
    paymentStatus: a.paymentStatus,
    serviceType: a.serviceType,
    priceKes: a.priceKes,
    amountPaid: a.amountPaid,
    mpesaNumber: a.mpesaNumber,
    mpesaMessage: a.mpesaMessage,
    notes: a.notes,
    estate: a.estate,
    houseNumber: a.houseNumber,
    landmark: a.landmark,
    mapsPin: a.mapsPin,
    travelNotes: a.travelNotes,
    customerName: a.customer.name,
    customerPhone: a.customer.phone,
    customerEmail: a.customer.email,
    serviceName: a.service.name,
  }));

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-charcoal">Appointments</h1>
        <p className="mt-1 text-sm text-charcoal-muted">
          Confirm, complete, cancel and track payments.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/appointments?filter=${f.key}`}
            className={`badge ring-1 transition ${
              filter === f.key
                ? "bg-royal-600 text-white ring-royal-600"
                : "bg-white text-charcoal-muted ring-black/10 hover:ring-royal-300"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {data.length === 0 ? (
        <div className="card p-10 text-center text-charcoal-muted">
          No appointments in this view.
        </div>
      ) : (
        <div className="grid gap-4">
          {data.map((a) => (
            <AppointmentCard key={a.id} appt={a} />
          ))}
        </div>
      )}
    </div>
  );
}
