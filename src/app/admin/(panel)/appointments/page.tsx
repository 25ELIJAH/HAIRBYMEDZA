import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import AppointmentCard, { ApptData } from "@/components/AppointmentCard";
import BlockedAttempts, { BlockedAttempt } from "@/components/BlockedAttempts";
import { paymentsEnabled } from "@/lib/payments";
import { phoneVariants } from "@/lib/phone";
import { todayStr } from "@/lib/time";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const FILTERS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "attention", label: "Needs attention" },
  { key: "PENDING", label: "Pending" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "past", label: "Past" },
  { key: "all", label: "All bookings" },
];

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: { filter?: string; date?: string; q?: string; page?: string };
}) {
  const filter = searchParams.filter || "upcoming";
  const q = (searchParams.q || "").trim().slice(0, 80);
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const today = todayStr();

  // Blocked website attempts (spam-filter catches) live in their own view.
  if (filter === "blocked") {
    const logs = await prisma.notificationLog.findMany({
      where: { channel: "BLOCKED_BOOKING", status: "BLOCKED" },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const attempts: BlockedAttempt[] = logs.map((l) => {
      let data: any = {};
      try {
        data = JSON.parse(l.body);
      } catch {}
      return {
        id: l.id,
        createdAt: l.createdAt.toISOString(),
        name: data?.customer?.name || "",
        phone: data?.customer?.phone || l.recipient,
        date: data?.date || "",
        startMin: Number(data?.startMin) || 0,
      };
    });
    return (
      <div>
        <Header />
        <Filters active={filter} q={q} />
        <BlockedAttempts attempts={attempts} />
      </div>
    );
  }

  const where: Prisma.AppointmentWhereInput = {};
  const active = ["PENDING", "CONFIRMED"];
  if (filter === "upcoming") {
    where.date = { gte: today };
    where.status = { in: active };
  } else if (filter === "attention") {
    // Bookings whose day has passed but were never completed or cancelled.
    where.date = { lt: today };
    where.status = { in: active };
  } else if (filter === "past") {
    where.date = { lt: today };
  } else if (["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"].includes(filter)) {
    where.status = filter;
  }
  if (searchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date)) {
    where.date = searchParams.date;
  }
  if (q) {
    const digits = q.replace(/[^0-9]/g, "");
    where.customer = {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        ...(digits.length >= 4 ? [{ phone: { contains: digits.slice(-9) } }] : []),
        ...(digits.length >= 9 ? [{ phone: { in: phoneVariants(q) } }] : []),
      ],
    };
  }

  // Upcoming views read soonest first; history views read newest first.
  const ascending = filter === "upcoming" || filter === "CONFIRMED" || filter === "PENDING";
  const dir = ascending ? "asc" : "desc";

  const [total, appts, attentionCount, blockedCount] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      include: {
        customer: true,
        service: true,
        payments: { orderBy: { createdAt: "desc" }, take: 5 },
      },
      orderBy: [{ date: dir }, { startMin: dir }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.appointment.count({ where: { date: { lt: today }, status: { in: active } } }),
    prisma.notificationLog.count({ where: { channel: "BLOCKED_BOOKING", status: "BLOCKED" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const stkOn = paymentsEnabled();

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
    customerId: a.customerId,
    customerName: a.customer.name,
    customerPhone: a.customer.phone,
    customerEmail: a.customer.email,
    serviceName: a.service.name,
    source: a.source,
    createdAt: a.createdAt.toISOString(),
    overdue: a.date < today && active.includes(a.status),
    payments: a.payments.map((p) => ({
      id: p.id,
      status: p.status,
      amount: p.amount,
      channel: p.channel,
      phone: p.phone,
      receiptNumber: p.receiptNumber,
      createdAt: p.createdAt.toISOString(),
      resultDesc: p.resultDesc,
    })),
  }));

  const pageHref = (p: number) => {
    const params = new URLSearchParams({ filter });
    if (q) params.set("q", q);
    if (searchParams.date) params.set("date", searchParams.date);
    if (p > 1) params.set("page", String(p));
    return `/admin/appointments?${params}`;
  };

  return (
    <div>
      <Header />

      {(attentionCount > 0 && filter !== "attention") || blockedCount > 0 ? (
        <div className="mb-6 divide-y divide-amber-200 overflow-hidden rounded-xl border border-amber-200 bg-amber-50/60 text-sm">
          {attentionCount > 0 && filter !== "attention" && (
            <Link
              href="/admin/appointments?filter=attention"
              className="flex items-center justify-between gap-3 px-4 py-3 text-amber-900 hover:bg-amber-50 sm:px-5"
            >
              <span>
                {attentionCount} past booking{attentionCount === 1 ? "" : "s"} to close
              </span>
              <span className="font-medium">Review</span>
            </Link>
          )}
          {blockedCount > 0 && (
            <Link
              href="/admin/appointments?filter=blocked"
              className="flex items-center justify-between gap-3 px-4 py-3 text-amber-900 hover:bg-amber-50 sm:px-5"
            >
              <span>
                {blockedCount} held by spam filter
              </span>
              <span className="font-medium">Check</span>
            </Link>
          )}
        </div>
      ) : null}

      <Filters active={filter} q={q} />

      <p className="mb-3 text-sm text-charcoal-muted">
        {total} booking{total === 1 ? "" : "s"}
        {q ? ` matching “${q}”` : ""}
        {pages > 1 ? ` · page ${page} of ${pages}` : ""}
      </p>

      {data.length === 0 ? (
        <div className="card p-10 text-center text-charcoal-muted">
          No bookings in this view.{" "}
          {filter === "upcoming" && (
            <>
              Older bookings are under{" "}
              <Link href="/admin/appointments?filter=all" className="text-royal-600 underline">
                All bookings
              </Link>
              .
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {data.map((a) => (
            <AppointmentCard key={a.id} appt={a} stkEnabled={stkOn} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-between">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="btn-outline !px-4 !py-2 text-sm">
              Newer
            </Link>
          ) : (
            <span />
          )}
          {page < pages && (
            <Link href={pageHref(page + 1)} className="btn-outline !px-4 !py-2 text-sm">
              Older
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

function Header() {
  return (
    <PageHeader
      title="Bookings"
      actions={
        <>
          <a href="/api/admin/export?type=appointments" className="btn-outline hidden !px-4 !py-2 text-sm sm:inline-flex">
            Export CSV
          </a>
          <Link href="/admin/appointments/new" className="btn-primary !px-3.5 !py-2 text-sm">
            Add booking
          </Link>
        </>
      }
    />
  );
}

function Filters({ active, q }: { active: string; q: string }) {
  return (
    <div className="mb-4 space-y-4">
      <form action="/admin/appointments" className="flex gap-2">
        <input type="hidden" name="filter" value={active === "blocked" || active === "upcoming" ? "all" : active} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name or phone"
          type="search"
          className="input min-w-0 flex-1"
        />
        <button className="btn-outline shrink-0 !px-4">Search</button>
      </form>
      <nav className="flex gap-5 overflow-x-auto border-b border-gray-200 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/appointments?filter=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`-mb-px shrink-0 border-b-2 pb-2.5 font-medium transition ${
              active === f.key
                ? "border-royal-600 text-charcoal"
                : "border-transparent text-charcoal-muted hover:text-charcoal"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
