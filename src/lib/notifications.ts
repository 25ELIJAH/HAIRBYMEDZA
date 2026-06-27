// Notifications.
//   • New bookings are emailed to the owner's inbox via Web3Forms.
//   • A copy of every message is stored in NotificationLog so nothing is lost.
// The Web3Forms key lives in an environment variable, never in client code.

import { prisma } from "./prisma";
import { formatKes, minutesToLabel, prettyDate } from "./time";

interface BookingForMessage {
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  serviceName: string;
  date: string;
  startMin: number;
  serviceType: string;
  priceKes: number;
  salonName: string;
  salonPhone: string;
  location?: {
    estate?: string | null;
    houseNumber?: string | null;
    landmark?: string | null;
    travelNotes?: string | null;
  };
  notes?: string | null;
}

async function log(channel: string, recipient: string, body: string, subject?: string) {
  try {
    await prisma.notificationLog.create({
      data: { channel, recipient, subject, body, status: "LOGGED" },
    });
  } catch (e) {
    console.error("notification log failed", e);
  }
}

// Sends an email to the owner inbox through Web3Forms.
async function emailOwner(subject: string, body: string) {
  // The actual email is delivered from the browser (see BookingWizard), because
  // Web3Forms' free plan only allows client side submissions. Here we just keep
  // a record of what was sent so nothing is lost.
  const owner = process.env.OWNER_EMAIL || "owner";
  await log("EMAIL", owner, body, subject);
}

export async function notifyBookingConfirmed(b: BookingForMessage) {
  const when = `${prettyDate(b.date)} at ${minutesToLabel(b.startMin)}`;
  const typeLabel = b.serviceType === "OUTCALL" ? "Out-call (I travel to the client)" : "In-call (at my studio)";

  const lines = [
    `Reminder: you have a new booking from your ${b.salonName} website.`,
    `Save this email so you do not miss it, even if you have not opened your dashboard.`,
    ``,
    `Client: ${b.customerName}`,
    `Phone: ${b.customerPhone}`,
    b.customerEmail ? `Email: ${b.customerEmail}` : "",
    `Service: ${b.serviceName}`,
    `When: ${when}`,
    `Type: ${typeLabel}`,
    `Price: ${formatKes(b.priceKes)}`,
  ];

  if (b.serviceType === "OUTCALL" && b.location) {
    lines.push(
      ``,
      `Location for the out-call:`,
      `  Area: ${b.location.estate || "not given"}`,
      b.location.houseNumber ? `  House: ${b.location.houseNumber}` : "",
      b.location.landmark ? `  Landmark: ${b.location.landmark}` : "",
      b.location.travelNotes ? `  Directions: ${b.location.travelNotes}` : "",
      `  Reminder: send the client the transport fare when you confirm this booking.`
    );
  }
  if (b.notes) lines.push(``, `Client notes: ${b.notes}`);

  lines.push(``, `Open your dashboard to confirm this booking when you are ready.`);
  const body = lines.filter((l) => l !== "").join("\n");
  await emailOwner(
    `Booking reminder: ${b.customerName} booked ${b.serviceName} (${when})`,
    body
  );

  // Client confirmation copy (sent over WhatsApp by the owner / logged here).
  await log(
    "WHATSAPP",
    b.customerPhone,
    [
      `Hi ${b.customerName.split(" ")[0]}, thank you for booking with ${b.salonName}.`,
      ``,
      `${b.serviceName}`,
      `${when}`,
      `${typeLabel}`,
      ``,
      `I look forward to doing your hair. If anything changes, message me on ${b.salonPhone}.`,
    ].join("\n")
  );
}

export async function notifyStatusChange(b: BookingForMessage, status: string) {
  const when = `${prettyDate(b.date)} at ${minutesToLabel(b.startMin)}`;
  const first = b.customerName.split(" ")[0];
  const map: Record<string, string> = {
    CONFIRMED: `Hi ${first}, your ${b.serviceName} on ${when} is confirmed. See you then.`,
    CANCELLED: `Hi ${first}, your ${b.serviceName} on ${when} has been cancelled. Message me to find a new time.`,
    COMPLETED: `Hi ${first}, thank you for coming in today. I hope you love your hair. Please tell your friends about ${b.salonName}.`,
  };
  const msg = map[status];
  if (msg) await log("WHATSAPP", b.customerPhone, msg);
}
