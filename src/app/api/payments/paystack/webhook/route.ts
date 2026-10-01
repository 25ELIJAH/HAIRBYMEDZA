import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isValidWebhookSignature } from "@/lib/paystack";
import { syncWithPaystack } from "@/lib/payments";

export const dynamic = "force-dynamic";

// Paystack posts payment events here (set this URL in the Paystack dashboard:
// Settings → API Keys & Webhooks). The body is signed with our secret key; we
// check the signature, then confirm the outcome by verifying the transaction
// with Paystack before recording anything.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!isValidWebhookSignature(raw, req.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } } = {};
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ received: true });
  }

  const reference = event.data?.reference;
  if (reference && typeof reference === "string" && reference.startsWith("MM-")) {
    try {
      await syncWithPaystack(reference);
      revalidatePath("/admin");
      revalidatePath("/admin/appointments");
    } catch (e) {
      console.error("Paystack webhook processing failed", e);
      // Ask Paystack to retry later.
      return NextResponse.json({ error: "retry" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
