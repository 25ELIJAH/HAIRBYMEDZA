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
          <a href="/api/admin/export?type=customers" className="btn-outline !px-4 !py-2 text-sm">
            Export CSV
          </a>
        }
      />

      <form action="/admin/customers" className="mb-3 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, phone, email or notes…" className="input flex-1" />
        <button className="btn-outline !px-4">Search</button>
      </form>
      <div className="mb-4 flex gap-2 text-xs">
        <Link href={qs({ sort: undefined, page: undefined })} className={`badge ring-1 ${sort === "recent" ? "bg-royal-600 text-white ring-royal-600" : "bg-white ring-black/10"}`}>
          Most recent
        </Link>
        <Link href={qs({ sort: "visits", page: undefined })} className={`badge ring-1 ${sort === "visits" ? "bg-royal-600 text-white ring-royal-600" : "bg-white ring-black/10"}`}>
          Most visits
        </Link>
      </div>

      {shown.length === 0 ? (
        <div className="card p-10 text-center text-charcoal-muted">
          {q
            ? "No clients match that search."
            : "No customers yet. They appear here automatically after the first booking, or add past clients below."}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-xs uppercase tracking-wide text-charcoal-muted">
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
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-royal-100 text-xs font-semibold text-royal-700">
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
                  <td className="px-4 py-3 text-center font-semibold text-royal-600">{c.visits}</td>
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
      )}

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={qs({ page: String(page - 1) })} className="btn-outline !px-4 !py-2">← Previous</Link> : <span />}
          <span className="text-charcoal-muted">Page {page} of {pages}</span>
          {page < pages ? <Link href={qs({ page: String(page + 1) })} className="btn-outline !px-4 !py-2">Next →</Link> : <span />}
        </nav>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 text-base font-semibold text-charcoal">Add a client</h2>
          <CustomerForm />
        </section>
        <section className="card p-5">
          <h2 className="mb-4 text-base font-semibold text-charcoal">Import past clients</h2>
          <ImportCustomersForm />
        </section>
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-1 text-base font-semibold text-charcoal">Tidy up duplicates</h2>
          <p className="mb-3 text-sm text-charcoal-muted">
            Older bookings saved the same client more than once when their number was typed
            differently (0712… vs +254712…). This merges them into one record with the full history.
          </p>
          <MergeDuplicatesButton />
        </section>
      </div>
    </div>
  );
}
