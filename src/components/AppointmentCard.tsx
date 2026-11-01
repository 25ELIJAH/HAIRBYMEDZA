"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  addAppointmentNote,
  updateAppointmentStatus,
  updatePaymentStatus,
} from "@/lib/admin-actions";
import { recordManualPayment, requestMpesaPayment } from "@/lib/client-actions";
import { formatPhone } from "@/lib/phone";
import { paymentMethod } from "@/lib/payment-labels";
import { formatKes, minutesToLabel, shortDate } from "@/lib/time";

export interface PaymentData {
  id: string;
  status: string;
  amount: number;
  channel: string;
  phone: string | null;
  receiptNumber: string | null;
  createdAt: string;
  resultDesc: string | null;
}

const PAY_STYLE: Record<string, string> = {
  SUCCESS: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  TIMEOUT: "bg-gray-100 text-gray-600",
  FAILED: "bg-red-100 text-red-600",
};

export interface ApptData {
  id: string;
  date: string;
  startMin: number;
  endMin: number;
  status: string;
  paymentStatus: string;
  serviceType: string;
  priceKes: number;
  amountPaid: number;
  mpesaNumber: string | null;
  mpesaMessage: string | null;
  notes: string | null;
  estate: string | null;
  houseNumber: string | null;
  landmark: string | null;
  mapsPin: string | null;
  travelNotes: string | null;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  serviceName: string;
  serviceImage?: string | null;
  source: string;
  createdAt: string;
  overdue: boolean;
  payments: PaymentData[];
}

