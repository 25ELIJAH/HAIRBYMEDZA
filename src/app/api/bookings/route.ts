import { NextRequest, NextResponse } from "next/server";
import { createBooking, getSettings } from "@/lib/booking";
import { prisma } from "@/lib/prisma";
import { notifyBookingConfirmed } from "@/lib/notifications";
import { guard } from "@/lib/rate-limit";
import { bookingSchema, firstError } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Throttle: max 8 booking attempts per IP per 5 minutes.
  const blocked = guard(req, "book", 8, 5 * 60 * 1000);
  if (blocked) return blocked;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Validate + sanitise everything in one pass.
  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  }
  const body = parsed.data;

  // Honeypot: if a bot filled the hidden "company" field, quietly accept and
  // drop it (no booking created) so the bot can't tell it was blocked.
  if (body.company && body.company.length > 0) {
    return NextResponse.json({ ok: true, appointmentId: "skipped" });
  }

  const result = await createBooking({
    serviceId: body.serviceId,
    date: body.date,
    startMin: body.startMin,
    serviceType: body.serviceType,
    customer: {
      name: body.customer.name,
      phone: body.customer.phone,
      email: body.customer.email || undefined,
    },
    location: body.location,
    notes: body.notes || undefined,
    deposit: body.deposit,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  // Fire confirmation notifications (stubbed → logged).
  try {
    const [appt, settings] = await Promise.all([
      prisma.appointment.findUnique({
        where: { id: result.appointmentId },
        include: { customer: true, service: true },
      }),
      getSettings(),
    ]);
    if (appt) {
      await notifyBookingConfirmed({
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
        location: {
          estate: appt.estate,
          houseNumber: appt.houseNumber,
          landmark: appt.landmark,
          travelNotes: appt.travelNotes,
        },
        notes: appt.notes,
      });
    }
  } catch (e) {
    console.error("notification failed (non-fatal)", e);
  }

  return NextResponse.json({ ok: true, appointmentId: result.appointmentId });
}
