"use server";

import { randomUUID } from "crypto";

// Admin actions for client records and bookings the owner manages by hand:
// adding walk-in / phone / past bookings, restoring blocked website attempts,
// editing and importing clients, merging duplicates, and M-Pesa requests.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "./prisma";
import { requireAdmin } from "./auth";
import { findOrCreateCustomer } from "./booking";
import { overlaps } from "./availability";
import { startMpesaPayment } from "./payments";
import { customerPhoneKey, formatPhone, normalizeKePhone } from "./phone";
import { bookingSchema } from "./validation";
import { salonMidnight } from "./time";

type ActionState = { ok?: boolean; error?: string; message?: string } | null;

function refreshAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/appointments");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/payments");
}

const hhmm = (v: string) => {
  const [h, m] = v.split(":").map((n) => parseInt(n, 10));
  return h * 60 + (m || 0);
};

// ── Manual booking (walk-in, phone call, or an old booking from before) ──────
const manualSchema = z.object({
  name: z.string().trim().min(2, "Enter the client's name").max(80),
  phone: z.string().trim().min(9, "Enter a valid phone number").max(20),
  email: z.union([z.string().trim().toLowerCase().email("Invalid email"), z.literal("")]),
  serviceId: z.string().trim().min(8, "Choose a service").max(40),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Choose a time"),
  serviceType: z.enum(["INCALL", "OUTCALL"]),
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]),
  priceKes: z.union([z.coerce.number().int().min(0).max(1_000_000), z.literal("")]),
  amountPaid: z.coerce.number().int().min(0).max(1_000_000).default(0),
  mpesaMessage: z.string().trim().max(400).default(""),
  notes: z.string().trim().max(600).default(""),
  estate: z.string().trim().max(120).default(""),
  allowOverlap: z.boolean(),
});

async function createAdminBooking(
  v: z.infer<typeof manualSchema>,
  source: "ADMIN" | "WEBSITE"
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const service = await prisma.service.findUnique({ where: { id: v.serviceId } });
  if (!service) return { ok: false, error: "Service not found." };

  const startMin = hhmm(v.time);
  const endMin = startMin + service.durationMin;

  if (!v.allowOverlap && v.status !== "CANCELLED") {
    const sameDay = await prisma.appointment.findMany({
      where: { date: v.date, status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] } },
      select: { startMin: true, endMin: true, bufferMin: true },
    });
    const clash = sameDay.some((b) =>
      overlaps(
        { start: startMin, end: endMin + service.bufferMin },
        { start: b.startMin, end: b.endMin + b.bufferMin }
      )
    );
    if (clash) {
      return {
        ok: false,
        error: "Another booking overlaps that time. Tick “allow overlap” to save it anyway.",
      };
    }
  }

  const price =
    v.priceKes === ""
      ? v.serviceType === "OUTCALL"
        ? service.outCallPriceKes
        : service.priceKes
      : v.priceKes;

  const appt = await prisma.$transaction(async (tx) => {
    const customer = await findOrCreateCustomer(tx, {
      name: v.name,
      phone: v.phone,
      email: v.email || null,
    });
    const created = await tx.appointment.create({
      data: {
        customerId: customer.id,
        serviceId: service.id,
        date: v.date,
        startMin,
        endMin,
        bufferMin: service.bufferMin,
        serviceType: v.serviceType,
        status: v.status,
        completedAt: v.status === "COMPLETED" ? new Date() : null,
        priceKes: price,
        amountPaid: v.amountPaid,
        paymentStatus:
          v.amountPaid <= 0 ? "UNPAID" : v.amountPaid >= price ? "PAID" : "PARTIAL",
        mpesaNumber: v.amountPaid > 0 ? customerPhoneKey(v.phone) : null,
        mpesaMessage: v.mpesaMessage || null,
        estate: v.estate || null,
        notes: v.notes || null,
        source,
      },
    });
    if (v.amountPaid > 0) {
      // Past bookings count as paid on their own date, not today.
      const start = new Date(salonMidnight(v.date).getTime() + startMin * 60_000);
      await tx.payment.create({
        data: {
          appointmentId: created.id,
          provider: "MANUAL",
          channel: "CASH",
          reference: `CASH-${randomUUID().slice(0, 13)}`,
          amount: v.amountPaid,
          purpose: v.amountPaid >= price ? "BALANCE" : "DEPOSIT",
          status: "SUCCESS",
          resultDesc: "Recorded by admin",
          paidAt: start < new Date() ? start : new Date(),
          initiatedBy: "ADMIN",
        },
      });
    }
    return created;
  });
  return { ok: true, id: appt.id };
}

