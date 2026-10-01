// Ties online payments to appointments. Two providers are supported:
//   • IntaSend (preferred when its keys are set): M-Pesa prompt, no Paybill needed.
//   • Paystack: M-Pesa prompt plus card checkout.
// Amounts are always decided here on the server from the booking's price,
// never sent by the browser.

import { prisma } from "./prisma";
import {
  chargeMpesa,
  initializeCheckout,
  newReference,
  payerEmail,
  paystackEnabled,
  siteUrl,
  verifyTransaction,
  type PaystackState,
} from "./paystack";
import { intasendEnabled, intasendMode, intasendStatus, intasendStkPush } from "./intasend";
import { paystackMode } from "./paystack";
import { normalizeKePhone } from "./phone";

export type PaymentPurpose = "DEPOSIT" | "BALANCE";
type FinalState = Exclude<PaystackState, "PENDING">;

// A prompt the client has not answered within this window is treated as
// expired (the M-Pesa PIN screen itself closes after about a minute).
const PENDING_TIMEOUT_MS = 3 * 60_000;

export type Provider = "INTASEND" | "PAYSTACK";

/** The provider in use: IntaSend if configured, otherwise Paystack, otherwise none. */
export function activeProvider(): Provider | null {
  if (intasendEnabled()) return "INTASEND";
  if (paystackEnabled()) return "PAYSTACK";
  return null;
}

export function paymentsEnabled(): boolean {
  return activeProvider() !== null;
}

/** Card payments need Paystack's hosted checkout. */
export function cardPaymentsEnabled(): boolean {
  return activeProvider() === "PAYSTACK" && !!siteUrl();
}

export function providerInfo(): { name: string; mode: "test" | "live" } | null {
  const p = activeProvider();
  if (p === "INTASEND") return { name: "IntaSend", mode: intasendMode() };
  if (p === "PAYSTACK") return { name: "Paystack", mode: paystackMode() };
  return null;
}

// Clients pay the full price (no deposit): whatever is still owed.
export function amountDue(appt: { priceKes: number; amountPaid: number }): number {
  return Math.max(0, appt.priceKes - appt.amountPaid);
}

async function loadPayable(appointmentId: string) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { customer: true, service: true },
  });
  if (!appt) return { error: "Booking not found." as string };
  if (appt.status === "CANCELLED") return { error: "This booking was cancelled." as string };
  const amount = amountDue(appt);
  if (amount < 1) return { error: "This booking is already paid." };
  return { appt, amount };
}

export type StartPaymentResult =
  | { ok: true; paymentId: string; amount: number; message: string }
  | { ok: false; error: string };

/** Sends an M-Pesa payment prompt (via Paystack) for a booking. */
export async function startMpesaPayment(opts: {
  appointmentId: string;
  phone: string;
  purpose: PaymentPurpose;
  initiatedBy: "CLIENT" | "ADMIN";
}): Promise<StartPaymentResult> {
  if (!paymentsEnabled()) return { ok: false, error: "Online payments are not switched on yet." };

  const phone = normalizeKePhone(opts.phone);
  if (!phone) return { ok: false, error: "Enter a valid Safaricom number, e.g. 0712 345 678." };

  const loaded = await loadPayable(opts.appointmentId);
  if (!("appt" in loaded) || !loaded.appt) return { ok: false, error: loaded.error! };
  const { appt, amount } = loaded;

  // Don't spam the client's phone: reuse a prompt sent in the last 45 seconds.
  const recent = await prisma.payment.findFirst({
    where: {
      appointmentId: appt.id,
      channel: "MPESA",
      phone,
      status: "PENDING",
      createdAt: { gt: new Date(Date.now() - 45_000) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    return {
      ok: true,
      paymentId: recent.id,
      amount: recent.amount,
      message: "Check your phone and enter your M-Pesa PIN.",
    };
  }

  const provider = activeProvider()!;
  const reference = newReference(appt.id);
  // Record first, so a fast webhook always finds its payment row.
  const payment = await prisma.payment.create({
    data: {
      appointmentId: appt.id,
      provider,
      channel: "MPESA",
      reference,
      phone,
      amount,
      purpose: opts.purpose,
      initiatedBy: opts.initiatedBy,
    },
  });

  if (provider === "INTASEND") {
    const r = await intasendStkPush({
      reference,
      amountKes: amount,
      phone,
      email: appt.customer.email || undefined,
      name: appt.customer.name,
    });
    if (!r.ok) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", resultDesc: r.error.slice(0, 250) },
      });
      return r;
    }
    await prisma.payment.update({ where: { id: payment.id }, data: { providerTxnId: r.invoiceId } });
    return {
      ok: true,
      paymentId: payment.id,
      amount,
      message: "Check your phone and enter your M-Pesa PIN.",
    };
  }

  const res = await chargeMpesa({
    reference,
    amountKes: amount,
    phone,
    email: payerEmail(appt.customer.email, appt.customer.phone),
    metadata: { appointmentId: appt.id, purpose: opts.purpose, service: appt.service.name },
  });
  if (!res.ok) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", resultDesc: res.error.slice(0, 250) },
    });
    return res;
  }
  if (res.state !== "PENDING") {
    await applyPaymentResult(reference, { state: res.state, resultDesc: res.message });
  }
  return {
    ok: true,
    paymentId: payment.id,
    amount,
    message: "Check your phone and enter your M-Pesa PIN.",
  };
}

