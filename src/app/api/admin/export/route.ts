import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPhone } from "@/lib/phone";
import { minutesToHHMM, salonDateStr, salonTimeStr, todayStr } from "@/lib/time";
import { paymentMethod } from "@/lib/payment-labels";

export const dynamic = "force-dynamic";

// Spreadsheet backup of every client or every booking. Opens in Excel / Sheets.
function csv(rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    let s = v == null ? "" : String(v);
    // Neutralise spreadsheet formula injection from client-entered text.
    // A plain phone number like "+254 712 345 678" is left alone.
    if (/^[=+\-@\t\r]/.test(s) && !/^\+[\d ]+$/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

export async function GET(req: NextRequest) {
  const session = await getVerifiedAdmin();
  if (!session) return NextResponse.json({ error: "Not authorised" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type");
  let body: string;
  if (type === "customers") {
    const customers = await prisma.customer.findMany({
      include: { appointments: true },
      orderBy: { createdAt: "asc" },
    });
    body = csv([
      ["Name", "Phone", "Email", "Notes", "Bookings", "Completed", "Total paid (KES)", "Last booking", "Client since"],
      ...customers.map((c) => [
        c.name,
        formatPhone(c.phone),
        c.email,
        c.notes,
        c.appointments.filter((a) => a.status !== "CANCELLED").length,
        c.appointments.filter((a) => a.status === "COMPLETED").length,
        c.appointments.reduce((s, a) => s + a.amountPaid, 0),
        c.appointments.map((a) => a.date).sort().at(-1) || "",
        c.createdAt.toISOString().slice(0, 10),
      ]),
    ]);
  } else if (type === "appointments") {
    const appts = await prisma.appointment.findMany({
      include: { customer: true, service: true, payments: { where: { status: "SUCCESS" } } },
      orderBy: [{ date: "desc" }, { startMin: "desc" }],
    });
    body = csv([
      ["Date", "Time", "Client", "Phone", "Service", "Where", "Status", "Price (KES)", "Paid (KES)", "Payment", "M-Pesa receipts", "Location", "Notes", "Source", "Booked at"],
      ...appts.map((a) => [
        a.date,
        minutesToHHMM(a.startMin),
        a.customer.name,
        formatPhone(a.customer.phone),
        a.service.name,
        a.serviceType === "OUTCALL" ? "Home visit" : "Studio",
        a.status,
        a.priceKes,
        a.amountPaid,
        a.paymentStatus,
        a.payments.map((p) => p.receiptNumber).filter(Boolean).join(" "),
        [a.estate, a.houseNumber, a.landmark].filter(Boolean).join(", "),
        a.notes,
        a.source,
        a.createdAt.toISOString(),
      ]),
    ]);
  } else if (type === "payments") {
    const payments = await prisma.payment.findMany({
      where: { status: "SUCCESS" },
      include: { appointment: { include: { customer: true, service: true } } },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    });
    body = csv([
      ["Date", "Time", "Amount (KES)", "Client", "Phone", "Service", "Booking date", "Method", "Receipt", "Reference", "Provider"],
      ...payments.map((p) => {
        const at = p.paidAt ?? p.createdAt;
        return [
          salonDateStr(at),
          salonTimeStr(at),
          p.amount,
          p.appointment.customer.name,
          formatPhone(p.appointment.customer.phone),
          p.appointment.service.name,
          p.appointment.date,
          paymentMethod(p),
          p.receiptNumber,
          p.reference,
          p.provider,
        ];
      }),
    ]);
  } else {
    return NextResponse.json({ error: "Unknown export" }, { status: 400 });
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="medza-${type}-${todayStr()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
