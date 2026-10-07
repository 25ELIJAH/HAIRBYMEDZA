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
    <div className="space-y-3">
      <PageHeader title="Hours & settings" />

      {/* Working hours */}
      <Setting title="Working hours" summary={`Open ${days.filter((d) => d.isOpen).length} days a week`}>
        <WorkingHoursForm days={days} />
      </Setting>

      {/* Blocked dates */}
      <Setting
        title="Days off"
        summary={blocked.length ? `${blocked.length} day${blocked.length === 1 ? "" : "s"} blocked` : "None blocked"}
      >
        <form action={addBlockedDate} className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap">
          <label className="col-span-2 block sm:col-span-1">
            <span className="label">Date</span>
            <input type="date" name="date" required className="input" />
          </label>
          <label className="col-span-2 block sm:col-span-1">
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
          <ul className="mt-5 divide-y divide-gray-100 border-t border-gray-100">
            {blocked.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-charcoal">{prettyDate(b.date)}</p>
                  <p className="truncate text-xs text-charcoal-muted">
                    {b.type[0] + b.type.slice(1).toLowerCase()}
                    {b.reason ? ` · ${b.reason}` : ""}
                  </p>
                </div>
                <form action={removeBlockedDate.bind(null, b.id)}>
                  <button className="text-sm font-medium text-red-600 hover:underline">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Setting>

      {/* Online payments status (provider keys live in environment variables) */}
      <Setting
        title="Online payments"
        summary={provider ? `${provider.name} · ${provider.mode === "live" ? "live" : "test mode"}` : "Off"}
      >
        {provider ? (
          <div className="space-y-1 text-sm">
            <p className="font-medium text-charcoal">
              {provider.name} is on ({provider.mode === "live" ? "live payments" : "test mode, no real money"})
            </p>
            <p className="text-charcoal-muted">
              Clients pay the full price when they book with an M-Pesa prompt
              {provider.name === "Paystack" ? " or card" : ""}. You can also request payment from any
              appointment.
            </p>
            <p className="break-all text-xs text-charcoal-muted">
              Webhook URL to set in {provider.name}: {siteUrl() || "(set NEXT_PUBLIC_SITE_URL)"}
              {provider.name === "IntaSend" ? "/api/payments/intasend/webhook" : "/api/payments/paystack/webhook"}
            </p>
          </div>
        ) : (
          <p className="text-sm text-charcoal-muted">
            Not switched on yet. Clients are asked to send money to M-Pesa{" "}
            {settings.mpesaNumber || "number"}. Add IntaSend (or Paystack) keys to the hosting
            environment variables to switch on M-Pesa prompts (see <code>PAYMENTS_SETUP.md</code>).
          </p>
        )}
      </Setting>

      {/* Booking rules & contact */}
      <Setting title="Business details & booking rules" summary={settings.salonName}>
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
      </Setting>
    </div>
  );
}

function Setting({ title, summary, children }: { title: string; summary?: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-gray-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold text-charcoal">{title}</span>
          {summary && <span className="block truncate text-[13px] text-charcoal-muted">{summary}</span>}
        </span>
        <span className="shrink-0 text-sm font-medium text-royal-700 group-open:hidden">Edit</span>
        <span className="hidden shrink-0 text-sm font-medium text-charcoal-muted group-open:inline">Close</span>
      </summary>
      <div className="border-t border-gray-100 p-4 sm:p-5">{children}</div>
    </details>
  );
}
