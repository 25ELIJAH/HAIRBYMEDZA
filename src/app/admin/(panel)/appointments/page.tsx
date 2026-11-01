import Link from "next/link";
import LogoMark from "@/components/LogoMark";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import AppointmentCard, { ApptData } from "@/components/AppointmentCard";
import BlockedAttempts, { BlockedAttempt } from "@/components/BlockedAttempts";
import { paymentsEnabled } from "@/lib/payments";
import { phoneVariants } from "@/lib/phone";
import { todayStr } from "@/lib/time";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

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

  // Style photos: uploaded ones are served as small cached files, never inlined.
  const photoCache = new Map<string, string | null>();
  const photoFor = (serviceId: string, url: string | null) => {
    if (photoCache.has(serviceId)) return photoCache.get(serviceId)!;
    let out: string | null = null;
    if (url?.startsWith("data:")) {
      const v = createHash("md5").update(url).digest("hex").slice(0, 10);
      out = `/api/img/service/${serviceId}?v=${v}`;
    } else if (url && (/^https:\/\//i.test(url) || url.startsWith("/"))) {
      out = url;
    }
    photoCache.set(serviceId, out);
    return out;
  };

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
    serviceImage: photoFor(a.serviceId, a.service.imageUrl),
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
        <div className="mb-5 divide-y divide-amber-200/70 overflow-hidden rounded-2xl border border-amber-200/80 bg-amber-50/70 text-sm">
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

      <p className="mb-3 px-1 text-[13px] text-charcoal-muted">
        {total} booking{total === 1 ? "" : "s"}
        {q ? ` matching “${q}”` : ""}
        {pages > 1 ? ` · page ${page} of ${pages}` : ""}
      </p>

      {data.length === 0 ? (
        <div className="rounded-3xl border border-violet-100 bg-white p-10 text-center text-sm text-charcoal-muted">
          No bookings in this view.{" "}
          {filter === "upcoming" && (
            <>
              Older bookings are under{" "}
              <Link href="/admin/appointments?filter=all" className="font-medium text-violet-700 underline">
                All bookings
              </Link>
              .
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.map((a) => (
            <AppointmentCard key={a.id} appt={a} stkEnabled={stkOn} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-between">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="rounded-full border border-violet-200 bg-white px-5 py-2 text-sm font-semibold text-violet-800">
              Newer
            </Link>
          ) : (
            <span />
          )}
          {page < pages && (
            <Link href={pageHref(page + 1)} className="rounded-full border border-violet-200 bg-white px-5 py-2 text-sm font-semibold text-violet-800">
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
    <header className="mb-6 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-brand text-[2.1rem] font-medium leading-none text-charcoal sm:text-[2.6rem]">Bookings</h1>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <a
          href="/api/admin/export?type=appointments"
          className="hidden rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-medium text-charcoal-soft hover:border-violet-300 hover:text-violet-800 sm:inline-flex"
        >
          Export CSV
        </a>
        <Link
          href="/admin/appointments/new"
          aria-label="Add booking"
          className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-2xl font-light leading-none text-white shadow-[0_8px_18px_-8px_rgba(124,58,237,0.7)] transition hover:scale-105"
        >
          +
        </Link>
        <span className="rounded-full bg-gradient-to-br from-violet-300 to-fuchsia-200 p-[2px]">
          <span className="block rounded-full bg-white p-[2px]">
            <LogoMark size={40} badge />
          </span>
        </span>
      </div>
    </header>
  );
}

const MORE = [
  { key: "attention", label: "Needs attention" },
  { key: "PENDING", label: "Pending" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "all", label: "All" },
];

function Filters({ active, q }: { active: string; q: string }) {
  const href = (key: string) => `/admin/appointments?filter=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  return (
    <div className="mb-5 space-y-4">
      {/* Upcoming | Past */}
      <div className="grid grid-cols-2 rounded-2xl border border-violet-100 bg-white p-1.5 shadow-[0_8px_24px_-18px_rgba(76,29,149,0.4)]">
        {[
          { key: "upcoming", label: "Upcoming" },
          { key: "past", label: "Past" },
        ].map((t, i) => {
          const on = active === t.key;
          return (
            <Link
              key={t.key}
              href={href(t.key)}
              className={`relative flex flex-col items-center justify-center rounded-xl py-2.5 text-[15px] font-semibold transition ${
                on ? "text-charcoal" : "text-charcoal-muted hover:text-charcoal"
              } ${i === 0 ? "after:absolute after:right-0 after:top-1/4 after:h-1/2 after:w-px after:bg-violet-100" : ""}`}
            >
              {t.label}
              <span
                className={`mt-1 h-[3px] w-14 rounded-full transition ${
                  on ? "bg-gradient-to-r from-violet-600 to-fuchsia-500" : "bg-transparent"
                }`}
              />
            </Link>
          );
        })}
      </div>

      <form action="/admin/appointments" className="flex gap-2">
        <input type="hidden" name="filter" value={active === "blocked" || active === "upcoming" ? "all" : active} />
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search name or phone"
          className="min-w-0 flex-1 rounded-full border border-violet-100 bg-white px-4 py-2.5 text-sm text-charcoal placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
        />
        <button className="shrink-0 rounded-full border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-800 hover:bg-violet-50">
          Search
        </button>
      </form>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {MORE.map((f) => (
          <Link
            key={f.key}
            href={href(f.key)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              active === f.key
                ? "bg-violet-700 text-white"
                : "border border-violet-100 bg-white text-charcoal-soft hover:border-violet-300 hover:text-violet-800"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
