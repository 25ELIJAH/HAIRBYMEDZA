"use client";

import { useFormState, useFormStatus } from "react-dom";
import { backfillPaymentHistory } from "@/lib/client-actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-outline !px-3 !py-1.5 text-xs" disabled={pending}>
      {pending ? "Adding…" : "Add to history"}
    </button>
  );
}

/** Moves money recorded on bookings before payment logging into the history. */
export function BackfillButton({ count, total }: { count: number; total: string }) {
  const [state, action] = useFormState(backfillPaymentHistory, null);
  if (state?.ok) {
    return <p className="text-sm font-medium text-emerald-700">{state.message}</p>;
  }
  return (
    <form action={action} className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-charcoal-soft">
        {count} older booking{count === 1 ? " has" : "s have"} {total} paid that is not in this history yet.
      </p>
      <Submit />
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
