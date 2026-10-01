"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { formatKes } from "@/lib/time";

type Phase = "idle" | "sending" | "waiting" | "SUCCESS" | "FAILED" | "CANCELLED" | "TIMEOUT" | "error";

/**
 * Pays a booking's deposit with an M-Pesa STK Push: the client gets a PIN
 * prompt on their phone, and this panel follows the payment until it settles.
 */
export default function MpesaPayPanel({
  appointmentId,
  defaultPhone,
  amount,
  autoStart,
  manualNumber,
  onPaid,
}: {
  appointmentId: string;
  defaultPhone: string;
  amount: number;
  autoStart?: boolean;
  manualNumber: string;
  onPaid?: (receipt: string | null) => void;
}) {
  const [phone, setPhone] = useState(defaultPhone);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string>("");
  const [receipt, setReceipt] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(false);

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  const poll = useCallback(
    (paymentId: string, startedAt: number) => {
      timer.current = setTimeout(async () => {
        try {
          const r = await fetch(`/api/payments/mpesa/status?id=${paymentId}`, { cache: "no-store" });
          const data = await r.json();
          if (r.ok && data.status && data.status !== "PENDING") {
            setPhase(data.status);
            setMessage(data.message);
            if (data.status === "SUCCESS") {
              setReceipt(data.receiptNumber);
              onPaid?.(data.receiptNumber);
            }
            return;
          }
        } catch {
          // network blip: keep polling
        }
        if (Date.now() - startedAt > 4 * 60_000) {
          setPhase("TIMEOUT");
          setMessage("We did not get a reply from M-Pesa. If money left your account, Magdalene will still see it.");
          return;
        }
        poll(paymentId, startedAt);
      }, 4000);
    },
    [onPaid]
  );

  const send = useCallback(async () => {
    stop();
    setPhase("sending");
    setMessage("");
    try {
      const r = await fetch("/api/payments/mpesa/stk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, phone }),
      });
      const data = await r.json();
      if (!r.ok) {
        setPhase("error");
        setMessage(data.error || "Could not send the payment prompt.");
        return;
      }
      setPhase("waiting");
      setMessage(data.message || "Check your phone and enter your M-Pesa PIN.");
      poll(data.paymentId, Date.now());
    } catch {
      setPhase("error");
      setMessage("Network error. Please try again.");
    }
  }, [appointmentId, phone, poll]);

  useEffect(() => {
    if (autoStart && !started.current) {
      started.current = true;
      void send();
    }
  }, [autoStart, send]);

  const busy = phase === "sending" || phase === "waiting";

  if (phase === "SUCCESS") {
    return (
      <div className="rounded-2xl bg-emerald-50 p-5 text-left ring-1 ring-emerald-200">
        <p className="flex items-center gap-2 font-semibold text-emerald-800">
          <Icon name="checkCircle" size={20} /> Deposit of {formatKes(amount)} received
        </p>
        {receipt && (
          <p className="mt-1 text-sm text-emerald-800">
            M-Pesa receipt: <span className="font-mono font-semibold">{receipt}</span>
          </p>
        )}
        <p className="mt-1 text-sm text-emerald-700">Your slot is secured. Thank you!</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gold/40 bg-white text-left shadow-card">
      <div className="bg-gold-sheen px-5 py-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-royal-900/80">
          Secure your slot with M-Pesa
        </p>
        <p className="font-display text-lg font-bold text-royal-900">Deposit · {formatKes(amount)}</p>
      </div>
      <div className="space-y-3 p-5">
        <label className="block">
          <span className="label">M-Pesa number to charge</span>
          <input
            className="input"
            value={phone}
            disabled={busy}
            inputMode="tel"
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07XX XXX XXX"
          />
        </label>

        {phase === "waiting" && (
          <div className="flex items-start gap-3 rounded-xl bg-royal-50 px-4 py-3 text-sm text-royal-800">
            <span className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-royal-300 border-t-royal-700" />
            <span>
              {message}
              <br />
              <span className="text-xs text-royal-700/80">Keep this page open. It updates by itself.</span>
            </span>
          </div>
        )}
        {(phase === "error" || phase === "FAILED" || phase === "CANCELLED" || phase === "TIMEOUT") && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>
        )}

        <button
          className="btn-primary w-full"
          disabled={busy || phone.replace(/[^0-9]/g, "").length < 9}
          onClick={send}
        >
          {phase === "sending"
            ? "Sending prompt…"
            : phase === "waiting"
              ? "Waiting for your PIN…"
              : phase === "idle"
                ? `Pay ${formatKes(amount)} with M-Pesa`
                : "Try again"}
        </button>
        {manualNumber && (
          <p className="text-xs text-charcoal-muted">
            Prompt not coming? You can also send the deposit to{" "}
            <strong>M-Pesa {manualNumber}</strong> and share the confirmation on WhatsApp.
          </p>
        )}
      </div>
    </div>
  );
}
