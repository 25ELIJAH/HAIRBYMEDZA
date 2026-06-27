import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { getSession, ADMIN_ROLES } from "@/lib/auth";
import { guard } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

// Accepts a photo (phone camera or gallery) and stores it.
//  • On Vercel (BLOB_READ_WRITE_TOKEN set) it goes to Vercel Blob storage,
//    which persists across deploys and serverless invocations.
//  • Locally it falls back to public/uploads so dev still works without a token.
export async function POST(req: NextRequest) {
  const blocked = guard(req, "upload", 30, 5 * 60 * 1000);
  if (blocked) return blocked;

  const session = await getSession();
  if (!session || !ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Please upload a JPG, PNG, WEBP or GIF image." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 8MB)." }, { status: 400 });
  }

  const ext =
    file.type === "image/png" ? "png" :
    file.type === "image/webp" ? "webp" :
    file.type === "image/gif" ? "gif" : "jpg";
  const key = `services/${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  // Production / Vercel: object storage.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(key, bytes, { access: "public", contentType: file.type });
    return NextResponse.json({ url: blob.url });
  }

  // Local dev fallback: write to public/uploads.
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, name), bytes);
  return NextResponse.json({ url: `/uploads/${name}` });
}
