"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Icon from "./Icon";
import { StatusBadge, PaymentBadge, TypeBadge } from "./StatusBadge";
import {
  addAppointmentNote,
  updateAppointmentStatus,
  updatePaymentStatus,
} from "@/lib/admin-actions";
import { recordManualPayment, requestMpesaPayment } from "@/lib/client-actions";
import { formatPhone } from "@/lib/phone";
import { formatKes, minutesToLabel, prettyDate } from "@/lib/time";

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

  return (
    <div
      className={`card p-4 ${pending ? "opacity-60" : ""} ${
        appt.overdue ? "ring-2 ring-amber-300" : ""
      }`}
    >
      {appt.overdue && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          This day has passed. Mark it completed (to count the revenue) or cancelled.
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/customers/${appt.customerId}`}
              className="font-display text-lg font-semibold text-charcoal hover:text-royal-600"
            >
              {appt.customerName}
            </Link>
            <StatusBadge status={appt.status} />
            <TypeBadge type={appt.serviceType} />
            <PaymentBadge status={appt.paymentStatus} />
            {appt.source !== "WEBSITE" && (
              <span className="badge bg-gray-100 text-gray-600">Added by you</span>
            )}
          </div>
          <p className="mt-1 text-sm text-charcoal-muted">
            {appt.serviceName} · {prettyDate(appt.date)} ·{" "}
            {minutesToLabel(appt.startMin)} to {minutesToLabel(appt.endMin)}
          </p>
          <p className="mt-0.5 text-sm text-charcoal-muted">
            <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer" className="text-royal-600 hover:underline">
              {formatPhone(appt.customerPhone)}
            </a>
            {appt.customerEmail ? ` · ${appt.customerEmail}` : ""}
          </p>
        </div>
        <div className="text-right">
          <div className="font-display text-lg font-bold text-royal-600">
            {formatKes(appt.priceKes)}
          </div>
          {appt.amountPaid > 0 && (
            <div className="text-xs font-medium text-emerald-700">
              Paid {formatKes(appt.amountPaid)}
            </div>
          )}
          <button
            onClick={() => setOpen((o) => !o)}
            className="mt-1 text-xs font-medium text-charcoal-muted hover:text-royal-600"
          >
            {open ? "Hide details ▲" : "Details ▼"}
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {appt.status === "PENDING" && (
          <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => act(() => updateAppointmentStatus(appt.id, "CONFIRMED"))}>
            Confirm
          </button>
        )}
        {(appt.status === "CONFIRMED" || appt.status === "PENDING") && (
          <button className="btn-outline !px-3 !py-1.5 text-xs" onClick={() => act(() => updateAppointmentStatus(appt.id, "COMPLETED"))}>
            Mark completed
          </button>
        )}
        {appt.status !== "CANCELLED" && appt.status !== "COMPLETED" && (
          <button
            className="btn !px-3 !py-1.5 text-xs text-red-600 hover:bg-red-50"
            onClick={() => {
              if (confirm("Cancel this appointment? The client will be notified.")) {
                act(() => updateAppointmentStatus(appt.id, "CANCELLED"));
              }
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4 space-y-4 border-t border-black/5 pt-4 text-sm">
          {/* Payment / M-Pesa */}
          {(appt.amountPaid > 0 || appt.mpesaNumber || appt.mpesaMessage) && (
            <div className="rounded-xl bg-gold/10 p-3 ring-1 ring-gold/30">
              <p className="mb-1 font-semibold text-royal-700">Payment / M-Pesa</p>
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
            <div className="rounded-xl bg-lavender-50 p-3">
              <p className="mb-1 inline-flex items-center gap-1.5 font-semibold text-royal-700">
                <Icon name="pin" size={16} /> Home visit location
              </p>
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

          {/* Online payment history (Paystack) + actions */}
          <div className="rounded-xl bg-white p-3 ring-1 ring-black/5">
            <p className="mb-2 font-semibold text-royal-700">
              Payments · balance {formatKes(balance)}
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
                      {p.channel === "MPESA" && p.phone ? `M-Pesa prompt to ${formatPhone(p.phone)}` : "Card / online checkout"} ·{" "}
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
                      className="btn-outline !px-3 !py-1.5 text-xs"
                      onClick={() => payAct(() => requestMpesaPayment(appt.id, "BALANCE"))}
                    >
                      Request {formatKes(balance)} via M-Pesa
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-charcoal-muted">
                    Online payments (Paystack) are not switched on yet (see PAYMENTS_SETUP.md).
                  </p>
                )}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="label">Record cash / manual payment (KES)</span>
                <input
                  className="input !w-32"
                  type="number"
                  min={1}
                  value={manual.amount}
                  onChange={(e) => setManual({ ...manual, amount: e.target.value })}
                />
              </label>
              <label className="block flex-1">
                <span className="label">Reference (optional)</span>
                <input
                  className="input"
                  value={manual.ref}
                  onChange={(e) => setManual({ ...manual, ref: e.target.value })}
                  placeholder="e.g. Cash, or M-Pesa code"
                />
              </label>
              <button
                className="btn-outline !px-3 !py-2 text-xs"
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
            <p className="label">Payment status</p>
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
            <p className="label">Internal note</p>
            <textarea
              className="input min-h-[60px]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Visible to staff only…"
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
