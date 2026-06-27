// ── Smart scheduling engine ───────────────────────────────────────────────
// Pure functions (no DB) so they're easy to test and reuse on client/server.
// Given the working hours, lunch break, blocked dates and existing bookings,
// it computes which start times a service of a given duration+buffer can take,
// guaranteeing no double-booking.
//
// Convention: an ExistingBooking's `end` is its RESERVED end — the service end
// PLUS that booking's buffer. The data layer folds the buffer in, so the
// conflict check here stays simple and symmetric.

import { minutesToLabel, nowMinutesForDate } from "./time";

export type SlotStatus =
  | "AVAILABLE"
  | "OCCUPIED"
  | "PENDING"
  | "LUNCH"
  | "BLOCKED"
  | "CLOSED";

export interface Interval {
  start: number; // minutes from midnight (inclusive)
  end: number; // minutes from midnight (exclusive)
}

export interface ExistingBooking extends Interval {
  status: string; // PENDING | CONFIRMED | COMPLETED | CANCELLED
}

export interface WorkingDay {
  isOpen: boolean;
  startMin: number;
  endMin: number;
  lunchStartMin: number | null;
  lunchEndMin: number | null;
}

export interface GridSlot {
  startMin: number;
  endMin: number;
  label: string;
  status: SlotStatus;
}

export interface AvailabilityResult {
  open: boolean;
  reason?: string; // why the day is unavailable (closed / blocked)
  grid: GridSlot[]; // grid for the visual calendar
  bookableStarts: number[]; // start minutes where THIS service fits cleanly
  dayFull: boolean; // hit maxPerDay
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

interface ComputeArgs {
  dateStr: string;
  workingDay: WorkingDay | null;
  isBlocked: boolean;
  blockedReason?: string;
  durationMin: number;
  bufferMin: number;
  existing: ExistingBooking[]; // `end` already includes each booking's buffer
  slotIntervalMin: number;
  maxPerDay: number; // 0 = unlimited
}

// Bookings that actually hold a slot (cancelled ones free their time).
const ACTIVE = new Set(["PENDING", "CONFIRMED", "COMPLETED"]);

export function computeAvailability(args: ComputeArgs): AvailabilityResult {
  const {
    dateStr,
    workingDay,
    isBlocked,
    blockedReason,
    durationMin,
    bufferMin,
    existing,
    slotIntervalMin,
    maxPerDay,
  } = args;

  if (!workingDay || !workingDay.isOpen) {
    return { open: false, reason: "Closed", grid: [], bookableStarts: [], dayFull: false };
  }
  if (isBlocked) {
    return {
      open: false,
      reason: blockedReason || "Unavailable",
      grid: [],
      bookableStarts: [],
      dayFull: false,
    };
  }

  const { startMin, endMin, lunchStartMin, lunchEndMin } = workingDay;
  const hasLunch =
    lunchStartMin != null && lunchEndMin != null && lunchEndMin > lunchStartMin;
  const lunch: Interval | null = hasLunch
    ? { start: lunchStartMin!, end: lunchEndMin! }
    : null;

  const nowMin = nowMinutesForDate(dateStr);
  const activeBookings = existing.filter((b) => ACTIVE.has(b.status));
  const dayFull = maxPerDay > 0 && activeBookings.length >= maxPerDay;

  // ── Visual grid (generic free/occupied, independent of service duration) ──
  const grid: GridSlot[] = [];
  for (let t = startMin; t < endMin; t += slotIntervalMin) {
    const slot: Interval = { start: t, end: Math.min(t + slotIntervalMin, endMin) };
    let status: SlotStatus = "AVAILABLE";

    if (lunch && overlaps(slot, lunch)) {
      status = "LUNCH";
    } else if (nowMin >= 0 && slot.start < nowMin) {
      status = "CLOSED"; // already in the past
    } else {
      const hit = activeBookings.find((b) => overlaps(slot, b));
      if (hit) status = hit.status === "PENDING" ? "PENDING" : "OCCUPIED";
    }

    grid.push({
      startMin: slot.start,
      endMin: slot.end,
      label: minutesToLabel(slot.start),
      status,
    });
  }

  // ── Bookable start times for THIS service (respects duration + buffer) ──
  const bookableStarts: number[] = [];
  if (!dayFull) {
    for (let start = startMin; start + durationMin <= endMin; start += slotIntervalMin) {
      const service: Interval = { start, end: start + durationMin };
      // Reserved span = service + this booking's own buffer.
      const reserved: Interval = { start, end: start + durationMin + bufferMin };

      if (nowMin >= 0 && start <= nowMin) continue; // can't book in the past
      if (lunch && overlaps(service, lunch)) continue; // can't run through lunch

      // Conflict if the new reserved span overlaps any existing reserved span.
      const clash = activeBookings.some((b) => overlaps(reserved, b));
      if (clash) continue;

      bookableStarts.push(start);
    }
  }

  return { open: true, grid, bookableStarts, dayFull };
}
