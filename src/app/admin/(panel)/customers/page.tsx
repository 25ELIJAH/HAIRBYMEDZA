import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CustomerForm, ImportCustomersForm, MergeDuplicatesButton } from "@/components/CustomerTools";
import { formatPhone } from "@/lib/phone";
import { formatKes, prettyDate, todayStr } from "@/lib/time";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string; sort?: string };
}) {
  const q = (searchParams.q || "").trim().slice(0, 80);
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const sort = searchParams.sort === "visits" ? "visits" : "recent";
  const digits = q.replace(/[^0-9]/g, "");
  const today = todayStr();

  const where: Prisma.CustomerWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
          ...(digits.length >= 4 ? [{ phone: { contains: digits.slice(-9) } }] : []),
        ],
      }
    : {};

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      include: { appointments: { include: { service: true } } },
    }),
  ]);

  const rows = customers
    .map((c) => {
      const honored = c.appointments.filter((a) => a.status !== "CANCELLED");
      const paid = c.appointments.reduce((s, a) => s + a.amountPaid, 0);
      const counts = new Map<string, number>();
      honored.forEach((a) => counts.set(a.service.name, (counts.get(a.service.name) || 0) + 1));
      const favourite = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "None yet";
      const dates = honored.map((a) => a.date).sort();
      const lastVisit = dates.filter((d) => d <= today).at(-1);
      const nextVisit = dates.find((d) => d > today);
      const lastActivity = [c.createdAt.toISOString().slice(0, 10), ...dates].sort().at(-1)!;
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        notes: c.notes,
        bookings: c.appointments.length,
        visits: honored.length,
        paid,
        favourite,
        lastVisit,
        nextVisit,
        lastActivity,
      };
    })
    .sort((a, b) =>
      sort === "visits"
        ? b.visits - a.visits || b.lastActivity.localeCompare(a.lastActivity)
        : b.lastActivity.localeCompare(a.lastActivity)
    );
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const qs = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const all = { q: q || undefined, sort: sort === "visits" ? "visits" : undefined, ...p };
    Object.entries(all).forEach(([k, v]) => v && u.set(k, v));
    return `/admin/customers?${u}`;
  };

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${total} ${total === 1 ? "client" : "clients"}${q ? ` matching “${q}”` : ""}`}
        actions={
          <a href="/api/admin/export?type=customers" className="btn-outline hidden !px-4 !py-2 text-sm sm:inline-flex">
            Export CSV
          </a>
        }
      />

      <form action="/admin/customers" className="mb-4 flex gap-2">
        {sort === "visits" && <input type="hidden" name="sort" value="visits" />}
        <input name="q" type="search" defaultValue={q} placeholder="Search name or phone" className="input min-w-0 flex-1" />
        <button className="btn-outline shrink-0 !px-4">Search</button>
      </form>
      <nav className="mb-4 flex gap-5 border-b border-gray-200 text-sm">
        {[
          { key: "recent", label: "Most recent", href: qs({ sort: undefined, page: undefined }) },
          { key: "visits", label: "Most visits", href: qs({ sort: "visits", page: undefined }) },
        ].map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={`-mb-px border-b-2 pb-2.5 font-medium ${
              sort === t.key ? "border-royal-600 text-charcoal" : "border-transparent text-charcoal-muted hover:text-charcoal"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {shown.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-charcoal-muted">
          {q
            ? "No clients match that search."
            : "No customers yet. They appear here automatically after the first booking, or add past clients below."}
        </div>
      ) : (
        <>
        {/* Phones: simple list */}
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white md:hidden">
          {shown.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/customers/${c.id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-royal-50 text-sm font-semibold text-royal-700">
                  {c.name[0]?.toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-charcoal">{c.name}</span>
                  <span className="block truncate text-[13px] text-charcoal-muted">
                    {formatPhone(c.phone)}
                    {c.nextVisit ? ` · next ${prettyDate(c.nextVisit)}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular-nums text-charcoal">{c.visits}</span>
                  <span className="block text-[11px] text-charcoal-muted">{c.visits === 1 ? "visit" : "visits"}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium text-charcoal-muted">
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3 text-center">Visits</th>
                <th className="px-4 py-3">Favourite</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3">Last / next visit</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} className="border-b border-black/5 align-top last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/customers/${c.id}`} className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-royal-50 text-xs font-semibold text-royal-700">
                        {c.name[0]?.toUpperCase()}
                      </span>
                      <div>
                        <p className="font-medium text-charcoal hover:text-royal-600">{c.name}</p>
                        {c.notes && <p className="line-clamp-1 text-xs text-charcoal-muted">{c.notes}</p>}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-charcoal-muted">
                    <a href={`https://wa.me/${c.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="hover:text-royal-600">
                      {formatPhone(c.phone)}
                    </a>
                    {c.email && <p className="text-xs">{c.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold tabular-nums text-charcoal">{c.visits}</td>
                  <td className="px-4 py-3 text-charcoal-soft">{c.favourite}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatKes(c.paid)}</td>
                  <td className="px-4 py-3 text-xs text-charcoal-muted">
                    <p>{c.lastVisit ? prettyDate(c.lastVisit) : "No visit yet"}</p>
                    {c.nextVisit && <p className="text-emerald-700">Next: {prettyDate(c.nextVisit)}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={qs({ page: String(page - 1) })} className="btn-outline !px-4 !py-2">Previous</Link> : <span />}
          <span className="text-charcoal-muted">Page {page} of {pages}</span>
          {page < pages ? <Link href={qs({ page: String(page + 1) })} className="btn-outline !px-4 !py-2">Next</Link> : <span />}
        </nav>
      )}

      <div className="mt-8 space-y-3">
        <details className="group rounded-xl border border-gray-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-semibold text-charcoal sm:px-5">
            Add a client
            <span className="text-charcoal-muted group-open:hidden">Open</span>
            <span className="hidden text-charcoal-muted group-open:inline">Close</span>
          </summary>
          <div className="border-t border-gray-100 p-4 sm:p-5">
            <CustomerForm />
          </div>
        </details>
        <details className="group rounded-xl border border-gray-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-semibold text-charcoal sm:px-5">
            Import past clients
            <span className="text-charcoal-muted group-open:hidden">Open</span>
            <span className="hidden text-charcoal-muted group-open:inline">Close</span>
          </summary>
          <div className="border-t border-gray-100 p-4 sm:p-5">
            <ImportCustomersForm />
          </div>
        </details>
        <details className="group rounded-xl border border-gray-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-semibold text-charcoal sm:px-5">
            Merge duplicate clients
            <span className="text-charcoal-muted group-open:hidden">Open</span>
            <span className="hidden text-charcoal-muted group-open:inline">Close</span>
          </summary>
          <div className="border-t border-gray-100 p-4 sm:p-5">
            <p className="mb-3 text-sm text-charcoal-muted">
              Joins clients saved twice with differently typed numbers (0712… and +254712…).
            </p>
            <MergeDuplicatesButton />
          </div>
        </details>
      </div>
    </div>
  );
}
