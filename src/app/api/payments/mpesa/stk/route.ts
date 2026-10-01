import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { startStkPayment } from "@/lib/payments";
import { guard } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

const schema = z.object({
  appointmentId: z.string().trim().min(8).max(40).regex(/^[a-z0-9]+$/i),
  phone: z.string().trim().min(9).max(20),
});

// Client asks for an M-Pesa PIN prompt to pay the deposit on their booking.
export async function POST(req: NextRequest) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const blocked = guard(req, "stk", 6, 10 * 60 * 1000);
  if (blocked) return blocked;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid M-Pesa number." }, { status: 400 });
  }

  // At most 5 prompts per booking per hour, whatever the IP.
  const recent = await prisma.mpesaPayment.count({
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

  const res = await startStkPayment({
    appointmentId: parsed.data.appointmentId,
    phone: parsed.data.phone,
    purpose: "DEPOSIT",
    initiatedBy: "CLIENT",
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json(res, { headers: { "Cache-Control": "no-store" } });
}
