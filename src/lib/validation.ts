// Central input-validation schemas (Zod). Every external input — public API
// bodies, query strings, and admin form submissions — is parsed through one of
// these before it touches the database. Zod also trims/normalises values, so
// this doubles as input sanitisation.

import { z } from "zod";

// ── Reusable primitives ────────────────────────────────────────────
const name = z.string().trim().min(2, "Name is too short").max(80);
const phone = z
  .string()
  .trim()
  .min(9, "Phone number is too short")
  .max(20)
  .regex(/^[0-9+\-\s()]+$/, "Phone number has invalid characters");
const email = z.string().trim().toLowerCase().email("Invalid email").max(120);
const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
  // reject impossible dates like 2026-13-40
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date");
const id = z.string().trim().min(8).max(40).regex(/^[a-z0-9]+$/i, "Invalid id");

// Service photos: an https link, a local /uploads path, or a compressed
// data:image produced by the in-browser uploader. All are safe as an <img src>.
// Dangerous schemes (javascript:, non-image data:) are rejected. Generous max
// to fit a compressed photo data URL (~a few hundred KB).
const imageRef = z
  .string()
  .trim()
  .max(6_000_000)
  .refine(
    (v) =>
      v === "" ||
      /^https:\/\//i.test(v) ||
      /^\/uploads\//.test(v) ||
      /^data:image\/(jpeg|png|webp);base64,/i.test(v),
    "Image must be a photo, an https link, or an uploaded file"
  );
const externalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "Must be an http(s) link");

// ── Booking ────────────────────────────────────────────────────────
export const bookingSchema = z
  .object({
    serviceId: id,
    date: dateStr,
    startMin: z.coerce.number().int().min(0).max(1440),
    serviceType: z.enum(["INCALL", "OUTCALL"]),
    customer: z.object({
      name,
      phone,
      email: z.union([email, z.literal("")]).optional(),
    }),
    location: z
      .object({
        estate: z.string().trim().max(120).optional(),
        houseNumber: z.string().trim().max(120).optional(),
        landmark: z.string().trim().max(120).optional(),
        mapsPin: z.union([externalUrl, z.literal("")]).optional(),
        travelNotes: z.string().trim().max(600).optional(),
      })
      .optional(),
    notes: z.string().trim().max(600).optional(),
    // Optional M-Pesa deposit to secure the booking.
    deposit: z
      .object({
        mpesaNumber: z.string().trim().max(20).optional(),
        mpesaMessage: z.string().trim().max(400).optional(),
        amountPaid: z.coerce.number().int().min(0).max(1_000_000).optional(),
      })
      .optional(),
    // Honeypot: real users never fill this. We let it pass validation and the
    // route silently drops any submission that filled it (stealthier than a 400).
    company: z.string().max(200).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.serviceType === "OUTCALL") {
      const L = val.location || {};
      (["estate", "houseNumber", "landmark", "travelNotes"] as const).forEach((f) => {
        if (!L[f] || !String(L[f]).trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["location", f],
            message: "Required for out-call",
          });
        }
      });
    }
  });
export type BookingInput = z.infer<typeof bookingSchema>;

// ── Availability query ─────────────────────────────────────────────
export const availabilityQuerySchema = z.object({
  serviceId: id,
  date: dateStr,
});

// ── Admin: login ───────────────────────────────────────────────────
export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password required").max(200),
});

// ── Admin: service ─────────────────────────────────────────────────
export const serviceSchema = z.object({
  id: z.string().trim().max(40).optional(),
  name,
  description: z.string().trim().max(600).optional().default(""),
  category: z.string().trim().min(1).max(40).default("Kids"),
  priceKes: z.coerce.number().int().min(0).max(1_000_000),
  outCallPriceKes: z.coerce.number().int().min(0).max(1_000_000),
  durationMin: z.coerce.number().int().min(15).max(600),
  bufferMin: z.coerce.number().int().min(0).max(240).default(0),
  imageUrl: z.union([imageRef, z.literal("")]).optional(),
  includes: z.string().trim().max(600).optional(),
  active: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

// ── Admin: settings ────────────────────────────────────────────────
export const settingsSchema = z.object({
  slotIntervalMin: z.coerce.number().int().min(5).max(240),
  maxPerDay: z.coerce.number().int().min(0).max(100),
  salonName: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(40),
  email: z.union([email, z.literal("")]),
  location: z.string().trim().max(200),
  outcallFeeKes: z.coerce.number().int().min(0).max(1_000_000),
  mpesaNumber: z.string().trim().max(40),
  depositPercent: z.coerce.number().int().min(0).max(100),
});

// ── Admin: blocked date ────────────────────────────────────────────
export const blockedDateSchema = z.object({
  date: dateStr,
  reason: z.string().trim().min(1).max(120).default("Blocked"),
  type: z.enum(["HOLIDAY", "VACATION", "BLOCKED"]).default("BLOCKED"),
});

export const themeSchema = z.enum(["purple", "pink", "blue", "orange"]);

// Helper: first human-readable error message from a ZodError.
export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message || "Invalid input";
}