export async function addManualBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Your session expired. Please sign in again." };
  }
  const parsed = manualSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") ?? "",
    serviceId: formData.get("serviceId"),
    date: formData.get("date"),
    time: formData.get("time"),
    serviceType: formData.get("serviceType") || "INCALL",
    status: formData.get("status") || "CONFIRMED",
    priceKes: formData.get("priceKes") ?? "",
    amountPaid: formData.get("amountPaid") || 0,
    mpesaMessage: formData.get("mpesaMessage") ?? "",
    notes: formData.get("notes") ?? "",
    estate: formData.get("estate") ?? "",
    allowOverlap: formData.get("allowOverlap") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the form." };
  try {
    const res = await createAdminBooking(parsed.data, "ADMIN");
    if (!res.ok) return { error: res.error };
    refreshAdmin();
    return { ok: true, message: `Booking saved for ${parsed.data.name}.` };
  } catch (e) {
    console.error("addManualBooking failed", e);
    return { error: "Could not save the booking. Please try again." };
  }
}

// ── Blocked website attempts (spam filter false positives) ───────────────────
export async function restoreBlockedBooking(logId: string): Promise<ActionState> {
  await requireAdmin();
  const log = await prisma.notificationLog.findUnique({ where: { id: logId } });
  if (!log || log.channel !== "BLOCKED_BOOKING") return { error: "Not found." };
  let raw: unknown = null;
  try {
    raw = JSON.parse(log.body || "{}");
  } catch {}
  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) return { error: "That attempt is incomplete and cannot be restored." };
  const b = parsed.data;
  const h = Math.floor(b.startMin / 60);
  const m = b.startMin % 60;
  const res = await createAdminBooking(
    {
      name: b.customer.name,
      phone: b.customer.phone,
      email: b.customer.email || "",
      serviceId: b.serviceId,
      date: b.date,
      time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      serviceType: b.serviceType,
      status: "PENDING",
      priceKes: "",
      amountPaid: b.deposit?.amountPaid || 0,
      mpesaMessage: b.deposit?.mpesaMessage || "",
      notes: [b.notes, b.location?.travelNotes].filter(Boolean).join(" · "),
      estate: [b.location?.estate, b.location?.houseNumber, b.location?.landmark]
        .filter(Boolean)
        .join(", "),
      allowOverlap: true,
    },
    "WEBSITE"
  );
  if (!res.ok) return { error: res.error };
  await prisma.notificationLog.update({ where: { id: logId }, data: { status: "RESTORED" } });
  refreshAdmin();
  return { ok: true };
}

export async function dismissBlockedBooking(logId: string): Promise<void> {
  await requireAdmin();
  await prisma.notificationLog.updateMany({
    where: { id: logId, channel: "BLOCKED_BOOKING" },
    data: { status: "DISMISSED" },
  });
  refreshAdmin();
}

// ── Clients ─────────────────────────────────────────────────────────────────
const customerSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(80),
  phone: z.string().trim().min(9, "Enter a valid phone number").max(20),
  email: z.union([z.string().trim().toLowerCase().email("Invalid email"), z.literal("")]),
  notes: z.string().trim().max(600).default(""),
});