export default function AppointmentCard({
  appt,
  stkEnabled = false,
}: {
  appt: ApptData;
  stkEnabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(appt.notes || "");
  const [payMsg, setPayMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [manual, setManual] = useState({ amount: "", ref: "" });
  const waNumber = appt.customerPhone.replace(/[^0-9]/g, "");
  const balance = Math.max(0, appt.priceKes - appt.amountPaid);

  const act = (fn: () => Promise<void>) => startTransition(() => void fn());
  const payAct = (fn: () => Promise<{ ok?: boolean; error?: string; message?: string } | null>) =>
    startTransition(async () => {
      const r = await fn();
      setPayMsg(r?.error ? { ok: false, text: r.error } : { ok: true, text: r?.message || "Done." });
    });

  const STATUS: Record<string, { label: string; cls: string }> = {
    PENDING: { label: "Pending", cls: "bg-amber-100 text-amber-800" },
    CONFIRMED: { label: "Confirmed", cls: "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-sm" },
    COMPLETED: { label: "Completed", cls: "bg-gray-200/80 text-gray-700" },
    CANCELLED: { label: "Cancelled", cls: "bg-rose-100 text-rose-700" },
  };
  const PAY: Record<string, { label: string; cls: string }> = {
    PAID: { label: "Paid", cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
    PARTIAL: { label: `Paid ${formatKes(appt.amountPaid)}`, cls: "bg-amber-50 text-amber-800 ring-1 ring-amber-200" },
    REFUND: { label: "Refunded", cls: "bg-gray-100 text-gray-600 ring-1 ring-gray-200" },
    UNPAID: { label: "Not paid", cls: "bg-white text-charcoal-muted ring-1 ring-gray-200" },
  };
  const st = STATUS[appt.status] || { label: appt.status, cls: "bg-gray-100 text-gray-700" };
  const pay = PAY[appt.paymentStatus] || PAY.UNPAID;
  const done = appt.status === "COMPLETED" || appt.status === "CANCELLED";

  return (
    <div
      className={`min-w-0 rounded-3xl border p-4 transition sm:p-5 ${pending ? "opacity-60" : ""} ${
        done
          ? "border-violet-100/70 bg-[#f3f0fa]"
          : appt.overdue
            ? "border-amber-200 bg-white shadow-[0_12px_32px_-20px_rgba(76,29,149,0.35)]"
            : "border-violet-100 bg-white shadow-[0_12px_32px_-20px_rgba(76,29,149,0.35)]"
      }`}
    >
      <div className="flex gap-4">
        {/* Style photo */}
        <div
          className={`h-[104px] w-[88px] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-50 sm:h-[116px] sm:w-[100px] ${
            done ? "opacity-60 grayscale" : ""
          }`}
        >
          {appt.serviceImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={appt.serviceImage} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center font-brand text-2xl text-violet-300">
              {appt.serviceName[0]}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3
              className={`font-brand text-[19px] font-medium leading-snug sm:text-[21px] ${
                done ? "text-charcoal-muted" : "text-charcoal"
              }`}
            >
              {appt.serviceName}
            </h3>
            <span className="shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-charcoal">
              {formatKes(appt.priceKes)}
            </span>
          </div>
          <p className="mt-1 text-[13.5px] font-medium tabular-nums text-charcoal">
            {shortDate(appt.date)} • {minutesToLabel(appt.startMin)}
            <span className="hidden font-normal text-charcoal-muted sm:inline"> to {minutesToLabel(appt.endMin)}</span>
          </p>
          <p className="mt-0.5 truncate text-[13px] text-charcoal-muted">
            Client:{" "}
            <Link href={`/admin/customers/${appt.customerId}`} className="font-medium text-charcoal-soft hover:text-violet-700">
              {appt.customerName}
            </Link>
          </p>
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-[13px] tabular-nums text-charcoal-muted hover:text-violet-700"
          >
            {formatPhone(appt.customerPhone)}
          </a>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>{st.label}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${pay.cls}`}>{pay.label}</span>
            <span className="text-xs text-charcoal-muted">
              {appt.serviceType === "OUTCALL" ? "Home visit" : "Studio"}
              {appt.source !== "WEBSITE" ? " · added by you" : ""}
            </span>
          </div>
        </div>
      </div>

      {appt.overdue && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          This date has passed. Close it as completed or cancelled.
        </p>
      )}

      {/* Actions */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {done ? (
          <Link
            href={`/admin/appointments/new?customer=${appt.customerId}`}
            className="col-span-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 py-2.5 text-center text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(124,58,237,0.6)] transition hover:from-violet-700 hover:to-fuchsia-600 sm:col-span-1"
          >
            Book again
          </Link>
        ) : (
          <>
            {appt.status === "PENDING" && !appt.overdue ? (
              <button
                className="rounded-xl border border-violet-300 bg-white py-2.5 text-sm font-semibold text-violet-800 transition hover:bg-violet-50"
                onClick={() => act(() => updateAppointmentStatus(appt.id, "CONFIRMED"))}
              >
                Confirm
              </button>
            ) : (
              <button
                className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                  appt.overdue
                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:from-violet-700 hover:to-fuchsia-600"
                    : "border border-violet-300 bg-white text-violet-800 hover:bg-violet-50"
                }`}
                onClick={() => act(() => updateAppointmentStatus(appt.id, "COMPLETED"))}
              >
                Mark completed
              </button>
            )}
            <button
              className="rounded-xl bg-rose-50 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
              onClick={() => {
                if (confirm("Cancel this appointment? The client will be notified.")) {
                  act(() => updateAppointmentStatus(appt.id, "CANCELLED"));
                }
              }}
            >
              Cancel
            </button>
          </>
        )}
      </div>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-2 w-full py-1.5 text-center text-xs font-medium text-violet-700 hover:text-violet-900"
      >
        {open ? "Hide details" : "Payments, notes & details"}
      </button>

      {open && (
        <div className="mt-2 space-y-4 rounded-2xl bg-violet-50/50 p-4 text-sm ring-1 ring-violet-100">
          {/* Payment / M-Pesa */}
          {(appt.amountPaid > 0 || appt.mpesaNumber || appt.mpesaMessage) && (
            <div className="rounded-xl bg-white p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-charcoal-muted">Payment details</p>
              <p className="text-charcoal-soft">
                Paid: <strong>{formatKes(appt.amountPaid)}</strong> of {formatKes(appt.priceKes)}
                {appt.mpesaNumber ? ` · from ${formatPhone(appt.mpesaNumber)}` : ""}
              </p>
              {appt.mpesaMessage && (
                <p className="mt-1 break-words text-charcoal-muted">“{appt.mpesaMessage}”</p>
              )}
            </div>
          )}

          {appt.serviceType === "OUTCALL" && (
            <div className="rounded-xl bg-white p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-charcoal-muted">Home visit location</p>
              <p className="text-charcoal-soft">
                {[appt.estate, appt.houseNumber].filter(Boolean).join(", ") || "Not given"}
                {appt.landmark ? ` · Landmark: ${appt.landmark}` : ""}
              </p>
              {appt.travelNotes && <p className="mt-1 text-charcoal-muted">{appt.travelNotes}</p>}
              {appt.mapsPin && (
                <a href={appt.mapsPin} target="_blank" rel="noreferrer" className="text-violet-700 hover:underline">
                  Open map pin ↗
                </a>
              )}
            </div>
          )}

          {/* Payment history + actions */}
          <div>
            <p className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wide text-charcoal-muted">
              <span>Payments</span>
              <span className="normal-case tracking-normal">Balance {formatKes(balance)}</span>
            </p>
            {appt.payments.length > 0 && (
              <ul className="mb-3 space-y-1.5">
                {appt.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`badge ${PAY_STYLE[p.status] || "bg-gray-100"}`}>
                      {p.status[0] + p.status.slice(1).toLowerCase()}
                    </span>
                    <span className="font-medium">{formatKes(p.amount)}</span>
                    <span className="text-charcoal-muted">
                      {p.channel === "MPESA" && p.phone ? `M-Pesa ${formatPhone(p.phone)}` : paymentMethod(p)} ·{" "}
                      {new Date(p.createdAt).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}
                    </span>
                    {p.receiptNumber && (
                      <span className="font-mono font-semibold text-emerald-700">{p.receiptNumber}</span>
                    )}
                    {p.status === "FAILED" && p.resultDesc && (
                      <span className="text-red-600">{p.resultDesc}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {balance > 0 && appt.status !== "CANCELLED" && (
              <div className="flex flex-wrap gap-2">
                {stkEnabled ? (
                  <>
                    <button
                      className="btn-outline w-full !px-3 !py-2 text-xs sm:w-auto"
                      onClick={() => payAct(() => requestMpesaPayment(appt.id, "BALANCE"))}
                    >
                      Request {formatKes(balance)} via M-Pesa
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-charcoal-muted">
                    Online payments are not switched on yet.
                  </p>
                )}
              </div>
            )}
            <div className="mt-3 grid grid-cols-[7rem_1fr] items-end gap-2 sm:flex sm:flex-wrap">
              <label className="block">
                <span className="label">Cash received</span>
                <input
                  className="input sm:!w-32"
                  inputMode="numeric"
                  placeholder="KES"
                  type="number"
                  min={1}
                  value={manual.amount}
                  onChange={(e) => setManual({ ...manual, amount: e.target.value })}
                />
              </label>
              <label className="block min-w-0 sm:flex-1">
                <span className="label">Reference</span>
                <input
                  className="input"
                  value={manual.ref}
                  onChange={(e) => setManual({ ...manual, ref: e.target.value })}
                  placeholder="Cash or M-Pesa code"
                />
              </label>
              <button
                className="btn-outline col-span-2 !px-3 !py-2.5 text-xs sm:col-span-1"
                disabled={!Number(manual.amount)}
                onClick={() =>
                  payAct(async () => {
                    const r = await recordManualPayment(appt.id, Number(manual.amount), manual.ref);
                    if (r?.ok) setManual({ amount: "", ref: "" });
                    return r;
                  })
                }
              >
                Record
              </button>
            </div>
            {payMsg && (
              <p className={`mt-2 text-xs font-medium ${payMsg.ok ? "text-emerald-700" : "text-red-600"}`}>
                {payMsg.text}
              </p>
            )}
          </div>

          {/* Payment status */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal-muted">Payment status</p>
            <div className="flex flex-wrap gap-2">
              {["UNPAID", "PARTIAL", "PAID", "REFUND"].map((p) => (
                <button
                  key={p}
                  onClick={() => act(() => updatePaymentStatus(appt.id, p))}
                  className={`badge ring-1 transition ${
                    appt.paymentStatus === p
                      ? "bg-violet-700 text-white ring-violet-700"
                      : "bg-white text-charcoal-muted ring-black/10 hover:ring-violet-300"
                  }`}
                >
                  {p[0] + p.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-charcoal-muted">
            Booked {new Date(appt.createdAt).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}
            {appt.source === "WEBSITE" ? " on the website" : " by you"}
          </p>

          {/* Internal note */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal-muted">Private note</p>
            <textarea
              className="input min-h-[60px]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Only you can see this"
            />
            <button
              className="btn-outline mt-2 !px-3 !py-1.5 text-xs"
              onClick={() => act(() => addAppointmentNote(appt.id, note))}
            >
              Save note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
