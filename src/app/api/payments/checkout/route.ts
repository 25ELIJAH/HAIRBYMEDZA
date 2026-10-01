import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { startCheckout } from "@/lib/payments";
import { guard } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

const schema = z.object({
  appointmentId: z.string().trim().min(8).max(40).regex(/^[a-z0-9]+$/i),
});

// Client chooses to pay the deposit by card (Paystack hosted checkout).
export async function POST(req: NextRequest) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const blocked = guard(req, "pay", 6, 10 * 60 * 1000);
  if (blocked) return blocked;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

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

  const res = await startCheckout({
    appointmentId: parsed.data.appointmentId,
    purpose: "DEPOSIT",
    initiatedBy: "CLIENT",
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ url: res.url }, { headers: { "Cache-Control": "no-store" } });
}