export async function saveCustomer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Your session expired. Please sign in again." };
  }
  const id = String(formData.get("id") || "");
  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the form." };
  const v = parsed.data;
  const phone = customerPhoneKey(v.phone);
  try {
    const clash = await prisma.customer.findUnique({ where: { phone } });
    if (clash && clash.id !== id) {
      return { error: `That number already belongs to ${clash.name}.` };
    }
    if (id) {
      await prisma.customer.update({
        where: { id },
        data: { name: v.name, phone, email: v.email || null, notes: v.notes || null },
      });
    } else {
      await prisma.customer.create({
        data: { name: v.name, phone, email: v.email || null, notes: v.notes || null },
      });
    }
    refreshAdmin();
    if (id) revalidatePath(`/admin/customers/${id}`);
    return { ok: true, message: id ? "Client updated." : `${v.name} added to your clients.` };
  } catch (e) {
    console.error("saveCustomer failed", e);
    return { error: "Could not save. Please try again." };
  }
}

/**
 * Bulk import of past clients, one per line:
 *   Name, Phone, Email (optional), Notes (optional)
 * Works with text copied from Excel / Google Sheets (tabs) or a CSV.
 */
export async function importCustomers(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Your session expired. Please sign in again." };
  }
  const text = String(formData.get("rows") || "").slice(0, 200_000);
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { error: "Paste at least one line." };
  if (lines.length > 2000) return { error: "Import at most 2,000 clients at a time." };

  let added = 0;
  let updated = 0;
  const skipped: string[] = [];
  for (const line of lines) {
    const cells = line.split(line.includes("\t") ? "\t" : ",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const [name, phone, email = "", ...rest] = cells;
    if (/^name$/i.test(name || "")) continue; // header row
    const ok = customerSchema.safeParse({
      name,
      phone,
      email: /@/.test(email) ? email : "",
      notes: rest.join(", "),
    });
    if (!ok.success || !phone || phone.replace(/[^0-9]/g, "").length < 9) {
      skipped.push(line.slice(0, 40));
      continue;
    }
    const key = customerPhoneKey(ok.data.phone);
    const before = await prisma.customer.findUnique({ where: { phone: key } });
    const c = await findOrCreateCustomer(prisma, {
      name: ok.data.name,
      phone: ok.data.phone,
      email: ok.data.email || null,
    });
    if (ok.data.notes && !c.notes) {
      await prisma.customer.update({ where: { id: c.id }, data: { notes: ok.data.notes } });
    }
    if (before) updated++;
    else added++;
  }
  refreshAdmin();
  return {
    ok: true,
    message:
      `${added} added, ${updated} already on file.` +
      (skipped.length ? ` ${skipped.length} line(s) skipped (no valid name/phone).` : ""),
  };
}

/**
 * Merges clients saved more than once under different phone formats
 * ("0712…" vs "+254712…") so each person has one record with full history.
 */
export async function mergeDuplicateCustomers(_prev: ActionState): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Your session expired. Please sign in again." };
  }
  const all = await prisma.customer.findMany({ orderBy: { createdAt: "asc" } });
  const groups = new Map<string, typeof all>();
  for (const c of all) {
    const key = customerPhoneKey(c.phone);
    groups.set(key, [...(groups.get(key) || []), c]);
  }
  let merged = 0;
  let tidied = 0;
  for (const [key, list] of groups) {
    const [keep, ...dups] = list;
    if (dups.length === 0 && keep.phone === key) continue;
    await prisma.$transaction(async (tx) => {
      for (const d of dups) {
        await tx.appointment.updateMany({ where: { customerId: d.id }, data: { customerId: keep.id } });
        await tx.customer.delete({ where: { id: d.id } });
        merged++;
      }
      const newest = list[list.length - 1];
      const notes = list.map((c) => c.notes).filter(Boolean).join(" · ") || null;
      if (keep.phone !== key || dups.length) {
        await tx.customer.update({
          where: { id: keep.id },
          data: {
            phone: key,
            name: newest.name,
            email: list.map((c) => c.email).filter(Boolean).at(-1) || null,
            notes,
          },
        });
        if (keep.phone !== key) tidied++;
      }
    });
  }
  refreshAdmin();
  return {
    ok: true,
    message:
      merged || tidied
        ? `Merged ${merged} duplicate record(s) and tidied ${tidied} phone number(s).`
        : "No duplicates found. Everything is tidy.",
  };
}

