import { NextRequest, NextResponse } from "next/server";
import { getAvailability } from "@/lib/booking";
import { guard } from "@/lib/rate-limit";
import { availabilityQuerySchema, firstError } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Public endpoint, but throttle scraping/abuse: 60 lookups per IP per minute.
  const blocked = guard(req, "availability", 60, 60 * 1000);
  if (blocked) return blocked;

  const parsed = availabilityQuerySchema.safeParse({
    serviceId: req.nextUrl.searchParams.get("serviceId"),
    date: req.nextUrl.searchParams.get("date"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  }

  const result = await getAvailability(parsed.data.serviceId, parsed.data.date);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
