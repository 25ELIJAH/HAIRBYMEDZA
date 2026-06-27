"use client";

import { useState } from "react";
import { addDaysStr, toDateStr, todayStr } from "@/lib/time";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function MonthCalendar({
  value,
  onChange,
  isDisabled,
  monthsAhead = 3,
}: {
  value: string; // selected YYYY-MM-DD
  onChange: (date: string) => void;
  isDisabled: (date: string) => boolean;
  monthsAhead?: number;
}) {
  const today = todayStr();
  const [y0, m0] = today.split("-").map((n) => parseInt(n, 10));
  // view = first of the visible month
  const [view, setView] = useState({ year: y0, month: m0 - 1 }); // month 0-indexed

  const firstOfMonth = new Date(view.year, view.month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  // Limit navigation to today's month .. monthsAhead months later.
  const minView = { year: y0, month: m0 - 1 };
  const maxDate = new Date(y0, m0 - 1 + monthsAhead, 1);
  const canPrev =
    view.year > minView.year || (view.year === minView.year && view.month > minView.month);
  const canNext =
    view.year < maxDate.getFullYear() ||
    (view.year === maxDate.getFullYear() && view.month < maxDate.getMonth());

  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toDateStr(new Date(view.year, view.month, d)));
  }

  const move = (delta: number) =>
    setView((v) => {
      const nm = v.month + delta;
      return { year: v.year + Math.floor(nm / 12), month: ((nm % 12) + 12) % 12 };
    });

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => canPrev && move(-1)}
          disabled={!canPrev}
          aria-label="Previous month"
          className="grid h-9 w-9 place-items-center rounded-full text-charcoal-soft transition hover:bg-royal-50 disabled:opacity-30"
        >
          ‹
        </button>
        <div className="font-display text-base font-semibold text-charcoal">
          {MONTHS[view.month]} {view.year}
        </div>
        <button
          type="button"
          onClick={() => canNext && move(1)}
          disabled={!canNext}
          aria-label="Next month"
          className="grid h-9 w-9 place-items-center rounded-full text-charcoal-soft transition hover:bg-royal-50 disabled:opacity-30"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-charcoal-muted">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`e${i}`} />;
          const disabled = isDisabled(date);
          const selected = date === value;
          const isToday = date === today;
          const day = parseInt(date.split("-")[2], 10);
          return (
            <button
              key={date}
              type="button"
              disabled={disabled}
              onClick={() => onChange(date)}
              className={`relative grid aspect-square place-items-center rounded-xl text-sm font-medium transition ${
                selected
                  ? "bg-royal-gradient text-white shadow-soft"
                  : disabled
                    ? "text-charcoal-muted/30"
                    : "text-charcoal hover:bg-royal-50"
              }`}
            >
              {day}
              {isToday && !selected && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-royal-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
