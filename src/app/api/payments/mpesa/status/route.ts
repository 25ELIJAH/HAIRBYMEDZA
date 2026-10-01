import { NextRequest, NextResponse } from "next/server";
import { refreshPaymentStatus } from "@/lib/payments";
import { guard } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Polled by the booking page every few seconds while the client enters their PIN.
export async function GET(req: NextRequest) {
  const blocked = guard(req, "stk-status", 90, 60 * 1000);
  if (blocked) return blocked;

  const id = req.nextUrl.searchParams.get("id") || "";
  if (!/^[a-z0-9]{8,40}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const view = await refreshPaymentStatus(id);
  if (!view) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(view, { headers: { "Cache-Control": "no-store" } });
}
