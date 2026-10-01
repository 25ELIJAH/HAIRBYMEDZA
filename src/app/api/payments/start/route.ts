import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { startMpesaPayment } from "@/lib/payments";
import { guard } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

const schema = z.object({
  appointmentId: z.string().trim().min(8).max(40).regex(/^[a-z0-9]+$/i),
  phone: z.string().trim().min(9).max(20),
});

// Client asks for an M-Pesa PIN prompt (via Paystack) to pay for their booking.
export async function POST(req: NextRequest) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const blocked = guard(req, "pay", 6, 10 * 60 * 1000);
  if (blocked) return blocked;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid M-Pesa number." }, { status: 400 });
  }

  // At most 5 payment attempts per booking per hour, whatever the IP.
  const recent = await prisma.payment.count({
    where: {
      appointmentId: parsed.data.appointmentId,
      createdAt: { gt: new Date(Date.now() - 60 * 60_000) },
    },
  });
  if (recent >= 5) {
    return NextResponse.json(
      { error: "Too many payment attempts for this booking. Please message us on WhatsApp." },
      { status: 429 }
    );
  }

  const res = await startMpesaPayment({
    appointmentId: parsed.data.appointmentId,
    phone: parsed.data.phone,
    purpose: "BALANCE",
    initiatedBy: "CLIENT",
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json(res, { headers: { "Cache-Control": "no-store" } });
}
