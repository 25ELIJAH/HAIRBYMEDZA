import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Serves a service photo that was uploaded in the admin (stored as a data URL)
// as a real image file. The ?v= fingerprint changes whenever the photo
// changes, so browsers and Vercel's CDN can cache it for a year.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!/^[a-z0-9]{8,40}$/i.test(params.id)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const s = await prisma.service.findUnique({
    where: { id: params.id },
    select: { imageUrl: true },
  });
  const url = s?.imageUrl || "";
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i.exec(url);
  if (!m) {
    if (/^https:\/\//i.test(url) || url.startsWith("/uploads/")) {
      return NextResponse.redirect(new URL(url, req.url), 302);
    }
    return new NextResponse("Not found", { status: 404 });
  }
  const bytes = Buffer.from(m[2], "base64");
  const versioned = req.nextUrl.searchParams.has("v");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": m[1].toLowerCase(),
      "Content-Length": String(bytes.length),
      "Cache-Control": versioned
        ? "public, max-age=31536000, immutable"
        : "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
