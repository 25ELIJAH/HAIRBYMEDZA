"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveWorkingHours } from "@/lib/admin-actions";
import { DAY_NAMES, minutesToHHMM } from "@/lib/time";

export interface DayHours {
  dayOfWeek: number;
  isOpen: boolean;
  startMin: number;
  endMin: number;
  lunchStartMin: number | null;
  lunchEndMin: number | null;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : "Save working hours"}
    </button>
  );
}

export default function WorkingHoursForm({ days }: { days: DayHours[] }) {
  const [state, formAction] = useFormState(saveWorkingHours, null as
    | { ok?: boolean; error?: string }
    | null);
  const byDay = new Map(days.map((d) => [d.dayOfWeek, d]));

  return (
    <form action={formAction}>
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
                  <input type="checkbox" name={`open_${dow}`} defaultChecked={h?.isOpen ?? false} className="h-4 w-4 accent-royal-600" />
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
      <div className="mt-5 flex items-center gap-3">
        <SaveButton />
        {state?.ok && <span className="text-sm font-medium text-emerald-600">Saved</span>}
        {state?.error && <span className="text-sm font-medium text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
