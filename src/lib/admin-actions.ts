"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import {
  clearSessionCookie,
  createSessionToken,
  getSession,
  setSessionCookie,
} from "./auth";
import { headers } from "next/headers";
import { ADMIN_ROLES } from "./auth";
import { getSettings } from "./booking";
import { notifyStatusChange } from "./notifications";
import { rateLimit } from "./rate-limit";
import {
  blockedDateSchema,
  loginSchema,
  serviceSchema,
  settingsSchema,
} from "./validation";

// Every admin action funnels through here: a valid session AND an allowed role.
async function requireAdmin() {
  const session = await getSession();
  if (!session || !ADMIN_ROLES.includes(session.role)) {
    throw new Error("Not authorised");
  }
  return session;
}

function requestIp(): string {
  const h = headers();
  const xff = h.get("x-forwarded-for");
  return (xff ? xff.split(",")[0].trim() : h.get("x-real-ip")) || "unknown";
}

// ── Auth ────────────────────────────────────────────────────────
export async function loginAction(_prev: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }
  const { email, password } = parsed.data;

  // Throttle brute-force by both account AND source IP.
  const byEmail = rateLimit(`login:${email}`, 6, 10 * 60 * 1000);
  const byIp = rateLimit(`login-ip:${requestIp()}`, 20, 10 * 60 * 1000);
  if (!byEmail.ok || !byIp.ok) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    // Identical message + path for both cases avoids user enumeration.
    return { error: "Invalid email or password." };
  }

  const token = await createSessionToken({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
  await setSessionCookie(token);
  redirect("/admin");
}

export async function logoutAction() {
  clearSessionCookie();
  redirect("/admin/login");
}

// ── Appointments ────────────────────────────────────────────────
export async function updateAppointmentStatus(id: string, status: string) {
  await requireAdmin();
  const allowed = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];
  if (!allowed.includes(status)) return;

  // Earnings are recognised the moment a booking is marked completed.
  const completedAt = status === "COMPLETED" ? new Date() : null;

  const appt = await prisma.appointment.update({
    where: { id },
    data: { status, completedAt },
    include: { customer: true, service: true },
  });

  try {
    const settings = await getSettings();
    await notifyStatusChange(
      {
        customerName: appt.customer.name,
        customerPhone: appt.customer.phone,
        customerEmail: appt.customer.email,
        serviceName: appt.service.name,
        date: appt.date,
        startMin: appt.startMin,
        serviceType: appt.serviceType,
        priceKes: appt.priceKes,
        salonName: settings.salonName,
        salonPhone: settings.phone,
      },
      status
    );
  } catch (e) {
    console.error("status notification failed", e);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/appointments");
}

export async function updatePaymentStatus(id: string, paymentStatus: string) {
  await requireAdmin();
  const allowed = ["UNPAID", "PAID", "PARTIAL", "REFUND"];
  if (!allowed.includes(paymentStatus)) return;
  await prisma.appointment.update({ where: { id }, data: { paymentStatus } });
  revalidatePath("/admin/appointments");
  revalidatePath("/admin");
}

export async function addAppointmentNote(id: string, note: string) {
  await requireAdmin();
  await prisma.appointment.update({ where: { id }, data: { notes: note } });
  revalidatePath("/admin/appointments");
}

// ── Services ────────────────────────────────────────────────────
function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function saveService(formData: FormData) {
  await requireAdmin();

  const parsed = serviceSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    category: formData.get("category") || "Kids",
    priceKes: formData.get("priceKes"),
    outCallPriceKes: formData.get("outCallPriceKes"),
    durationMin: formData.get("durationMin"),
    bufferMin: formData.get("bufferMin") ?? 0,
    imageUrl: formData.get("imageUrl") ?? "",
    includes: formData.get("includes") ?? "",
    active: formData.get("active") === "on",
    sortOrder: formData.get("sortOrder") ?? 0,
  });
  if (!parsed.success) {
    console.warn("saveService rejected", parsed.error.issues);
    return;
  }
  const v = parsed.data;
  const data = {
    name: v.name,
    description: v.description || "",
    category: v.category,
    priceKes: v.priceKes,
    outCallPriceKes: v.outCallPriceKes,
    durationMin: v.durationMin,
    bufferMin: v.bufferMin,
    imageUrl: v.imageUrl || null,
    includes: v.includes || null,
    active: v.active,
    sortOrder: v.sortOrder,
  };

  if (v.id) {
    await prisma.service.update({ where: { id: v.id }, data });
  } else {
    await prisma.service.create({
      data: { ...data, slug: slugify(v.name) + "-" + Date.now().toString(36) },
    });
  }
  revalidatePath("/admin/services");
  revalidatePath("/");
}

