// IntaSend (Kenya) client: M-Pesa STK Push without needing your own Paybill
// or Till. Money lands in the IntaSend wallet and is withdrawn to M-Pesa or a
// bank from the IntaSend dashboard.
//
// Endpoints and headers follow IntaSend's official Node SDK (intasend-node):
//   POST /api/v1/payment/mpesa-stk-push/   Authorization: Bearer <secret key>
//   POST /api/v1/payment/status/           INTASEND_PUBLIC_API_KEY: <publishable key>
// Live: https://payment.intasend.com   Test: https://sandbox.intasend.com

import { normalizeKePhone } from "./phone";

function keys() {
  return {
    publishable: process.env.INTASEND_PUBLISHABLE_KEY || "",
    secret: process.env.INTASEND_SECRET_KEY || "",
  };
}

/** True when both IntaSend keys are configured. */
export function intasendEnabled(): boolean {
  const k = keys();
  return !!(k.publishable && k.secret);
}

/** Test keys contain "_test_" (e.g. ISSecretKey_test_…); INTASEND_TEST_MODE overrides. */
export function intasendMode(): "test" | "live" {
  const flag = (process.env.INTASEND_TEST_MODE || "").toLowerCase();
  if (flag === "true" || flag === "1") return "test";
  if (flag === "false" || flag === "0") return "live";
  return /_test_/i.test(keys().secret) ? "test" : "live";
}

function base(): string {
  if (process.env.INTASEND_API_BASE) return process.env.INTASEND_API_BASE; // tests only
  return intasendMode() === "test" ? "https://sandbox.intasend.com" : "https://payment.intasend.com";
}

export type IntaSendState = "PENDING" | "SUCCESS" | "FAILED";

/** Maps IntaSend invoice states (PENDING, PROCESSING, COMPLETE, FAILED) to ours. */
export function stateFor(state: string | undefined): IntaSendState {
  const s = (state || "").toUpperCase();
  if (s === "COMPLETE" || s === "COMPLETED") return "SUCCESS";
  if (s === "FAILED" || s === "CANCELLED" || s === "RETRY") return "FAILED";
  return "PENDING";
}

interface Invoice {
  invoice_id?: string;
  state?: string;
  value?: string | number;
  currency?: string;
  mpesa_reference?: string | null;
  failed_reason?: string | null;
  api_ref?: string;
}

function invoiceOf(json: any): Invoice | null {
  if (!json || typeof json !== "object") return null;
  if (json.invoice && typeof json.invoice === "object") return json.invoice as Invoice;
  if (json.invoice_id) return json as Invoice;
  return null;
}

export type IntaSendChargeResult =
  | { ok: true; invoiceId: string; state: IntaSendState }
  | { ok: false; error: string };

/** Sends the M-Pesa PIN prompt to the client's phone. */
export async function intasendStkPush(opts: {
  reference: string;
  amountKes: number;
  phone: string;
  email?: string;
  name?: string;
}): Promise<IntaSendChargeResult> {
  if (!intasendEnabled()) return { ok: false, error: "Online payments are not switched on yet." };
  const phone = normalizeKePhone(opts.phone);
  if (!phone) return { ok: false, error: "Enter a valid Safaricom number, e.g. 0712 345 678." };
  const [first, ...rest] = (opts.name || "").trim().split(/\s+/);
  try {
    const res = await fetch(`${base()}/api/v1/payment/mpesa-stk-push/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${keys().secret}` },
      cache: "no-store",
      body: JSON.stringify({
        amount: Math.round(opts.amountKes),
        phone_number: phone,
        api_ref: opts.reference,
        email: opts.email || undefined,
        first_name: first || undefined,
        last_name: rest.join(" ") || undefined,
        method: "M-PESA",
        currency: "KES",
      }),
    });
    const json = await res.json().catch(() => ({}));
    const inv = invoiceOf(json);
    if ((res.status === 200 || res.status === 201) && inv?.invoice_id) {
      return { ok: true, invoiceId: String(inv.invoice_id), state: stateFor(inv.state) };
    }
    console.error("IntaSend STK push rejected", res.status, JSON.stringify(json).slice(0, 300));
    const msg = (json && (json.detail || json.message || json.errors?.[0]?.detail)) as string | undefined;
    return { ok: false, error: msg || "Could not send the M-Pesa prompt. Please try again." };
  } catch (e) {
    console.error("IntaSend STK push failed", e);
    return { ok: false, error: "Could not reach the payment service. Please try again." };
  }
}

export interface IntaSendStatus {
  state: IntaSendState;
  amountKes: number | null;
  currency: string | null;
  receipt: string | null;
  message: string;
}

/** Asks IntaSend for the real status of an invoice. */
export async function intasendStatus(invoiceId: string): Promise<IntaSendStatus | null> {
  if (!intasendEnabled()) return null;
  const { publishable } = keys();
  try {
    const res = await fetch(`${base()}/api/v1/payment/status/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", INTASEND_PUBLIC_API_KEY: publishable },
      cache: "no-store",
      body: JSON.stringify({ invoice_id: invoiceId, public_key: publishable }),
    });
    if (res.status !== 200 && res.status !== 201) return null;
    const inv = invoiceOf(await res.json().catch(() => null));
    if (!inv) return null;
    const value = inv.value != null ? Number(inv.value) : null;
    return {
      state: stateFor(inv.state),
      amountKes: value != null && Number.isFinite(value) ? value : null,
      currency: inv.currency || null,
      receipt: inv.mpesa_reference || null,
      message: inv.failed_reason || "",
    };
  } catch (e) {
    console.error("IntaSend status failed", e);
    return null;
  }
}

/** IntaSend webhooks carry the "challenge" string you set in the dashboard. */
export function isValidIntasendChallenge(given: unknown): boolean {
  const expected = process.env.INTASEND_WEBHOOK_CHALLENGE || "";
  if (expected.length < 8 || typeof given !== "string" || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
