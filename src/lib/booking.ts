// Server-side glue between the database and the pure scheduling engine.
import { prisma } from "./prisma";
import {
  AvailabilityResult,
  computeAvailability,
  ExistingBooking,
  overlaps,
  WorkingDay,
} from "./availability";
import { dayOfWeek } from "./time";

export async function getSettings() {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  // Fallback before the database is seeded. Personal details come from env,
  // never hard coded here.
  return (
    s ?? {
      id: 1,
      slotIntervalMin: 30,
      maxPerDay: 0,
      salonName: process.env.SALON_NAME || "Magdalene Medza",
      phone: process.env.WHATSAPP_NUMBER || "",
      email: process.env.OWNER_EMAIL || "",
      location: process.env.SALON_LOCATION || "",
      outcallFeeKes: 0,
      theme: "purple",
    }
  );
}

/** Reserved span end of a booking = service end + its buffer. */
function reservedBookings(
  rows: { startMin: number; endMin: number; bufferMin: number; status: string }[]
): ExistingBooking[] {
  return rows.map((r) => ({
    start: r.startMin,
    end: r.endMin + r.bufferMin,
    status: r.status,
  }));
}

export async function getAvailability(
  serviceId: string,
  dateStr: string
): Promise<AvailabilityResult & { serviceName: string; durationMin: number }> {
  const [service, settings] = await Promise.all([
    prisma.service.findUnique({ where: { id: serviceId } }),
    getSettings(),
  ]);
  if (!service || !service.active) {
    return {
      open: false,
      reason: "Service unavailable",
      grid: [],
      bookableStarts: [],
      dayFull: false,
      serviceName: service?.name ?? "",
      durationMin: service?.durationMin ?? 0,
    };
  }

  const dow = dayOfWeek(dateStr);
  const [wh, blocked, appts] = await Promise.all([
    prisma.workingHours.findUnique({ where: { dayOfWeek: dow } }),
    prisma.blockedDate.findUnique({ where: { date: dateStr } }),
    prisma.appointment.findMany({
      where: { date: dateStr, status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] } },
      select: { startMin: true, endMin: true, bufferMin: true, status: true },
    }),
  ]);

  const workingDay: WorkingDay | null = wh
    ? {
        isOpen: wh.isOpen,
        startMin: wh.startMin,
        endMin: wh.endMin,
        lunchStartMin: wh.lunchStartMin,
        lunchEndMin: wh.lunchEndMin,
      }
    : null;

  const result = computeAvailability({
    dateStr,
    workingDay,
    isBlocked: !!blocked,
    blockedReason: blocked?.reason,
    durationMin: service.durationMin,
    bufferMin: service.bufferMin,
    existing: reservedBookings(appts),
    slotIntervalMin: settings.slotIntervalMin,
    maxPerDay: settings.maxPerDay,
  });

  return { ...result, serviceName: service.name, durationMin: service.durationMin };
}

export interface CreateBookingInput {
  serviceId: string;
  date: string;
  startMin: number;
  serviceType: "INCALL" | "OUTCALL";
  customer: { name: string; phone: string; email?: string };
  location?: {
    estate?: string;
    houseNumber?: string;
    mapsPin?: string;
    landmark?: string;
    travelNotes?: string;
  };
  notes?: string;
}

export type CreateBookingResult =
  | { ok: true; appointmentId: string }
  | { ok: false; error: string };

/**
 * Creates a booking with a final server-side conflict re-check so two clients
 * racing for the same slot can never both succeed.
 */
export async function createBooking(
  input: CreateBookingInput
): Promise<CreateBookingResult> {
  const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
  if (!service || !service.active) return { ok: false, error: "Service not found." };

  const startMin = input.startMin;
  const endMin = startMin + service.durationMin;
  const reserved = { start: startMin, end: endMin + service.bufferMin };

  // Validate against working hours, lunch and blocked dates.
  const dow = dayOfWeek(input.date);
  const [wh, blocked] = await Promise.all([
    prisma.workingHours.findUnique({ where: { dayOfWeek: dow } }),
    prisma.blockedDate.findUnique({ where: { date: input.date } }),
  ]);
  if (blocked) return { ok: false, error: `Unavailable: ${blocked.reason}.` };
  if (!wh || !wh.isOpen) return { ok: false, error: "We are closed on that day." };
  if (startMin < wh.startMin || endMin > wh.endMin)
    return { ok: false, error: "That time is outside working hours." };
  if (
    wh.lunchStartMin != null &&
    wh.lunchEndMin != null &&
    overlaps({ start: startMin, end: endMin }, { start: wh.lunchStartMin, end: wh.lunchEndMin })
  )
    return { ok: false, error: "That time overlaps the lunch break." };

  try {
    return await prisma.$transaction(async (tx) => {
      const sameDay = await tx.appointment.findMany({
        where: { date: input.date, status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] } },
        select: { startMin: true, endMin: true, bufferMin: true },
      });
      const clash = sameDay.some((b) =>
        overlaps(reserved, { start: b.startMin, end: b.endMin + b.bufferMin })
      );
      if (clash) {
        return { ok: false, error: "Sorry, that slot was just taken. Please pick another." };
      }

      // Upsert customer by phone.
      const customer = await tx.customer.upsert({
        where: { phone: input.customer.phone },
        update: {
          name: input.customer.name,
          email: input.customer.email || undefined,
        },
        create: {
          name: input.customer.name,
          phone: input.customer.phone,
          email: input.customer.email,
        },
      });

      const appt = await tx.appointment.create({
        data: {
          customerId: customer.id,
          serviceId: service.id,
          date: input.date,
          startMin,
          endMin,
          bufferMin: service.bufferMin,
          serviceType: input.serviceType,
          status: "PENDING",
          paymentStatus: "UNPAID",
          // Out-call costs more than in-call. Price is decided here on the
          // server so the client can never set it.
          priceKes:
            input.serviceType === "OUTCALL"
              ? service.outCallPriceKes
              : service.priceKes,
          estate: input.location?.estate,
          houseNumber: input.location?.houseNumber,
          mapsPin: input.location?.mapsPin,
          landmark: input.location?.landmark,
          travelNotes: input.location?.travelNotes,
          notes: input.notes,
        },
      });

      return { ok: true, appointmentId: appt.id };
    });
  } catch (e) {
    console.error("createBooking failed", e);
    return { ok: false, error: "Could not create the booking. Please try again." };
  }
}
