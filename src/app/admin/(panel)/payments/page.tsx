import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { providerInfo } from "@/lib/payments";
import { formatPhone } from "@/lib/phone";
import { paymentMethod, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_STYLE } from "@/lib/payment-labels";
import {
  addDaysStr,
  formatKes,
  prettyDate,
  salonDateStr,
  salonMidnight,
  salonTimeStr,
  todayStr,
} from "@/lib/time";
import { EmptyState, PageHeader, Panel, Stat, StatGrid, Tabs } from "@/components/admin/ui";
import { BackfillButton } from "@/components/admin/MoneyTools";

export const dynamic = "force-dynamic";

const PAGE = 100;

export default async function MoneyPage({
  searchParams,
}: {
  searchParams: { tab?: string; page?: string };
}) {
  const tab = searchParams.tab === "attempts" ? "attempts" : "received";
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const today = todayStr();
  const monthStart = `${today.slice(0, 8)}01`;
  const received = { status: "SUCCESS" };
  const sumSince = (from: string) =>
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { ...received, paidAt: { gte: salonMidnight(from) } },
    });

  const [todaySum, weekSum, monthSum, allSum, owed, legacy, attemptsCount, payments, total] =
    await Promise.all([
      sumSince(today),
      sumSince(addDaysStr(today, -6)),
      sumSince(monthStart),
      prisma.payment.aggregate({ _sum: { amount: true }, _count: true, where: received }),
      // Still to collect on bookings that are going ahead or done.
      prisma.appointment.findMany({
        where: { status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] } },
        select: { priceKes: true, amountPaid: true },
      }),
      // Money recorded on bookings before every payment was logged.
      prisma.appointment.findMany({
        where: { amountPaid: { gt: 0 } },
        select: { amountPaid: true, payments: { where: received, select: { amount: true } } },
      }),
      prisma.payment.count({ where: { status: { not: "SUCCESS" } } }),
      prisma.payment.findMany({
        where: tab === "received" ? received : { status: { not: "SUCCESS" } },
        include: { appointment: { include: { customer: true, service: true } } },
        orderBy: tab === "received" ? [{ paidAt: "desc" }, { createdAt: "desc" }] : { createdAt: "desc" },
        skip: (page - 1) * PAGE,
        take: PAGE,
      }),
      prisma.payment.count({ where: tab === "received" ? received : { status: { not: "SUCCESS" } } }),
    ]);

  const toCollect = owed.reduce((s, a) => s + Math.max(0, a.priceKes - a.amountPaid), 0);
  const missing = legacy
    .map((a) => a.amountPaid - a.payments.reduce((s, p) => s + p.amount, 0))
    .filter((m) => m > 0);
  const info = providerInfo();

  // Group the list by day (salon time) with a total per day.
  const groups: { date: string; total: number; rows: typeof payments }[] = [];
  for (const p of payments) {
    const date = salonDateStr(p.paidAt ?? p.createdAt);
    let g = groups.at(-1);
    if (!g || g.date !== date) groups.push((g = { date, total: 0, rows: [] }));
    g.rows.push(p);
    if (p.status === "SUCCESS") g.total += p.amount;
  }
  // Day totals cover the whole day, even when it runs across pages.
  if (tab === "received" && groups.length) {
    const dayRows = await prisma.payment.findMany({
      where: {
        ...received,
        paidAt: {
          gte: salonMidnight(groups.at(-1)!.date),
          lt: salonMidnight(addDaysStr(groups[0].date, 1)),
        },
      },
      select: { amount: true, paidAt: true },
    });
    const byDay = new Map<string, number>();
    for (const r of dayRows) {
      const d = salonDateStr(r.paidAt!);
      byDay.set(d, (byDay.get(d) ?? 0) + r.amount);
    }
    for (const g of groups) g.total = byDay.get(g.date) ?? g.total;
  }
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (p: number) => `/admin/payments?${tab === "attempts" ? "tab=attempts&" : ""}page=${p}`;

  return (
    <div>
      <PageHeader
        title="Money"
        subtitle={
          !info
            ? "Online payments are off. Cash and manual payments you record still show here."
            : info.mode === "test"
              ? `${info.name} is in test mode: no real money moves yet.`
              : `Online payments through ${info.name}, plus cash you record.`
        }
        actions={
          <a href="/api/admin/export?type=payments" className="btn-outline hidden !px-4 !py-2 text-sm sm:inline-flex">
            Export CSV
          </a>
        }
      />

      <StatGrid>
        <Stat label="Today" value={formatKes(todaySum._sum.amount ?? 0)} />
        <Stat label="Last 7 days" value={formatKes(weekSum._sum.amount ?? 0)} />
        <Stat label="This month" value={formatKes(monthSum._sum.amount ?? 0)} />
        <Stat
          label="All time"
          value={formatKes(allSum._sum.amount ?? 0)}
          hint={`${allSum._count} payment${allSum._count === 1 ? "" : "s"}`}
        />
      </StatGrid>

      <p className="mt-3 text-sm text-charcoal-muted">
        Still to collect on bookings: <span className="font-semibold text-charcoal tabular-nums">{formatKes(toCollect)}</span>
      </p>

      {missing.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/60 px-5 py-4">
          <BackfillButton count={missing.length} total={formatKes(missing.reduce((s, m) => s + m, 0))} />
        </div>
      )}

      <div className="mt-10">
        <Tabs
          active={tab}
          items={[
            { key: "received", label: "Received", href: "/admin/payments", count: allSum._count },
            { key: "attempts", label: "Unpaid attempts", href: "/admin/payments?tab=attempts", count: attemptsCount },
          ]}
        />

        {groups.length === 0 ? (
          <Panel flush>
            <EmptyState
              text={tab === "received" ? "No money received yet." : "No failed or waiting payments."}
            />
          </Panel>
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <Panel
                key={g.date}
                flush
                title={g.date === today ? `Today · ${prettyDate(g.date)}` : prettyDate(g.date)}
                action={
                  tab === "received" ? (
                    <span className="text-sm font-semibold tabular-nums text-charcoal">{formatKes(g.total)}</span>
                  ) : undefined
                }
              >
                <ul className="divide-y divide-gray-100">
                  {g.rows.map((p) => (
                    <li key={p.id} className="grid grid-cols-[3.5rem_1fr_auto] items-start gap-x-4 gap-y-1 px-5 py-3.5 text-sm">
                      <span className="pt-0.5 tabular-nums text-charcoal-muted">
                        {salonTimeStr(p.paidAt ?? p.createdAt)}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/customers/${p.appointment.customerId}`}
                          className="font-medium text-charcoal hover:text-royal-700"
                        >
                          {p.appointment.customer.name}
                        </Link>
                        <p className="truncate text-xs text-charcoal-muted">
                          {p.appointment.service.name} · {paymentMethod(p)}
                          {p.channel === "MPESA" && p.phone ? ` ${formatPhone(p.phone)}` : ""}
                          {p.receiptNumber ? ` · ${p.receiptNumber}` : ""}
                        </p>
                        {p.status !== "SUCCESS" && p.resultDesc && (
                          <p className="mt-0.5 text-xs text-charcoal-muted">{p.resultDesc}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold tabular-nums text-charcoal">{formatKes(p.amount)}</p>
                        {p.status !== "SUCCESS" && (
                          <span className={`badge mt-1 ${PAYMENT_STATUS_STYLE[p.status] || "bg-gray-100"}`}>
                            {PAYMENT_STATUS_LABEL[p.status] || p.status}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="mt-6 flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link href={href(page - 1)} className="btn-outline !px-4 !py-2">
                Newer
              </Link>
            ) : (
              <span />
            )}
            <span className="text-charcoal-muted">
              Page {page} of {pages}
            </span>
            {page < pages ? (
              <Link href={href(page + 1)} className="btn-outline !px-4 !py-2">
                Older
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
