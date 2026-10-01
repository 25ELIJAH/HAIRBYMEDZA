import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge, TypeBadge } from "@/components/StatusBadge";
import { EmptyState, PageHeader, Panel, Stat, StatGrid } from "@/components/admin/ui";
import { paymentMethod } from "@/lib/payment-labels";
import {
  formatKes,
  minutesToLabel,
  prettyDate,
  salonMidnight,
  salonTimeStr,
  salonDateStr,
  todayStr,
} from "@/lib/time";

export const dynamic = "force-dynamic";

const ACTIVE = ["PENDING", "CONFIRMED", "COMPLETED"];

export default async function DashboardPage() {
  const today = todayStr();
  const monthStart = `${today.slice(0, 8)}01`;
  // Money figures count payments actually received (online and cash), by the
  // day they were paid, in salon time.
  const receivedSince = (from: string) =>
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "SUCCESS", paidAt: { gte: salonMidnight(from) } },
    });

  const [todays, todayMoney, monthMoney, pendingCount, upcoming, recentPayments, attentionCount, blockedCount] =
    await Promise.all([
      prisma.appointment.findMany({
        where: { date: today, status: { in: ACTIVE } },
        include: { customer: true, service: true },
        orderBy: { startMin: "asc" },
      }),
      receivedSince(today),
      receivedSince(monthStart),
      prisma.appointment.count({ where: { status: "PENDING", date: { gte: today } } }),
      prisma.appointment.findMany({
        where: { date: { gt: today }, status: { in: ["PENDING", "CONFIRMED"] } },
        include: { customer: true, service: true },
        orderBy: [{ date: "asc" }, { startMin: "asc" }],
        take: 6,
      }),
      prisma.payment.findMany({
        where: { status: "SUCCESS" },
        include: { appointment: { include: { customer: true } } },
        orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
        take: 6,
      }),
      prisma.appointment.count({
        where: { date: { lt: today }, status: { in: ["PENDING", "CONFIRMED"] } },
      }),
      prisma.notificationLog.count({ where: { channel: "BLOCKED_BOOKING", status: "BLOCKED" } }),
    ]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={prettyDate(today)}
        actions={
          <Link href="/admin/appointments/new" className="btn-primary !px-4 !py-2 text-sm">
            Add booking
          </Link>
        }
      />

      {(attentionCount > 0 || blockedCount > 0) && (
        <div className="mb-6 divide-y divide-amber-200 overflow-hidden rounded-xl border border-amber-200 bg-amber-50/60 text-sm">
          {attentionCount > 0 && (
            <Link
              href="/admin/appointments?filter=attention"
              className="flex items-center justify-between gap-3 px-5 py-3 text-amber-900 hover:bg-amber-50"
            >
              <span>
                {attentionCount} past booking{attentionCount === 1 ? " needs" : "s need"} marking done or cancelled
              </span>
              <span className="font-medium">Review</span>
            </Link>
          )}
          {blockedCount > 0 && (
            <Link
              href="/admin/appointments?filter=blocked"
              className="flex items-center justify-between gap-3 px-5 py-3 text-amber-900 hover:bg-amber-50"
            >
              <span>
                {blockedCount} website booking{blockedCount === 1 ? " was" : "s were"} held by the spam filter
              </span>
              <span className="font-medium">Check</span>
            </Link>
          )}
        </div>
      )}

      <StatGrid>
        <Stat label="Bookings today" value={String(todays.length)} href="/admin/appointments" />
        <Stat label="To confirm" value={String(pendingCount)} href="/admin/appointments?filter=PENDING" />
        <Stat label="Received today" value={formatKes(todayMoney._sum.amount ?? 0)} href="/admin/payments" />
        <Stat label="Received this month" value={formatKes(monthMoney._sum.amount ?? 0)} href="/admin/payments" />
      </StatGrid>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <Panel
          title="Today"
          flush
          className="lg:col-span-3"
          action={
            <Link href="/admin/appointments" className="text-sm font-medium text-royal-700 hover:underline">
              All bookings
            </Link>
          }
        >
          {todays.length === 0 ? (
            <EmptyState text="No bookings today." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {todays.map((a) => (
                <li key={a.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="w-16 shrink-0 text-sm font-medium tabular-nums text-charcoal">
                    {minutesToLabel(a.startMin)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/customers/${a.customerId}`}
                      className="block truncate text-sm font-medium text-charcoal hover:text-royal-700"
                    >
                      {a.customer.name}
                    </Link>
                    <p className="truncate text-xs text-charcoal-muted">{a.service.name}</p>
                  </div>
                  <TypeBadge type={a.serviceType} />
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Latest payments"
          flush
          className="lg:col-span-2"
          action={
            <Link href="/admin/payments" className="text-sm font-medium text-royal-700 hover:underline">
              History
            </Link>
          }
        >
          {recentPayments.length === 0 ? (
            <EmptyState text="No payments yet." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentPayments.map((p) => {
                const at = p.paidAt ?? p.createdAt;
                const d = salonDateStr(at);
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-charcoal">{p.appointment.customer.name}</p>
                      <p className="truncate text-xs text-charcoal-muted">
                        {d === today ? "Today" : prettyDate(d)} {salonTimeStr(at)} · {paymentMethod(p)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-charcoal">
                      {formatKes(p.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Coming up" flush className="mt-6">
        {upcoming.length === 0 ? (
          <EmptyState text="Nothing booked after today yet." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {upcoming.map((a) => (
              <li key={a.id} className="flex items-center gap-4 px-5 py-3.5 text-sm">
                <span className="w-28 shrink-0 text-charcoal-muted sm:w-52">
                  {prettyDate(a.date)}
                  <span className="block tabular-nums text-charcoal">{minutesToLabel(a.startMin)}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/customers/${a.customerId}`}
                    className="block truncate font-medium text-charcoal hover:text-royal-700"
                  >
                    {a.customer.name}
                  </Link>
                  <p className="truncate text-xs text-charcoal-muted">{a.service.name}</p>
                </div>
                <span className="hidden sm:inline">
                  <TypeBadge type={a.serviceType} />
                </span>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
