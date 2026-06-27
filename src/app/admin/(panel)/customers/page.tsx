import { prisma } from "@/lib/prisma";
import { formatKes, prettyDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    include: {
      appointments: { include: { service: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = customers
    .map((c) => {
      const honored = c.appointments.filter((a) => a.status !== "CANCELLED");
      const spend = honored
        .filter((a) => a.paymentStatus === "PAID")
        .reduce((s, a) => s + a.priceKes, 0);
      const booked = honored.reduce((s, a) => s + a.priceKes, 0);

      // Favourite service = most frequent.
      const counts = new Map<string, number>();
      honored.forEach((a) => counts.set(a.service.name, (counts.get(a.service.name) || 0) + 1));
      const favourite =
        [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "None yet";

      const lastVisit = honored.map((a) => a.date).sort().at(-1);

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        notes: c.notes,
        visits: honored.length,
        spend,
        booked,
        favourite,
        lastVisit,
      };
    })
    .sort((a, b) => b.visits - a.visits);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-charcoal">Customers</h1>
        <p className="mt-1 text-sm text-charcoal-muted">
          {customers.length} {customers.length === 1 ? "client" : "clients"} in your database.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-charcoal-muted">
          No customers yet. They appear here automatically after the first booking.
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
                <th className="px-4 py-3">Last visit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-black/5 last:border-0 align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-royal-100 text-xs font-semibold text-royal-700">
                        {c.name[0]?.toUpperCase()}
                      </span>
                      <div>
                        <p className="font-medium text-charcoal">{c.name}</p>
                        {c.notes && (
                          <p className="text-xs text-charcoal-muted">{c.notes}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-charcoal-muted">
                    <p>{c.phone}</p>
                    {c.email && <p className="text-xs">{c.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-royal-600">
                    {c.visits}
                  </td>
                  <td className="px-4 py-3 text-charcoal-soft">{c.favourite}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatKes(c.spend)}</td>
                  <td className="px-4 py-3 text-charcoal-muted">
                    {c.lastVisit ? prettyDate(c.lastVisit) : "Not yet"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
