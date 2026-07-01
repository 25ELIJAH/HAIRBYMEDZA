"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveSettings } from "@/lib/admin-actions";

interface SettingsValues {
  slotIntervalMin: number;
  maxPerDay: number;
  salonName: string;
  phone: string;
  email: string;
  location: string;
  outcallFeeKes: number;
  mpesaNumber: string;
  depositPercent: number;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : "Save settings"}
    </button>
  );
}

export default function SettingsForm({ settings }: { settings: SettingsValues }) {
  const [state, formAction] = useFormState(saveSettings, null as
    | { ok?: boolean; error?: string }
    | null);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className="label">Slot interval (minutes)</span>
        <input name="slotIntervalMin" type="number" min={15} step={15} defaultValue={settings.slotIntervalMin} className="input" />
      </label>
      <label className="block">
        <span className="label">Max appointments / day (0 = unlimited)</span>
        <input name="maxPerDay" type="number" min={0} defaultValue={settings.maxPerDay} className="input" />
      </label>
      <label className="block">
        <span className="label">Salon name</span>
        <input name="salonName" defaultValue={settings.salonName} className="input" />
      </label>
      <label className="block">
        <span className="label">WhatsApp / phone</span>
        <input name="phone" defaultValue={settings.phone} className="input" />
      </label>
      <label className="block">
        <span className="label">Email</span>
        <input name="email" defaultValue={settings.email} className="input" />
      </label>
      <label className="block">
        <span className="label">Home visit fee (KES)</span>
        <input name="outcallFeeKes" type="number" min={0} defaultValue={settings.outcallFeeKes} className="input" />
      </label>
      <label className="block">
        <span className="label">M-Pesa number (for deposits)</span>
        <input name="mpesaNumber" defaultValue={settings.mpesaNumber} className="input" placeholder="07XX XXX XXX" />
      </label>
      <label className="block">
        <span className="label">Deposit percent (%)</span>
        <input name="depositPercent" type="number" min={0} max={100} defaultValue={settings.depositPercent} className="input" />
      </label>
      <label className="block sm:col-span-2">
        <span className="label">Location / address</span>
        <input name="location" defaultValue={settings.location} className="input" />
      </label>

      <div className="flex items-center gap-3 sm:col-span-2">
        <SaveButton />
        {state?.ok && (
          <span className="text-sm font-medium text-emerald-600">Saved</span>
        )}
        {state?.error && (
          <span className="text-sm font-medium text-red-600">{state.error}</span>
        )}
      </div>
    </form>
  );
}