export async function toggleService(id: string, active: boolean) {
  await requireAdmin();
  await prisma.service.update({ where: { id }, data: { active } });
  revalidatePath("/admin/services");
  revalidatePath("/");
}

export async function deleteService(id: string) {
  await requireAdmin();
  const count = await prisma.appointment.count({ where: { serviceId: id } });
  if (count > 0) {
    // Keep history intact — just deactivate.
    await prisma.service.update({ where: { id }, data: { active: false } });
  } else {
    await prisma.service.delete({ where: { id } });
  }
  revalidatePath("/admin/services");
  revalidatePath("/");
}

// ── Availability ────────────────────────────────────────────────
export async function saveWorkingHours(
  _prev: unknown,
  formData: FormData
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Your session expired. Please sign in again." };
  }
  try {
  for (let dow = 0; dow < 7; dow++) {
    const isOpen = formData.get(`open_${dow}`) === "on";
    const start = String(formData.get(`start_${dow}`) || "08:00");
    const end = String(formData.get(`end_${dow}`) || "18:00");
    const lunchStart = String(formData.get(`lunchStart_${dow}`) || "");
    const lunchEnd = String(formData.get(`lunchEnd_${dow}`) || "");
    const toMin = (v: string) => {
      const [h, m] = v.split(":").map((n) => parseInt(n, 10));
      return h * 60 + (m || 0);
    };
    await prisma.workingHours.upsert({
      where: { dayOfWeek: dow },
      update: {
        isOpen,
        startMin: toMin(start),
        endMin: toMin(end),
        lunchStartMin: lunchStart ? toMin(lunchStart) : null,
        lunchEndMin: lunchEnd ? toMin(lunchEnd) : null,
      },
      create: {
        dayOfWeek: dow,
        isOpen,
        startMin: toMin(start),
        endMin: toMin(end),
        lunchStartMin: lunchStart ? toMin(lunchStart) : null,
        lunchEndMin: lunchEnd ? toMin(lunchEnd) : null,
      },
    });
  }
  revalidatePath("/admin/availability");
  revalidatePath("/");
  return { ok: true };
  } catch (e) {
    console.error("saveWorkingHours failed", e);
    return { error: "Could not save working hours. Please try again." };
  }
}

export async function addBlockedDate(formData: FormData) {
  await requireAdmin();
  const parsed = blockedDateSchema.safeParse({
    date: formData.get("date"),
    reason: formData.get("reason") || "Blocked",
    type: formData.get("type") || "BLOCKED",
  });
  if (!parsed.success) return;
  const { date, reason, type } = parsed.data;
  await prisma.blockedDate.upsert({
    where: { date },
    update: { reason, type },
    create: { date, reason, type },
  });
  revalidatePath("/admin/availability");
}

export async function removeBlockedDate(id: string) {
  await requireAdmin();
  await prisma.blockedDate.delete({ where: { id } });
  revalidatePath("/admin/availability");
}

// Used with useActionState so the form can show a "Saved" message.
export async function saveSettings(
  _prev: unknown,
  formData: FormData
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Your session expired. Please sign in again." };
  }
  const parsed = settingsSchema.safeParse({
    slotIntervalMin: formData.get("slotIntervalMin"),
    maxPerDay: formData.get("maxPerDay"),
    salonName: formData.get("salonName"),
    phone: formData.get("phone"),
    email: formData.get("email") ?? "",
    location: formData.get("location"),
    outcallFeeKes: formData.get("outcallFeeKes"),
    mpesaNumber: formData.get("mpesaNumber") ?? "",
    depositPercent: formData.get("depositPercent") ?? 50,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Please check your inputs." };
  }
  try {
    await prisma.settings.upsert({
      where: { id: 1 },
      update: parsed.data,
      create: { id: 1, ...parsed.data },
    });
    revalidatePath("/admin/availability");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("saveSettings failed", e);
    return { error: "Could not save. Please try again." };
  }
}

