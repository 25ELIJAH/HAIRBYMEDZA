// Ties M-Pesa STK Push requests to appointments. Amounts are always decided
// here on the server from the booking's price, never sent by the browser.

import { prisma } from "./prisma";
import { getSettings } from "./booking";
import { mpesaEnabled, stkPush, stkQuery } from "./mpesa";
import { normalizeKePhone } from "./phone";

export type PaymentPurpose = "DEPOSIT" | "BALANCE";
type FinalState = "SUCCESS" | "FAILED" | "CANCELLED" | "TIMEOUT";

// A prompt the client has not answered within this window is treated as
// expired (Safaricom itself drops the PIN screen after about a minute).
const PENDING_TIMEOUT_MS = 3 * 60_000;

export function depositAmount(priceKes: number, depositPercent: number): number {
  return Math.max(1, Math.round((priceKes * depositPercent) / 100));
}

export async function amountDue(
  appt: { priceKes: number; amountPaid: number },
  purpose: PaymentPurpose
): Promise<number> {
  const balance = Math.max(0, appt.priceKes - appt.amountPaid);
  if (purpose === "BALANCE") return balance;
  // Deposit still owed = target deposit minus anything already paid.
  const settings = await getSettings();
  const deposit = depositAmount(appt.priceKes, settings.depositPercent || 50);
  return Math.min(balance, Math.max(0, deposit - appt.amountPaid));
}

export type StartPaymentResult =
  | { ok: true; paymentId: string; amount: number; message: string }
  | { ok: false; error: string };

export async function startStkPayment(opts: {
  appointmentId: string;
  phone: string;
  purpose: PaymentPurpose;
  initiatedBy: "CLIENT" | "ADMIN";
}): Promise<StartPaymentResult> {
  if (!mpesaEnabled()) return { ok: false, error: "M-Pesa payments are not switched on yet." };

  const phone = normalizeKePhone(opts.phone);
  if (!phone) return { ok: false, error: "Enter a valid Safaricom number, e.g. 0712 345 678." };

  const appt = await prisma.appointment.findUnique({
    where: { id: opts.appointmentId },
    include: { service: true },
  });
  if (!appt) return { ok: false, error: "Booking not found." };
  if (appt.status === "CANCELLED") return { ok: false, error: "This booking was cancelled." };

  const amount = await amountDue(appt, opts.purpose);
  if (amount < 1) {
    return {
      ok: false,
      error:
        opts.purpose === "DEPOSIT"
          ? "The deposit for this booking is already paid."
          : "Nothing left to pay on this booking.",
    };
  }

  // Don't spam the client's phone: reuse a prompt sent in the last 45 seconds.
  const recent = await prisma.mpesaPayment.findFirst({
    where: {
      appointmentId: appt.id,
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
      message: "A payment prompt was just sent. Check your phone and enter your M-Pesa PIN.",
    };
  }

  const res = await stkPush({
    phone,
    amount,
    description: opts.purpose === "BALANCE" ? "Balance" : "Deposit",
    accountReference: `MM${appt.id.slice(-8).toUpperCase()}`,
  });
  if (!res.ok) return res;

  const payment = await prisma.mpesaPayment
    .create({
      data: {
        appointmentId: appt.id,
        phone,
        amount,
        purpose: opts.purpose,
        merchantRequestId: res.merchantRequestId,
        checkoutRequestId: res.checkoutRequestId,
        initiatedBy: opts.initiatedBy,
      },
    })
    .catch((e) => {
      console.error("could not record STK request", e);
      return null;
    });
  if (!payment) {
    return { ok: false, error: "The payment prompt was sent but could not be tracked. Please message us." };
  }
  return {
    ok: true,
    paymentId: payment.id,
    amount,
    message: `An M-Pesa prompt for KES ${amount.toLocaleString("en-KE")} was sent to your phone. Enter your M-Pesa PIN to pay.`,
  };
}

/**
 * Records the final result of an STK request. Idempotent: Safaricom may send
 * the callback more than once, and the status poller may race it, but money is
 * only ever added to the booking once (guarded by the PENDING → final update).
 */
export async function applyPaymentResult(
  checkoutRequestId: string,
  result: {
    state: FinalState;
    resultCode: number;
    resultDesc: string;
    receiptNumber?: string | null;
    amount?: number | null;
  }
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const payment = await tx.mpesaPayment.findUnique({ where: { checkoutRequestId } });
    if (!payment) return;

    // A TIMEOUT we inferred ourselves can still be overturned by a late
    // success from Safaricom, so the money is never lost from the records.
    const claimable = result.state === "SUCCESS" ? ["PENDING", "TIMEOUT"] : ["PENDING"];
    const claimed = await tx.mpesaPayment.updateMany({
      where: { id: payment.id, status: { in: claimable } },
      data: {
        status: result.state,
        resultCode: result.resultCode,
        resultDesc: result.resultDesc.slice(0, 250),
        receiptNumber: result.receiptNumber || undefined,
        paidAt: result.state === "SUCCESS" ? new Date() : undefined,
      },
    });

    if (claimed.count === 0) {
      // Already finalised (e.g. by the poller). A late callback may still carry
      // the receipt number the STK query could not give us.
      if (result.state === "SUCCESS" && result.receiptNumber && !payment.receiptNumber) {
        await tx.mpesaPayment.update({
          where: { id: payment.id },
          data: { receiptNumber: result.receiptNumber },
        });
      }
      return;
    }
    if (result.state !== "SUCCESS") return;

    // Trust the amount we asked for; Safaricom echoes it back on success.
    const paid = payment.amount;
    const appt = await tx.appointment.findUnique({ where: { id: payment.appointmentId } });
    if (!appt) return;
    const amountPaid = appt.amountPaid + paid;
    const receiptNote = result.receiptNumber ? `M-Pesa ${result.receiptNumber}` : "M-Pesa STK";
    await tx.appointment.update({
      where: { id: appt.id },
      data: {
        amountPaid,
        paymentStatus: amountPaid >= appt.priceKes ? "PAID" : "PARTIAL",
        mpesaNumber: payment.phone,
        mpesaMessage: [appt.mpesaMessage, `${receiptNote}: KES ${paid}`]
          .filter(Boolean)
          .join(" · ")
          .slice(0, 400),
      },
    });
  });
}

