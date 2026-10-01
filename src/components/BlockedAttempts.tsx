"use client";

import { useState, useTransition } from "react";
import { dismissBlockedBooking, restoreBlockedBooking } from "@/lib/client-actions";
import { minutesToLabel, prettyDate } from "@/lib/time";

export interface BlockedAttempt {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  date: string;
  startMin: number;
}

// Website bookings the spam filter held back. Real clients can be restored
// into proper bookings with one tap.
export default function BlockedAttempts({ attempts }: { attempts: BlockedAttempt[] }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  if (attempts.length === 0) {
    return (
      <div className="card p-10 text-center text-charcoal-muted">
        Nothing held by the spam filter.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-lavender-50 px-4 py-3 text-sm text-charcoal-soft">
        These booking attempts tripped the spam filter. If you recognise a real client, tap{" "}
        <strong>Restore</strong> to turn it into a normal booking.
      </p>
      {msg && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{msg}</p>}
      {attempts.map((a) => (
        <div key={a.id} className={`card flex flex-wrap items-center justify-between gap-3 p-4 ${pending ? "opacity-60" : ""}`}>
          <div>
            <p className="font-medium text-charcoal">{a.name || "Unknown"} · {a.phone}</p>
            <p className="text-xs text-charcoal-muted">
              Wanted {a.date ? `${prettyDate(a.date)} at ${minutesToLabel(a.startMin)}` : "an unknown time"} ·
              tried {new Date(a.createdAt).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="btn-primary !px-3 !py-1.5 text-xs"
              onClick={() =>
                start(async () => {
                  const r = await restoreBlockedBooking(a.id);
                  setMsg(r?.error || null);
                })
              }
            >
              Restore
            </button>
            <button
              className="btn-ghost !px-3 !py-1.5 text-xs"
              onClick={() => start(() => dismissBlockedBooking(a.id))}
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
