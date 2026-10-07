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

  const statusDot: Record<string, string> = {
    PENDING: "bg-amber-400",
    CONFIRMED: "bg-royal-500",
    COMPLETED: "bg-emerald-500",
    CANCELLED: "bg-gray-300",
  };
  const statusText: Record<string, string> = {
    PENDING: "Pending",
    CONFIRMED: "Confirmed",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };
  const payText =
    appt.paymentStatus === "PAID"
      ? "Paid"
      : appt.paymentStatus === "PARTIAL"
        ? `Paid ${formatKes(appt.amountPaid)}`
        : appt.paymentStatus === "REFUND"
          ? "Refunded"
          : "Not paid";
  const dayLabel = shortDate(appt.date);

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white transition ${pending ? "opacity-60" : ""} ${
        appt.overdue ? "border-amber-300" : "border-gray-200"
      }`}
    >
      <div className="flex gap-4 p-4 sm:p-5">
        {/* When */}
        <div className="w-[5.25rem] shrink-0 border-r border-gray-100 pr-3 sm:w-24 sm:pr-4">
          <p className="whitespace-nowrap text-xs text-charcoal-muted">{dayLabel}</p>
          <p className="mt-0.5 whitespace-nowrap text-sm font-semibold tabular-nums text-charcoal">{minutesToLabel(appt.startMin)}</p>
          <p className="whitespace-nowrap text-xs tabular-nums text-charcoal-muted">{minutesToLabel(appt.endMin)}</p>
        </div>

        {/* Who / what */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/admin/customers/${appt.customerId}`}
                className="block truncate text-[15px] font-semibold text-charcoal hover:text-royal-700"
              >
                {appt.customerName}
              </Link>
              <p className="truncate text-sm text-charcoal-soft">{appt.serviceName}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[15px] font-semibold tabular-nums text-charcoal">{formatKes(appt.priceKes)}</p>
              <p
                className={`text-xs font-medium ${
                  appt.paymentStatus === "PAID"
                    ? "text-emerald-700"
                    : appt.paymentStatus === "PARTIAL"
                      ? "text-amber-700"
                      : "text-charcoal-muted"
                }`}
              >
                {payText}
              </p>
            </div>
          </div>

          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-charcoal-muted">
            <span className="inline-flex items-center gap-1.5 font-medium text-charcoal-soft">
              <span className={`h-1.5 w-1.5 rounded-full ${statusDot[appt.status] || "bg-gray-300"}`} />
              {statusText[appt.status] || appt.status}
            </span>
            <span>·</span>
            <span>{appt.serviceType === "OUTCALL" ? "Home visit" : "Studio"}</span>
            {appt.source !== "WEBSITE" && (
              <>
                <span>·</span>
                <span>Added by you</span>
              </>
            )}
          </p>
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-xs font-medium tabular-nums text-royal-700 hover:underline"
          >
            {formatPhone(appt.customerPhone)}
          </a>
          {appt.overdue && (
            <p className="mt-2 text-xs font-medium text-amber-700">Date has passed. Close it as completed or cancelled.</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50/60 px-4 py-2.5 sm:px-5">
        {appt.status === "PENDING" && !appt.overdue && (
          <button
            className="btn-primary flex-1 !px-3 !py-2 text-xs sm:flex-none"
            onClick={() => act(() => updateAppointmentStatus(appt.id, "CONFIRMED"))}
          >
            Confirm
          </button>
        )}
        {(appt.status === "CONFIRMED" || appt.status === "PENDING") && (
          <button
            className={`${appt.overdue ? "btn-primary" : "btn-outline"} flex-1 !px-3 !py-2 text-xs sm:flex-none`}
            onClick={() => act(() => updateAppointmentStatus(appt.id, "COMPLETED"))}
          >
            Completed
          </button>
        )}
        {appt.status !== "CANCELLED" && appt.status !== "COMPLETED" && (
          <button
            className="btn flex-1 !px-3 !py-2 text-xs text-red-600 hover:bg-red-50 sm:flex-none"
            onClick={() => {
              if (confirm("Cancel this appointment? The client will be notified.")) {
                act(() => updateAppointmentStatus(appt.id, "CANCELLED"));
              }
            }}
          >
            Cancel
          </button>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="btn ml-auto shrink-0 !px-3 !py-2 text-xs text-charcoal-soft hover:bg-gray-100"
        >
          {open ? "Less" : "More"}
        </button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-gray-100 p-4 text-sm sm:p-5">
          {/* Payment / M-Pesa */}
          {(appt.amountPaid > 0 || appt.mpesaNumber || appt.mpesaMessage) && (
            <div className="rounded-lg bg-gray-50 p-3">
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
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-charcoal-muted">Home visit location</p>
              <p className="text-charcoal-soft">
                {[appt.estate, appt.houseNumber].filter(Boolean).join(", ") || "Not given"}
                {appt.landmark ? ` · Landmark: ${appt.landmark}` : ""}
              </p>
              {appt.travelNotes && <p className="mt-1 text-charcoal-muted">{appt.travelNotes}</p>}
              {appt.mapsPin && (
                <a href={appt.mapsPin} target="_blank" rel="noreferrer" className="text-royal-600 hover:underline">
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
                      ? "bg-royal-600 text-white ring-royal-600"
                      : "bg-white text-charcoal-muted ring-black/10 hover:ring-royal-300"
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
