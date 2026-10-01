import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import AppointmentCard, { ApptData } from "@/components/AppointmentCard";
import BlockedAttempts, { BlockedAttempt } from "@/components/BlockedAttempts";
import { mpesaEnabled } from "@/lib/mpesa";
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
  const stkOn = mpesaEnabled();

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

      {(attentionCount > 0 || blockedCount > 0) && (
        <div className="mb-5 space-y-2">
          {attentionCount > 0 && filter !== "attention" && (
            <Link
              href="/admin/appointments?filter=attention"
              className="block rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100"
            >
              <strong>{attentionCount}</strong> past booking{attentionCount === 1 ? " was" : "s were"} never
              marked completed or cancelled. Review them →
            </Link>
          )}
          {blockedCount > 0 && (
            <Link
              href="/admin/appointments?filter=blocked"
              className="block rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200 hover:bg-red-100"
            >
              <strong>{blockedCount}</strong> website booking attempt{blockedCount === 1 ? " was" : "s were"}{" "}
              held by the spam filter. Check if any are real clients →
            </Link>
          )}
        </div>
      )}

      <Filters active={filter} q={q} />

      <p className="mb-3 text-xs text-charcoal-muted">
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
        <div className="grid gap-4">
          {data.map((a) => (
            <AppointmentCard key={a.id} appt={a} stkEnabled={stkOn} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-between">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="btn-outline !px-4 !py-2 text-sm">
              ← Newer / previous
            </Link>
          ) : (
            <span />
          )}
          {page < pages && (
            <Link href={pageHref(page + 1)} className="btn-outline !px-4 !py-2 text-sm">
              More →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

function Header() {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-bold text-charcoal">Appointments</h1>
        <p className="mt-1 text-sm text-charcoal-muted">
          Confirm, complete, cancel and track payments. Every booking ever made is kept here.
        </p>
      </div>
      <div className="flex gap-2">
        <a href="/api/admin/export?type=appointments" className="btn-ghost !px-3 !py-2 text-sm">
          Export CSV
        </a>
        <Link href="/admin/appointments/new" className="btn-primary !px-4 !py-2 text-sm">
          + Add booking
        </Link>
      </div>
    </header>
  );
}

function Filters({ active, q }: { active: string; q: string }) {
  return (
    <div className="mb-4 space-y-3">
      <form action="/admin/appointments" className="flex gap-2">
        <input type="hidden" name="filter" value={active === "blocked" || active === "upcoming" ? "all" : active} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by client name, phone or email…"
          className="input flex-1"
        />
        <button className="btn-outline !px-4">Search</button>
      </form>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/appointments?filter=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`badge ring-1 transition ${
              active === f.key
                ? "bg-royal-600 text-white ring-royal-600"
                : "bg-white text-charcoal-muted ring-black/10 hover:ring-royal-300"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
