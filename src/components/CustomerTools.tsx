"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { importCustomers, mergeDuplicateCustomers, saveCustomer } from "@/lib/client-actions";

type State = { ok?: boolean; error?: string; message?: string } | null;

function Submit({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary !px-4 !py-2 text-sm" disabled={pending}>
      {pending ? busy : label}
    </button>
  );
}

function Feedback({ state }: { state: State }) {
  if (!state) return null;
  return state.error ? (
    <p className="text-sm font-medium text-red-600">{state.error}</p>
  ) : (
    <p className="text-sm font-medium text-emerald-700">{state.message || "Saved."}</p>
  );
}

/** Add a new client, or edit an existing one when `customer` is given. */
export function CustomerForm({
  customer,
}: {
  customer?: { id: string; name: string; phone: string; email: string | null; notes: string | null };
}) {
  const [state, action] = useFormState(saveCustomer, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && !customer) ref.current?.reset();
  }, [state, customer]);
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2">
      {customer && <input type="hidden" name="id" value={customer.id} />}
      <label className="block">
        <span className="label">Name *</span>
        <input name="name" required defaultValue={customer?.name} className="input" />
      </label>
      <label className="block">
        <span className="label">Phone *</span>
        <input name="phone" required defaultValue={customer?.phone} placeholder="07XX XXX XXX" className="input" />
      </label>
      <label className="block sm:col-span-2">
        <span className="label">Email</span>
        <input name="email" type="email" defaultValue={customer?.email || ""} className="input" />
      </label>
      <label className="block sm:col-span-2">
        <span className="label">Notes (allergies, hair type, preferences)</span>
        <textarea name="notes" defaultValue={customer?.notes || ""} className="input min-h-[60px]" />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Submit label={customer ? "Save changes" : "Add client"} busy="Saving…" />
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function ImportCustomersForm() {
  const [state, action] = useFormState(importCustomers, null);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-charcoal-muted">
        Paste one client per line: <code>Name, Phone, Email, Notes</code>. You can copy rows straight
        from Excel or Google Sheets, or from your phone contacts / old booking emails. Clients already
        on file are matched by phone and not duplicated.
      </p>
      <textarea
        name="rows"
        className="input min-h-[140px] font-mono text-xs"
        placeholder={"Jane Wanjiku, 0712345678, jane@email.com, sensitive scalp\nAmina Hassan, +254 722 000 111"}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Submit label="Import clients" busy="Importing…" />
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function MergeDuplicatesButton() {
  const [state, action] = useFormState(mergeDuplicateCustomers, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <Submit label="Find & merge duplicates" busy="Checking…" />
      <Feedback state={state} />
    </form>
  );
}
