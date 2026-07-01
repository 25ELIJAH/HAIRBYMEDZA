"use client";

import { useState, useTransition } from "react";
import Icon from "./Icon";
import { StatusBadge, PaymentBadge, TypeBadge } from "./StatusBadge";
import {
  addAppointmentNote,
  updateAppointmentStatus,
  updatePaymentStatus,
} from "@/lib/admin-actions";
import { formatKes, minutesToLabel, prettyDate } from "@/lib/time";

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
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  serviceName: string;
}

export default function AppointmentCard({ appt }: { appt: ApptData }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(appt.notes || "");
  const waNumber = appt.customerPhone.replace(/[^0-9]/g, "");

  const act = (fn: () => Promise<void>) => startTransition(() => void fn());

  return (
    <div className={`card p-4 ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-semibold text-charcoal">
              {appt.customerName}
            </h3>
            <StatusBadge status={appt.status} />
            <TypeBadge type={appt.serviceType} />
            <PaymentBadge status={appt.paymentStatus} />
          </div>
          <p className="mt-1 text-sm text-charcoal-muted">
            {appt.serviceName} · {prettyDate(appt.date)} ·{" "}
            {minutesToLabel(appt.startMin)} to {minutesToLabel(appt.endMin)}
          </p>
          <p className="mt-0.5 text-sm text-charcoal-muted">
            <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer" className="text-royal-600 hover:underline">
              {appt.customerPhone}
            </a>
            {appt.customerEmail ? ` · ${appt.customerEmail}` : ""}
          </p>
        </div>
        <div className="text-right">
          <div className="font-display text-lg font-bold text-royal-600">
            {formatKes(appt.priceKes)}
          </div>
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
          {/* Deposit / M-Pesa */}
          {(appt.amountPaid > 0 || appt.mpesaNumber || appt.mpesaMessage) && (
            <div className="rounded-xl bg-gold/10 p-3 ring-1 ring-gold/30">
              <p className="mb-1 font-semibold text-royal-700">Deposit / M-Pesa</p>
              <p className="text-charcoal-soft">
                Paid: <strong>{formatKes(appt.amountPaid)}</strong> of {formatKes(appt.priceKes)}
                {appt.mpesaNumber ? ` · from ${appt.mpesaNumber}` : ""}
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
