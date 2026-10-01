// Paystack (Kenya) client.
//
// Two ways to pay, both settled into the salon's Paystack balance and paid out
// to the account set in the Paystack dashboard:
//   1. M-Pesa prompt: the Charge API sends an STK push to the client's phone.
//   2. Hosted checkout: the client is redirected to Paystack to pay by card
//      (or M-Pesa there), then comes back to /pay/complete.
// Results are confirmed by verifying the transaction with Paystack and by the
// signed webhook at /api/payments/paystack/webhook. Nothing the browser says
// is ever trusted as proof of payment.

import crypto from "node:crypto";
import { normalizeKePhone } from "./phone";

const BASE = process.env.PAYSTACK_API_BASE || "https://api.paystack.co"; // override for tests only

function secret(): string {
  return process.env.PAYSTACK_SECRET_KEY || "";
}

/** True when a Paystack secret key is configured. */
export function paystackEnabled(): boolean {
  return /^sk_(test|live)_/.test(secret());
}

export function paystackMode(): "test" | "live" {
  return secret().startsWith("sk_live_") ? "live" : "test";
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
}

/** Paystack needs an email on every transaction; clients may not give one. */
export function payerEmail(email: string | null | undefined, phone: string): string {
  if (email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return email;
  const digits = phone.replace(/[^0-9]/g, "") || "client";
  return `${digits}@clients.hairbymedza.co.ke`;
}

/** Unique transaction reference we generate (Paystack allows [a-zA-Z0-9.=-]). */
export function newReference(appointmentId: string): string {
  return `MM-${appointmentId.slice(-8)}-${Date.now().toString(36)}-${crypto
    .randomBytes(3)
    .toString("hex")}`;
}

async function call<T = any>(
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<{ ok: boolean; status: number; json: { status?: boolean; message?: string; data?: T } }> {
  const res = await fetch(`${BASE}${path}`, {
    method: init.method || "GET",
    headers: {
      Authorization: `Bearer ${secret()}`,
      "Content-Type": "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as any;
  return { ok: res.ok && json?.status === true, status: res.status, json };
}

export type PaystackState = "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "TIMEOUT";

/** Maps a Paystack transaction/charge status to ours. */
export function stateFor(status: string | undefined): PaystackState {
  switch (status) {
    case "success":
      return "SUCCESS";
    case "failed":
    case "reversed":
      return "FAILED";
    case "abandoned":
      return "CANCELLED";
    default:
      // pay_offline, pending, ongoing, processing, send_otp, queued…
      return "PENDING";
  }
}

export type ChargeResult =
  | { ok: true; state: PaystackState; message: string }
  | { ok: false; error: string };

/** Sends an M-Pesa payment prompt to the client's phone (Charge API). */
export async function chargeMpesa(opts: {
  reference: string;
  amountKes: number;
  phone: string;
  email: string;
  metadata?: Record<string, unknown>;
}): Promise<ChargeResult> {
  if (!paystackEnabled()) return { ok: false, error: "Online payments are not switched on yet." };
  const ke = normalizeKePhone(opts.phone);
  if (!ke) return { ok: false, error: "Enter a valid Safaricom number, e.g. 0712 345 678." };
  try {
    const r = await call("/charge", {
      method: "POST",
      body: {
        email: opts.email,
        amount: Math.round(opts.amountKes) * 100, // Paystack amounts are in cents
        currency: "KES",
        reference: opts.reference,
        mobile_money: { phone: `+${ke}`, provider: "mpesa" },
        metadata: opts.metadata,
      },
    });
    const data = r.json.data as { status?: string; display_text?: string; gateway_response?: string } | undefined;
    if (!r.ok || !data) {
      console.error("Paystack charge rejected", r.status, r.json?.message);
      return { ok: false, error: r.json?.message || "Could not send the M-Pesa prompt. Please try again." };
    }
    const state = stateFor(data.status);
    if (state === "FAILED") {
      return { ok: false, error: data.gateway_response || "The payment could not be started." };
    }
    return {
      ok: true,
      state,
      message: data.display_text || "Check your phone and enter your M-Pesa PIN.",
    };
  } catch (e) {
    console.error("Paystack charge failed", e);
    return { ok: false, error: "Could not reach the payment service. Please try again." };
  }
}

/** Starts a hosted Paystack checkout (card or M-Pesa) and returns its URL. */
export async function initializeCheckout(opts: {
  reference: string;
  amountKes: number;
  email: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!paystackEnabled()) return { ok: false, error: "Online payments are not switched on yet." };
  try {
    const r = await call<{ authorization_url?: string }>("/transaction/initialize", {
      method: "POST",
      body: {
        email: opts.email,
        amount: Math.round(opts.amountKes) * 100,
        currency: "KES",
        reference: opts.reference,
        callback_url: opts.callbackUrl,
        channels: ["card", "mobile_money"],
        metadata: opts.metadata,
      },
    });
    const url = r.json.data?.authorization_url;
    if (!r.ok || !url || !/^https:\/\//.test(url)) {
      console.error("Paystack initialize rejected", r.status, r.json?.message);
      return { ok: false, error: r.json?.message || "Could not open the payment page." };
    }
    return { ok: true, url };
  } catch (e) {
    console.error("Paystack initialize failed", e);
    return { ok: false, error: "Could not reach the payment service. Please try again." };
  }
}

export interface VerifiedTransaction {
  state: PaystackState;
  amountKes: number | null;
  currency: string | null;
  channel: string | null;
  receipt: string | null;
  message: string;
  providerId: string | null;
}

/** Asks Paystack for the real status of a transaction. */
export async function verifyTransaction(reference: string): Promise<VerifiedTransaction | null> {
  if (!paystackEnabled()) return null;
  try {
    const r = await call<any>(`/transaction/verify/${encodeURIComponent(reference)}`);
    const d = r.json.data;
    if (!d) return null; // unknown yet (e.g. charge still being created)
    return {
      state: stateFor(d.status),
      amountKes: typeof d.amount === "number" ? d.amount / 100 : null,
      currency: d.currency || null,
      channel: d.channel || null,
      // M-Pesa receipt code when Paystack includes it; our reference is kept regardless.
      receipt: typeof d.receipt_number === "string" ? d.receipt_number : null,
      message: d.gateway_response || d.message || "",
      providerId: d.id != null ? String(d.id) : null,
    };
  } catch (e) {
    console.error("Paystack verify failed", e);
    return null;
  }
}

/** Checks the x-paystack-signature header (HMAC-SHA512 of the raw body). */
export function isValidWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !paystackEnabled()) return false;
  const expected = crypto.createHmac("sha512", secret()).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
