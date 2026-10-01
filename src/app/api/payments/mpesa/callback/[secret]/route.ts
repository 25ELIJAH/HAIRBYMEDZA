import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isValidCallbackSecret, parseCallback, stateForResultCode } from "@/lib/mpesa";
import { applyPaymentResult } from "@/lib/payments";

export const dynamic = "force-dynamic";

// Safaricom posts the STK Push result here. Daraja does not sign callbacks, so
// the URL carries a long secret only Safaricom is given. Only results for
// CheckoutRequestIDs we created are ever applied.
export async function POST(req: NextRequest, { params }: { params: { secret: string } }) {
  if (!isValidCallbackSecret(params.secret || "")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = parseCallback(await req.json().catch(() => ({})));
  if (parsed) {
    try {
      await applyPaymentResult(parsed.checkoutRequestId, {
        state: stateForResultCode(parsed.resultCode),
        resultCode: parsed.resultCode,
        resultDesc: parsed.resultDesc,
        receiptNumber: parsed.receiptNumber,
        amount: parsed.amount,
      });
      revalidatePath("/admin");
      revalidatePath("/admin/appointments");
    } catch (e) {
      console.error("M-Pesa callback processing failed", e);
    }
  }

  // Always acknowledge so Safaricom does not keep retrying.
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
