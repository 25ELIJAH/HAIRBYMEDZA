import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { providerInfo } from "@/lib/payments";
import { formatPhone } from "@/lib/phone";
import { formatKes, prettyDate, salonMidnight, addDaysStr, todayStr } from "@/lib/time";

export const dynamic = "force-dynamic";

const STYLE: Record<string, string> = {
  SUCCESS: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  TIMEOUT: "bg-gray-100 text-gray-600",
  FAILED: "bg-red-100 text-red-600",
};

export default async function PaymentsPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = ["SUCCESS", "PENDING", "FAILED", "CANCELLED", "TIMEOUT"].includes(searchParams.status || "")
    ? searchParams.status
    : undefined;
  const today = todayStr();
  const [payments, monthSum] = await Promise.all([
    prisma.payment.findMany({
      where: status ? { status } : {},
      include: { appointment: { include: { customer: true, service: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { status: "SUCCESS", paidAt: { gte: salonMidnight(addDaysStr(today, -29)) } },
    }),
  ]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-charcoal">Payments</h1>
        <p className="mt-1 text-sm text-charcoal-muted">
          Every online payment, with references for matching against your payment dashboard.
          {!providerInfo() && " Online payments are not switched on yet (see PAYMENTS_SETUP.md)."}
          {providerInfo()?.mode === "test" && ` ${providerInfo()!.name} is in test mode (no real money).`}
        </p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:max-w-md">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-charcoal-muted">Received · 30 days</p>
          <p className="mt-1 font-display text-2xl font-bold">{formatKes(monthSum._sum.amount ?? 0)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-charcoal-muted">Payments · 30 days</p>
          <p className="mt-1 font-display text-2xl font-bold">{monthSum._count}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[undefined, "SUCCESS", "PENDING", "FAILED", "CANCELLED", "TIMEOUT"].map((s) => (
          <Link
            key={s || "all"}
            href={s ? `/admin/payments?status=${s}` : "/admin/payments"}
            className={`badge ring-1 ${status === s ? "bg-royal-600 text-white ring-royal-600" : "bg-white text-charcoal-muted ring-black/10"}`}
          >
            {s ? s[0] + s.slice(1).toLowerCase() : "All"}
          </Link>
        ))}
      </div>

      {payments.length === 0 ? (
        <div className="card p-10 text-center text-charcoal-muted">No online payments yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-xs uppercase tracking-wide text-charcoal-muted">
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-3 text-xs text-charcoal-muted">
                    {p.createdAt.toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/customers/${p.appointment.customerId}`} className="font-medium hover:text-royal-600">
                      {p.appointment.customer.name}
                    </Link>
                    <p className="text-xs text-charcoal-muted">
                      {p.channel === "MPESA" && p.phone ? `M-Pesa ${formatPhone(p.phone)}` : "Card / online"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-charcoal-soft">
                    {p.appointment.service.name}
                    <br />
                    {prettyDate(p.appointment.date)} · {p.purpose.toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatKes(p.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STYLE[p.status] || "bg-gray-100"}`}>
                      {p.status[0] + p.status.slice(1).toLowerCase()}
                    </span>
                    {p.status !== "SUCCESS" && p.resultDesc && (
                      <p className="mt-1 max-w-[200px] text-xs text-charcoal-muted">{p.resultDesc}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-700">
                    {p.receiptNumber || p.reference}
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
