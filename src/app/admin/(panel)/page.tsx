import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/booking";
import { StatusBadge, TypeBadge } from "@/components/StatusBadge";
import { formatKes, minutesToLabel, prettyDate, todayStr } from "@/lib/time";

export const dynamic = "force-dynamic";

const ACTIVE = ["PENDING", "CONFIRMED", "COMPLETED"];

export default async function DashboardPage() {
  const today = todayStr();
  const settings = await getSettings();

  // Revenue is recognised when a booking is marked completed, so the windows
  // below count by completedAt, not the scheduled date.
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const startOfMonth = new Date(startOfToday);
  startOfMonth.setDate(startOfMonth.getDate() - 29);
  const completedRevenue = (gte: Date) =>
    prisma.appointment.aggregate({
      _sum: { priceKes: true },
      where: { status: "COMPLETED", completedAt: { gte } },
    });

  const [
    todays,
    todayRev,
    weekRev,
    monthRev,
    pending,
    upcoming,
    completedCount,
    customerCount,
    todayHours,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: { date: today, status: { in: ACTIVE } },
      include: { customer: true, service: true },
      orderBy: { startMin: "asc" },
    }),
    completedRevenue(startOfToday),
    completedRevenue(startOfWeek),
    completedRevenue(startOfMonth),
    prisma.appointment.findMany({
      where: { status: "PENDING", date: { gte: today } },
      include: { customer: true, service: true },
      orderBy: [{ date: "asc" }, { startMin: "asc" }],
      take: 6,
    }),
    prisma.appointment.findMany({
      where: { date: { gte: today }, status: { in: ["PENDING", "CONFIRMED"] } },
      include: { customer: true, service: true },
      orderBy: [{ date: "asc" }, { startMin: "asc" }],
      take: 8,
    }),
    prisma.appointment.count({ where: { status: "COMPLETED" } }),
    prisma.customer.count(),
    prisma.workingHours.findUnique({
      where: { dayOfWeek: new Date().getDay() },
    }),
  ]);

  const todayRevenue = todayRev._sum.priceKes ?? 0;
  const weekRevenue = weekRev._sum.priceKes ?? 0;
  const monthRevenue = monthRev._sum.priceKes ?? 0;

  // Occupancy for today = booked service minutes / available minutes.
  let occupancy = 0;
  if (todayHours?.isOpen) {
    let avail = todayHours.endMin - todayHours.startMin;
    if (todayHours.lunchStartMin != null && todayHours.lunchEndMin != null) {
      avail -= todayHours.lunchEndMin - todayHours.lunchStartMin;
    }
    const booked = todays.reduce((s, a) => s + (a.endMin - a.startMin), 0);
    occupancy = avail > 0 ? Math.min(100, Math.round((booked / avail) * 100)) : 0;
  }

  return (
    <div>
      <header className="mb-6">
        <p className="eyebrow">{prettyDate(today)}</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-charcoal">Dashboard</h1>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Today's appointments" value={String(todays.length)} accent />
        <Stat label="Today's revenue" value={formatKes(todayRevenue)} />
        <Stat label="This week" value={formatKes(weekRevenue)} />
        <Stat label="This month" value={formatKes(monthRevenue)} />
        <Stat label="Pending requests" value={String(pending.length)} />
        <Stat label="Completed (all time)" value={String(completedCount)} />
        <Stat label="Customers" value={String(customerCount)} />
        <Stat label="Today's occupancy" value={`${occupancy}%`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Today's schedule */}
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Today's schedule</h2>
            <Link href="/admin/appointments" className="text-sm font-medium text-royal-600 hover:underline">
              View all →
            </Link>
          </div>
          {todays.length === 0 ? (
            <Empty text="No appointments today. Enjoy the quiet day." />
          ) : (
            <ul className="divide-y divide-black/5">
              {todays.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <div className="w-16 shrink-0 text-sm font-semibold text-royal-600">
                    {minutesToLabel(a.startMin)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-charcoal">{a.customer.name}</p>
                    <p className="truncate text-xs text-charcoal-muted">{a.service.name}</p>
                  </div>
                  <TypeBadge type={a.serviceType} />
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pending requests */}
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Pending requests</h2>
            <span className="badge bg-amber-100 text-amber-700">{pending.length} to review</span>
          </div>
          {pending.length === 0 ? (
            <Empty text="Nothing pending. You are all caught up." />
          ) : (
            <ul className="divide-y divide-black/5">
              {pending.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-charcoal">{a.customer.name}</p>
                    <p className="truncate text-xs text-charcoal-muted">
                      {a.service.name} · {prettyDate(a.date)} · {minutesToLabel(a.startMin)}
                    </p>
                  </div>
                  <Link
                    href="/admin/appointments"
                    className="btn-outline !px-3 !py-1.5 text-xs"
                  >
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Upcoming */}
      <section className="mt-6 card p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">Upcoming bookings</h2>
        {upcoming.length === 0 ? (
          <Empty text="No upcoming bookings yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-charcoal-muted">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Client</th>
                  <th className="py-2 pr-4">Service</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((a) => (
                  <tr key={a.id} className="border-t border-black/5">
                    <td className="py-2.5 pr-4 text-charcoal-muted">{a.date}</td>
                    <td className="py-2.5 pr-4 font-medium">{minutesToLabel(a.startMin)}</td>
                    <td className="py-2.5 pr-4">{a.customer.name}</td>
                    <td className="py-2.5 pr-4">{a.service.name}</td>
                    <td className="py-2.5 pr-4"><TypeBadge type={a.serviceType} /></td>
                    <td className="py-2.5 pr-4"><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`card p-4 ${accent ? "bg-royal-gradient text-white" : ""}`}>
      <p className={`text-xs uppercase tracking-wide ${accent ? "text-lavender-100" : "text-charcoal-muted"}`}>
        {label}
      </p>
      <p className={`mt-1 font-display text-2xl font-bold ${accent ? "text-white" : "text-charcoal"}`}>
        {value}
      </p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-charcoal-muted">{text}</p>;
}
