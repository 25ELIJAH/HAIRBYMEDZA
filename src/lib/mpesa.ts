// M-Pesa STK Push (Lipa Na M-Pesa Online) via Safaricom Daraja.
//
// Flow:
//   1. stkPush() asks Safaricom to show a PIN prompt on the client's phone.
//   2. Safaricom POSTs the result to our callback URL (see callbackUrl()).
//   3. If the callback is slow or lost, stkQuery() asks Safaricom directly.
//
// All credentials live in environment variables (see .env.example). When they
// are not set, STK Push is reported as disabled and the booking page falls
// back to the manual "send to number + paste the message" deposit.

import { normalizeKePhone } from "./phone";

const ENV = (process.env.MPESA_ENV || "sandbox").toLowerCase();
const BASE =
  process.env.MPESA_API_BASE || // testing only: point at a mock Daraja server
  (ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke");

function cfg() {
  return {
    consumerKey: process.env.MPESA_CONSUMER_KEY || "",
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || "",
    shortcode: process.env.MPESA_SHORTCODE || "",
    passkey: process.env.MPESA_PASSKEY || "",
    transactionType:
      process.env.MPESA_TRANSACTION_TYPE === "CustomerBuyGoodsOnline"
        ? "CustomerBuyGoodsOnline"
        : "CustomerPayBillOnline",
    till: process.env.MPESA_TILL_NUMBER || "",
    accountRef: (process.env.MPESA_ACCOUNT_REFERENCE || "HairByMedza").slice(0, 12),
    callbackSecret: process.env.MPESA_CALLBACK_SECRET || "",
  };
}

/** True when every credential needed for STK Push is configured. */
export function mpesaEnabled(): boolean {
  const c = cfg();
  return !!(
    c.consumerKey &&
    c.consumerSecret &&
    c.shortcode &&
    c.passkey &&
    c.callbackSecret.length >= 16 &&
    callbackUrl() &&
    (c.transactionType === "CustomerPayBillOnline" || c.till)
  );
}

export function mpesaEnvironment(): "sandbox" | "production" {
  return ENV === "production" ? "production" : "sandbox";
}

/** Public URL Safaricom posts results to. Must be https in production. */
export function callbackUrl(): string {
  if (process.env.MPESA_CALLBACK_URL) return process.env.MPESA_CALLBACK_URL;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
  const secret = cfg().callbackSecret;
  if (!site || !secret) return "";
  return `${site}/api/payments/mpesa/callback/${secret}`;
}

/** Constant-time comparison for the callback secret. */
export function isValidCallbackSecret(given: string): boolean {
  const expected = cfg().callbackSecret;
  if (!expected || expected.length < 16 || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/** Daraja timestamp: YYYYMMDDHHmmss in Kenyan time. */
function timestamp(): string {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)?.value || "00";
  return `${g("year")}${g("month")}${g("day")}${g("hour")}${g("minute")}${g("second")}`;
}

// OAuth token is valid for ~1 hour; cache it per server instance.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const c = cfg();
  const basic = Buffer.from(`${c.consumerKey}:${c.consumerSecret}`).toString("base64");
  const res = await fetch(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${basic}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`M-Pesa auth failed (${res.status})`);
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: string };
  if (!data.access_token) throw new Error("M-Pesa auth returned no token");
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (parseInt(data.expires_in || "3599", 10) || 3599) * 1000,
  };
  return cachedToken.value;
}

function password(ts: string): string {
  const c = cfg();
  return Buffer.from(`${c.shortcode}${c.passkey}${ts}`).toString("base64");
}

export type StkPushResult =
  | { ok: true; merchantRequestId: string; checkoutRequestId: string; message: string }
  | { ok: false; error: string };

