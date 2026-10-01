import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isValidIntasendChallenge } from "@/lib/intasend";
import { syncWithIntasend } from "@/lib/payments";

export const dynamic = "force-dynamic";

// IntaSend posts payment updates here (set this URL and a challenge string in
// the IntaSend dashboard → Settings → Webhooks). The challenge proves the call
// came from IntaSend; even then, the outcome is confirmed by asking IntaSend
// for the invoice status before anything is recorded.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    challenge?: string;
    invoice_id?: string;
    api_ref?: string;
  } | null;
  if (!body || !isValidIntasendChallenge(body.challenge)) {
    return NextResponse.json({ error: "Invalid challenge" }, { status: 401 });
  }

  const invoiceId = typeof body.invoice_id === "string" ? body.invoice_id : "";
  const apiRef = typeof body.api_ref === "string" ? body.api_ref : "";
  const payment = await prisma.payment.findFirst({
    where: {
      provider: "INTASEND",
      OR: [
        ...(invoiceId ? [{ providerTxnId: invoiceId }] : []),
        ...(apiRef.startsWith("MM-") ? [{ reference: apiRef }] : []),
      ],
    },
  });
  if (payment) {
    try {
      await syncWithIntasend(payment.reference, payment.providerTxnId || invoiceId);
      revalidatePath("/admin");
      revalidatePath("/admin/appointments");
    } catch (e) {
      console.error("IntaSend webhook processing failed", e);
      return NextResponse.json({ error: "retry" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