// ── Payments ────────────────────────────────────────────────────────────────
export async function requestMpesaPayment(
  appointmentId: string,
  purpose: "DEPOSIT" | "BALANCE",
  phone?: string
): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Your session expired. Please sign in again." };
  }
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { customer: true },
  });
  if (!appt) return { error: "Booking not found." };
  const target = phone?.trim() || appt.customer.phone;
  if (!normalizeKePhone(target)) return { error: "That is not a valid Safaricom number." };
  const res = await startMpesaPayment({ appointmentId, phone: target, purpose, initiatedBy: "ADMIN" });
  if (!res.ok) return { error: res.error };
  revalidatePath("/admin/appointments");
  return {
    ok: true,
    message: `Payment prompt for KES ${res.amount.toLocaleString("en-KE")} sent to ${formatPhone(target)}. It updates here automatically once paid.`,
  };
}

/** Records a payment received outside Paystack (cash, or M-Pesa sent manually). */
export async function recordManualPayment(
  appointmentId: string,
  amount: number,
  reference: string
): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Your session expired. Please sign in again." };
  }
  const amt = Math.round(Number(amount));
  if (!Number.isFinite(amt) || amt <= 0 || amt > 1_000_000) return { error: "Enter an amount." };
  const ref = String(reference || "").trim().slice(0, 80);
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt) return { error: "Booking not found." };
  const amountPaid = appt.amountPaid + amt;
  // Logged as a Payment too, so it shows in Money received and its history.
  await prisma.$transaction([
    prisma.payment.create({
      data: {
        appointmentId,
        provider: "MANUAL",
        channel: "CASH",
        reference: `CASH-${randomUUID().slice(0, 13)}`,
        amount: amt,
        purpose: amountPaid >= appt.priceKes ? "BALANCE" : "DEPOSIT",
        status: "SUCCESS",
        receiptNumber: ref || null,
        resultDesc: "Recorded by admin",
        paidAt: new Date(),
        initiatedBy: "ADMIN",
      },
    }),
    prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        amountPaid,
        paymentStatus: amountPaid >= appt.priceKes ? "PAID" : "PARTIAL",
        mpesaMessage: [appt.mpesaMessage, `${ref || "Manual"}: KES ${amt}`]
          .filter(Boolean)
          .join(" · ")
          .slice(0, 400),
      },
    }),
  ]);
  refreshAdmin();
  return { ok: true, message: `Recorded KES ${amt.toLocaleString("en-KE")}.` };
}

/**
 * Adds money recorded on bookings before every payment was logged (older
 * cash / manual entries) to the payment history, dated on the booking day.
 * Safe to run more than once: it only adds what is still missing.
 */
export async function backfillPaymentHistory(_prev: ActionState): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Your session expired. Please sign in again." };
  }
  const appts = await prisma.appointment.findMany({
    where: { amountPaid: { gt: 0 } },
    select: {
      id: true,
      date: true,
      startMin: true,
      priceKes: true,
      amountPaid: true,
      payments: { where: { status: "SUCCESS" }, select: { amount: true } },
    },
  });
  const now = new Date();
  const rows = appts
    .map((a) => ({ a, missing: a.amountPaid - a.payments.reduce((s, p) => s + p.amount, 0) }))
    .filter((x) => x.missing > 0)
    .map(({ a, missing }) => {
      const start = new Date(salonMidnight(a.date).getTime() + a.startMin * 60_000);
      return {
        appointmentId: a.id,
        provider: "MANUAL",
        channel: "CASH",
        reference: `CASH-${randomUUID().slice(0, 13)}`,
        amount: missing,
        purpose: a.amountPaid >= a.priceKes ? "BALANCE" : "DEPOSIT",
        status: "SUCCESS",
        resultDesc: "Added from booking records",
        paidAt: start < now ? start : now,
        initiatedBy: "ADMIN",
      };
    });
  if (rows.length) await prisma.payment.createMany({ data: rows });
  refreshAdmin();
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return {
    ok: true,
    message: rows.length
      ? `Added ${rows.length} earlier payment${rows.length === 1 ? "" : "s"} (KES ${total.toLocaleString("en-KE")}).`
      : "Everything is already in the history.",
  };
}