/** Opens a Paystack checkout page (card or M-Pesa) for a booking. */
export async function startCheckout(opts: {
  appointmentId: string;
  purpose: PaymentPurpose;
  initiatedBy: "CLIENT" | "ADMIN";
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!cardPaymentsEnabled()) return { ok: false, error: "Card payments are not available." };
  const site = siteUrl();

  const loaded = await loadPayable(opts.appointmentId);
  if (!("appt" in loaded) || !loaded.appt) return { ok: false, error: loaded.error! };
  const { appt, amount } = loaded;

  const reference = newReference(appt.id);
  await prisma.payment.create({
    data: {
      appointmentId: appt.id,
      provider: "PAYSTACK",
      channel: "CHECKOUT",
      reference,
      amount,
      purpose: opts.purpose,
      initiatedBy: opts.initiatedBy,
    },
  });
  const res = await initializeCheckout({
    reference,
    amountKes: amount,
    email: payerEmail(appt.customer.email, appt.customer.phone),
    callbackUrl: `${site}/pay/complete?reference=${encodeURIComponent(reference)}`,
    metadata: { appointmentId: appt.id, purpose: opts.purpose, service: appt.service.name },
  });
  if (!res.ok) {
    await prisma.payment.update({
      where: { reference },
      data: { status: "FAILED", resultDesc: res.error.slice(0, 250) },
    });
  }
  return res;
}

/**
 * Records the final result of a payment. Idempotent: the webhook, the status
 * poller and the return page may all report the same result, but money is only
 * ever added to the booking once (guarded by the PENDING -> final update).
 */
export async function applyPaymentResult(
  reference: string,
  result: {
    state: FinalState;
    resultDesc: string;
    receiptNumber?: string | null;
    providerTxnId?: string | null;
    paidAmountKes?: number | null;
  }
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { reference } });
    if (!payment) return;

    // Never credit a payment for less than we asked for (or in another currency).
    if (
      result.state === "SUCCESS" &&
      result.paidAmountKes != null &&
      result.paidAmountKes + 0.001 < payment.amount
    ) {
      console.error("Paystack amount mismatch", reference, result.paidAmountKes, payment.amount);
      result = { ...result, state: "FAILED", resultDesc: "Amount paid did not match the amount due." };
    }

    // A TIMEOUT we inferred ourselves can still be overturned by a late
    // success from Paystack, so the money is never lost from the records.
    const claimable = result.state === "SUCCESS" ? ["PENDING", "TIMEOUT"] : ["PENDING"];
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: { in: claimable } },
      data: {
        status: result.state,
        resultDesc: result.resultDesc.slice(0, 250) || null,
        receiptNumber: result.receiptNumber || undefined,
        providerTxnId: result.providerTxnId || undefined,
        paidAt: result.state === "SUCCESS" ? new Date() : undefined,
      },
    });

    if (claimed.count === 0) {
      // Already finalised. A later report may still carry the receipt code.
      if (result.state === "SUCCESS" && result.receiptNumber && !payment.receiptNumber) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { receiptNumber: result.receiptNumber },
        });
      }
      return;
    }
    if (result.state !== "SUCCESS") return;

    const paid = payment.amount;
    const appt = await tx.appointment.findUnique({ where: { id: payment.appointmentId } });
    if (!appt) return;
    const amountPaid = appt.amountPaid + paid;
    const label = payment.channel === "MPESA" ? "M-Pesa" : "Online";
    const ref = result.receiptNumber || payment.reference;
    await tx.appointment.update({
      where: { id: appt.id },
      data: {
        amountPaid,
        paymentStatus: amountPaid >= appt.priceKes ? "PAID" : "PARTIAL",
        mpesaNumber: payment.phone || appt.mpesaNumber,
        mpesaMessage: [appt.mpesaMessage, `${label} ${ref}: KES ${paid}`]
          .filter(Boolean)
          .join(" · ")
          .slice(0, 400),
      },
    });
  });
}

