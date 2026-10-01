"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { addManualBooking } from "@/lib/client-actions";

interface ServiceOption {
  id: string;
  name: string;
  priceKes: number;
  outCallPriceKes: number;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : "Save booking"}
    </button>
  );
}

export default function ManualBookingForm({
  services,
  today,
  prefill,
}: {
  services: ServiceOption[];
  today: string;
  prefill?: { name: string; phone: string; email: string };
}) {
  const [state, action] = useFormState(addManualBooking, null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="card grid gap-4 p-5 sm:grid-cols-2">
      <h2 className="font-display text-lg font-semibold sm:col-span-2">Client</h2>
      <label className="block">
        <span className="label">Full name *</span>
        <input name="name" required defaultValue={prefill?.name} className="input" />
      </label>
      <label className="block">
        <span className="label">Phone *</span>
        <input name="phone" required defaultValue={prefill?.phone} placeholder="07XX XXX XXX" className="input" />
      </label>
      <label className="block sm:col-span-2">
        <span className="label">Email (optional)</span>
        <input name="email" type="email" defaultValue={prefill?.email} className="input" />
      </label>

      <h2 className="mt-2 font-display text-lg font-semibold sm:col-span-2">Booking</h2>
      <label className="block sm:col-span-2">
        <span className="label">Service *</span>
        <select name="serviceId" required className="input">
          <option value="">Choose…</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · KES {s.priceKes.toLocaleString("en-KE")} studio / KES{" "}
              {s.outCallPriceKes.toLocaleString("en-KE")} home
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">Date *</span>
        <input name="date" type="date" required defaultValue={today} className="input" />
      </label>
      <label className="block">
        <span className="label">Start time *</span>
        <input name="time" type="time" required step={900} defaultValue="09:00" className="input" />
      </label>
      <label className="block">
        <span className="label">Where</span>
        <select name="serviceType" className="input" defaultValue="INCALL">
          <option value="INCALL">At my studio</option>
          <option value="OUTCALL">I go to the client</option>
        </select>
      </label>
      <label className="block">
        <span className="label">Status</span>
        <select name="status" className="input" defaultValue="CONFIRMED">
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="COMPLETED">Completed (already done)</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </label>
      <label className="block">
        <span className="label">Price (KES) — blank uses the service price</span>
        <input name="priceKes" type="number" min={0} className="input" />
      </label>
      <label className="block">
        <span className="label">Amount already paid (KES)</span>
        <input name="amountPaid" type="number" min={0} defaultValue={0} className="input" />
      </label>
      <label className="block sm:col-span-2">
        <span className="label">M-Pesa code / payment note (optional)</span>
        <input name="mpesaMessage" className="input" placeholder="e.g. TJK4H2XYZ1" />
      </label>
      <label className="block sm:col-span-2">
        <span className="label">Client location (for home visits)</span>
        <input name="estate" className="input" placeholder="Estate, house, landmark" />
      </label>
      <label className="block sm:col-span-2">
        <span className="label">Notes</span>
        <textarea name="notes" className="input min-h-[70px]" />
      </label>
      <label className="flex items-center gap-2 text-sm text-charcoal-soft sm:col-span-2">
        <input type="checkbox" name="allowOverlap" /> Allow overlap with another booking (e.g. entering old records)
      </label>

      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Submit />
        {state?.error && <span className="text-sm font-medium text-red-600">{state.error}</span>}
        {state?.ok && <span className="text-sm font-medium text-emerald-700">{state.message}</span>}
      </div>
    </form>
  );
}