/** Sends the PIN prompt to the client's phone. */
export async function stkPush(opts: {
  phone: string;
  amount: number;
  description: string;
  accountReference?: string;
}): Promise<StkPushResult> {
  if (!mpesaEnabled()) return { ok: false, error: "M-Pesa is not set up yet." };
  const phone = normalizeKePhone(opts.phone);
  if (!phone) return { ok: false, error: "Enter a valid Safaricom number, e.g. 0712 345 678." };
  const amount = Math.round(opts.amount);
  if (!Number.isFinite(amount) || amount < 1) return { ok: false, error: "Invalid amount." };

  const c = cfg();
  const ts = timestamp();
  try {
    const token = await accessToken();
    const res = await fetch(`${BASE}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        BusinessShortCode: c.shortcode,
        Password: password(ts),
        Timestamp: ts,
        TransactionType: c.transactionType,
        Amount: amount,
        PartyA: phone,
        PartyB: c.transactionType === "CustomerBuyGoodsOnline" ? c.till : c.shortcode,
        PhoneNumber: phone,
        CallBackURL: callbackUrl(),
        AccountReference: (opts.accountReference || c.accountRef).slice(0, 12),
        TransactionDesc: opts.description.slice(0, 13) || "Deposit",
      }),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, string>;
    if (res.ok && data.ResponseCode === "0" && data.CheckoutRequestID) {
      return {
        ok: true,
        merchantRequestId: data.MerchantRequestID,
        checkoutRequestId: data.CheckoutRequestID,
        message: data.CustomerMessage || "Check your phone and enter your M-Pesa PIN.",
      };
    }
    console.error("STK push rejected", res.status, data);
    return {
      ok: false,
      error: data.errorMessage || data.ResponseDescription || "M-Pesa could not send the prompt. Please try again.",
    };
  } catch (e) {
    console.error("STK push failed", e);
    return { ok: false, error: "Could not reach M-Pesa. Please try again in a moment." };
  }
}

export type StkQueryResult =
  | { state: "PENDING" }
  | { state: "SUCCESS"; resultCode: number; resultDesc: string }
  | { state: "FAILED" | "CANCELLED" | "TIMEOUT"; resultCode: number; resultDesc: string };

/** Maps Daraja result codes to our payment states. */
export function stateForResultCode(code: number): "SUCCESS" | "FAILED" | "CANCELLED" | "TIMEOUT" {
  if (code === 0) return "SUCCESS";
  if (code === 1032) return "CANCELLED"; // request cancelled by user
  if (code === 1037 || code === 1019) return "TIMEOUT"; // phone unreachable / expired
  return "FAILED"; // 1 = insufficient funds, 2001 = wrong PIN, etc.
}

/** Asks Safaricom for the status of an STK request (fallback for a lost callback). */
export async function stkQuery(checkoutRequestId: string): Promise<StkQueryResult> {
  if (!mpesaEnabled()) return { state: "PENDING" };
  const c = cfg();
  const ts = timestamp();
  try {
    const token = await accessToken();
    const res = await fetch(`${BASE}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        BusinessShortCode: c.shortcode,
        Password: password(ts),
        Timestamp: ts,
        CheckoutRequestID: checkoutRequestId,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, string>;
    // While the client is still on the PIN screen Daraja answers with an
    // error like "The transaction is being processed".
    if (data.ResultCode === undefined || data.ResultCode === null || data.ResultCode === "") {
      return { state: "PENDING" };
    }
    const code = parseInt(String(data.ResultCode), 10);
    const state = stateForResultCode(code);
    return { state, resultCode: code, resultDesc: data.ResultDesc || "" };
  } catch (e) {
    console.error("STK query failed", e);
    return { state: "PENDING" };
  }
}

/** Shape of the body Safaricom posts to the callback URL. */
export interface StkCallbackBody {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number | string;
      ResultDesc?: string;
      CallbackMetadata?: { Item?: { Name: string; Value?: string | number }[] };
    };
  };
}

export function parseCallback(body: StkCallbackBody) {
  const cb = body?.Body?.stkCallback;
  if (!cb?.CheckoutRequestID) return null;
  const items = cb.CallbackMetadata?.Item || [];
  const val = (name: string) => items.find((i) => i.Name === name)?.Value;
  const code = parseInt(String(cb.ResultCode ?? "-1"), 10);
  return {
    checkoutRequestId: String(cb.CheckoutRequestID),
    merchantRequestId: cb.MerchantRequestID ? String(cb.MerchantRequestID) : null,
    resultCode: code,
    resultDesc: cb.ResultDesc || "",
    amount: val("Amount") != null ? Number(val("Amount")) : null,
    receiptNumber: val("MpesaReceiptNumber") != null ? String(val("MpesaReceiptNumber")) : null,
    phone: val("PhoneNumber") != null ? String(val("PhoneNumber")) : null,
  };
}