/** Verifies a payment with Paystack and records the outcome if it has one. */
export async function syncWithPaystack(reference: string): Promise<void> {
  const v = await verifyTransaction(reference);
  if (!v || v.state === "PENDING") return;
  await applyPaymentResult(reference, {
    state: v.state,
    resultDesc: v.message,
    receiptNumber: v.receipt,
    providerTxnId: v.providerId,
    // A non-KES payment is never accepted as covering a KES amount.
    paidAmountKes: v.currency && v.currency !== "KES" ? -1 : v.amountKes,
  });
}

/** Asks IntaSend for an invoice's status and records the outcome if final. */
export async function syncWithIntasend(reference: string, invoiceId: string): Promise<void> {
  const v = await intasendStatus(invoiceId);
  if (!v || v.state === "PENDING") return;
  await applyPaymentResult(reference, {
    state: v.state,
    resultDesc: v.message,
    receiptNumber: v.receipt,
    providerTxnId: invoiceId,
    paidAmountKes: v.currency && v.currency !== "KES" ? -1 : v.amountKes,
  });
}

/** Checks a payment with whichever provider handled it. */
export async function syncPayment(p: { reference: string; provider: string; providerTxnId: string | null }) {
  if (p.provider === "MANUAL") return; // recorded by hand, nothing to check
  if (p.provider === "INTASEND") {
    if (p.providerTxnId) await syncWithIntasend(p.reference, p.providerTxnId);
    return;
  }
  await syncWithPaystack(p.reference);
}

export interface PaymentStatusView {
  id: string;
  status: string;
  amount: number;
  receiptNumber: string | null;
  reference: string;
  message: string;
}

const MESSAGES: Record<string, string> = {
  PENDING: "Enter your M-Pesa PIN on your phone…",
  SUCCESS: "Payment received.",
  CANCELLED: "The payment was cancelled.",
  TIMEOUT: "The prompt expired.",
  FAILED: "The payment did not go through.",
};

// Ask the provider at most every 8s per payment while the client waits.
const lastChecked = new Map<string, number>();

/**
 * Current status of a payment. While still pending it asks the provider directly
 * (in case the webhook is slow), and expires prompts nobody answered.
 */
export async function refreshPaymentStatus(paymentId: string): Promise<PaymentStatusView | null> {
  let p = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!p) return null;

  const age = Date.now() - p.createdAt.getTime();
  const recentlyAsked = Date.now() - (lastChecked.get(p.id) || 0) < 8_000;
  if (p.status === "PENDING" && age > 6_000 && !recentlyAsked) {
    lastChecked.set(p.id, Date.now());
    if (lastChecked.size > 500) lastChecked.delete(lastChecked.keys().next().value!);
    await syncPayment(p);
    p = (await prisma.payment.findUnique({ where: { id: paymentId } }))!;
    if (p.status === "PENDING" && p.channel === "MPESA" && age > PENDING_TIMEOUT_MS) {
      await applyPaymentResult(p.reference, { state: "TIMEOUT", resultDesc: "No answer from the phone" });
      p = (await prisma.payment.findUnique({ where: { id: paymentId } }))!;
    }
  }

  const detail =
    p.status === "FAILED" && p.resultDesc ? `${MESSAGES.FAILED} ${p.resultDesc}` : MESSAGES[p.status];
  return {
    id: p.id,
    status: p.status,
    amount: p.amount,
    receiptNumber: p.receiptNumber,
    reference: p.reference,
    message: detail || p.status,
  };
}
