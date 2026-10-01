import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { addBlockedDate, removeBlockedDate } from "@/lib/admin-actions";
import { getSettings } from "@/lib/booking";
import SettingsForm from "@/components/SettingsForm";
import WorkingHoursForm from "@/components/WorkingHoursForm";
import { prettyDate } from "@/lib/time";
import { siteUrl } from "@/lib/paystack";
import { providerInfo } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const provider = providerInfo();
  const [hoursRows, blocked, settings] = await Promise.all([
    prisma.workingHours.findMany({ orderBy: { dayOfWeek: "asc" } }),
    prisma.blockedDate.findMany({ orderBy: { date: "asc" } }),
    getSettings(),
  ]);

  const days = hoursRows.map((h) => ({
    dayOfWeek: h.dayOfWeek,
    isOpen: h.isOpen,
    startMin: h.startMin,
    endMin: h.endMin,
    lunchStartMin: h.lunchStartMin,
    lunchEndMin: h.lunchEndMin,
  }));

  return (
    <div className="space-y-8">
      <PageHeader title="Hours & settings" subtitle="Working hours, days off, payments and business details." />

      {/* Working hours */}
      <section className="card p-5">
        <h2 className="mb-4 text-base font-semibold text-charcoal">Working hours</h2>
        <WorkingHoursForm days={days} />
      </section>

      {/* Blocked dates */}
      <section className="card p-5">
        <h2 className="mb-4 text-base font-semibold text-charcoal">Holidays & blocked dates</h2>
        <form action={addBlockedDate} className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="label">Date</span>
            <input type="date" name="date" required className="input" />
          </label>
          <label className="block">
            <span className="label">Reason</span>
            <input name="reason" className="input" placeholder="e.g. Public Holiday" />
          </label>
          <label className="block">
            <span className="label">Type</span>
            <select name="type" className="input">
              <option value="HOLIDAY">Holiday</option>
              <option value="VACATION">Vacation</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </label>
          <button className="btn-primary">Block date</button>
        </form>

        {blocked.length > 0 && (
          <ul className="mt-5 divide-y divide-black/5">
            {blocked.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <span className="font-medium text-charcoal">{prettyDate(b.date)}</span>
                  <span className="ml-2 badge bg-royal-50 text-royal-700">{b.type}</span>
                  <span className="ml-2 text-sm text-charcoal-muted">{b.reason}</span>
                </div>
                <form action={removeBlockedDate.bind(null, b.id)}>
                  <button className="text-sm font-medium text-red-600 hover:underline">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Online payments status (provider keys live in environment variables) */}
      <section className="card p-5">
        <h2 className="mb-2 text-base font-semibold text-charcoal">Online payments</h2>
        {provider ? (
          <div className="space-y-1 text-sm">
            <p className="font-medium text-charcoal">
              ● {provider.name} switched on ({provider.mode === "live" ? "live payments" : "test mode, no real money"})
            </p>
            <p className="text-charcoal-muted">
              Clients pay the full price when they book with an M-Pesa prompt
              {provider.name === "Paystack" ? " or card" : ""}. You can also request payment from any
              appointment.
            </p>
            <p className="text-xs text-charcoal-muted">
              Webhook URL to set in {provider.name}: {siteUrl() || "(set NEXT_PUBLIC_SITE_URL)"}
              {provider.name === "IntaSend" ? "/api/payments/intasend/webhook" : "/api/payments/paystack/webhook"}
            </p>
          </div>
        ) : (
          <p className="text-sm text-charcoal-muted">
            ○ Not switched on yet. Clients are asked to send money to M-Pesa{" "}
            {settings.mpesaNumber || "number"}. Add IntaSend (or Paystack) keys to the hosting
            environment variables to switch on M-Pesa prompts (see <code>PAYMENTS_SETUP.md</code>).
          </p>
        )}
      </section>

      {/* Booking rules & contact */}
      <section className="card p-5">
        <h2 className="mb-4 text-base font-semibold text-charcoal">Booking rules & business info</h2>
        <SettingsForm
          settings={{
            slotIntervalMin: settings.slotIntervalMin,
            maxPerDay: settings.maxPerDay,
            salonName: settings.salonName,
            phone: settings.phone,
            email: settings.email,
            location: settings.location,
            outcallFeeKes: settings.outcallFeeKes,
            mpesaNumber: settings.mpesaNumber,
            depositPercent: settings.depositPercent,
          }}
        />
      </section>
    </div>
  );
}
