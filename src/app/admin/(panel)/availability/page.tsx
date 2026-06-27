import { prisma } from "@/lib/prisma";
import {
  addBlockedDate,
  removeBlockedDate,
  saveWorkingHours,
} from "@/lib/admin-actions";
import { getSettings } from "@/lib/booking";
import SettingsForm from "@/components/SettingsForm";
import ThemePicker from "@/components/ThemePicker";
import { DAY_NAMES, minutesToHHMM, prettyDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const [hoursRows, blocked, settings] = await Promise.all([
    prisma.workingHours.findMany({ orderBy: { dayOfWeek: "asc" } }),
    prisma.blockedDate.findMany({ orderBy: { date: "asc" } }),
    getSettings(),
  ]);

  // Ensure all 7 days exist for the form.
  const byDay = new Map(hoursRows.map((h) => [h.dayOfWeek, h]));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold text-charcoal">Availability</h1>
        <p className="mt-1 text-sm text-charcoal-muted">
          Working hours, lunch breaks, blocked days and booking rules.
        </p>
      </header>

      {/* Working hours */}
      <section className="card p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">Working hours</h2>
        <form action={saveWorkingHours}>
          <div className="space-y-2">
            <div className="hidden grid-cols-[110px_60px_1fr_1fr_1fr_1fr] gap-3 px-1 text-xs font-semibold uppercase tracking-wide text-charcoal-muted sm:grid">
              <span>Day</span>
              <span>Open</span>
              <span>Start</span>
              <span>End</span>
              <span>Lunch from</span>
              <span>Lunch to</span>
            </div>
            {Array.from({ length: 7 }, (_, dow) => {
              const h = byDay.get(dow);
              return (
                <div
                  key={dow}
                  className="rounded-xl bg-lavender-50/60 p-3 sm:grid sm:grid-cols-[110px_60px_1fr_1fr_1fr_1fr] sm:items-center sm:gap-3 sm:p-2"
                >
                  <div className="flex items-center justify-between sm:contents">
                    <span className="font-medium text-charcoal">{DAY_NAMES[dow]}</span>
                    <label className="flex items-center gap-2 sm:block">
                      <span className="text-xs text-charcoal-muted sm:hidden">Open</span>
                      <input
                        type="checkbox"
                        name={`open_${dow}`}
                        defaultChecked={h?.isOpen ?? false}
                        className="h-4 w-4 accent-royal-600"
                      />
                    </label>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:contents sm:mt-0">
                    <label className="block">
                      <span className="mb-1 block text-xs text-charcoal-muted sm:hidden">Start</span>
                      <input type="time" name={`start_${dow}`} defaultValue={minutesToHHMM(h?.startMin ?? 480)} className="input !py-1.5" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-charcoal-muted sm:hidden">End</span>
                      <input type="time" name={`end_${dow}`} defaultValue={minutesToHHMM(h?.endMin ?? 1080)} className="input !py-1.5" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-charcoal-muted sm:hidden">Lunch from</span>
                      <input type="time" name={`lunchStart_${dow}`} defaultValue={h?.lunchStartMin != null ? minutesToHHMM(h.lunchStartMin) : ""} className="input !py-1.5" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-charcoal-muted sm:hidden">Lunch to</span>
                      <input type="time" name={`lunchEnd_${dow}`} defaultValue={h?.lunchEndMin != null ? minutesToHHMM(h.lunchEndMin) : ""} className="input !py-1.5" />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
          <button className="btn-primary mt-5">Save working hours</button>
        </form>
      </section>

      {/* Blocked dates */}
      <section className="card p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">Holidays & blocked dates</h2>
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
                  <span className="ml-2 badge bg-lavender-100 text-royal-700">{b.type}</span>
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

      {/* Theme colour */}
      <section className="card p-5">
        <h2 className="mb-1 font-display text-lg font-semibold">Theme colour</h2>
        <p className="mb-4 text-sm text-charcoal-muted">
          Pick the colour for your whole booking system.
        </p>
        <ThemePicker current={settings.theme} />
      </section>

      {/* Booking rules & contact */}
      <section className="card p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">Booking rules & business info</h2>
        <SettingsForm
          settings={{
            slotIntervalMin: settings.slotIntervalMin,
            maxPerDay: settings.maxPerDay,
            salonName: settings.salonName,
            phone: settings.phone,
            email: settings.email,
            location: settings.location,
            outcallFeeKes: settings.outcallFeeKes,
          }}
        />
      </section>
    </div>
  );
}