export interface PaymentStatusView {
  id: string;
  status: string;
  amount: number;
  receiptNumber: string | null;
  message: string;
}

const MESSAGES: Record<string, string> = {
  PENDING: "Waiting for you to enter your M-Pesa PIN on your phone…",
  SUCCESS: "Payment received. Thank you!",
  CANCELLED: "The payment was cancelled on the phone.",
  TIMEOUT: "The payment prompt expired before it was answered.",
  FAILED: "The payment did not go through.",
};

// Daraja rate-limits STK queries, so ask at most every 12s per payment.
const lastQueried = new Map<string, number>();

/**
 * Current status of a payment. While still pending it asks Safaricom directly
 * (in case the callback was lost), and expires prompts nobody answered.
 */
export async function refreshPaymentStatus(paymentId: string): Promise<PaymentStatusView | null> {
  let p = await prisma.mpesaPayment.findUnique({ where: { id: paymentId } });
  if (!p) return null;

  const age = Date.now() - p.createdAt.getTime();
  const recentlyAsked = Date.now() - (lastQueried.get(p.id) || 0) < 12_000;
  if (p.status === "PENDING" && p.checkoutRequestId && age > 15_000 && !recentlyAsked) {
    lastQueried.set(p.id, Date.now());
    if (lastQueried.size > 500) lastQueried.delete(lastQueried.keys().next().value!);
    const q = await stkQuery(p.checkoutRequestId);
    if (q.state !== "PENDING") {
      await applyPaymentResult(p.checkoutRequestId, q);
    } else if (age > PENDING_TIMEOUT_MS) {
      await applyPaymentResult(p.checkoutRequestId, {
        state: "TIMEOUT",
        resultCode: -1,
        resultDesc: "No answer from the phone",
      });
    }
    p = (await prisma.mpesaPayment.findUnique({ where: { id: paymentId } }))!;
  }

  const detail =
    p.status === "FAILED" && p.resultDesc ? `${MESSAGES.FAILED} ${p.resultDesc}` : MESSAGES[p.status];
  return {
    id: p.id,
    status: p.status,
    amount: p.amount,
    receiptNumber: p.receiptNumber,
    message: detail || p.status,
  };
}
