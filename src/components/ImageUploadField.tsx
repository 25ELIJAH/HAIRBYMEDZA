"use client";

import { useRef, useState } from "react";

// Lets the admin add a service photo straight from their phone (camera or
// gallery). The image is resized + compressed in the browser and stored as a
// compact data URL, so it works everywhere (including Vercel) with no external
// storage or links needed. The result is written to a hidden "imageUrl" input
// that the service form saves.
const MAX_DIM = 900; // longest edge in px
const QUALITY = 0.7;

function drawToDataUrl(src: CanvasImageSource, w: number, h: number): string {
  let width = w || MAX_DIM;
  let height = h || MAX_DIM;
  if (width > height && width > MAX_DIM) {
    height = Math.round((height * MAX_DIM) / width);
    width = MAX_DIM;
  } else if (height > MAX_DIM) {
    width = Math.round((width * MAX_DIM) / height);
    height = MAX_DIM;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(src, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", QUALITY);
}

// Robust decode: try createImageBitmap first (handles most formats, large
// images and phone photos well), then fall back to FileReader + <img>.
async function toCompressedDataUrl(file: File): Promise<string> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      const out = drawToDataUrl(bmp, bmp.width, bmp.height);
      bmp.close?.();
      return out;
    } catch {
      /* fall through to the reader path */
    }
  }
  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("read failed"));
    r.onload = () => resolve(r.result as string);
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("decode failed"));
    i.src = dataUrl;
  });
  return drawToDataUrl(img, img.naturalWidth, img.naturalHeight);
}

export default function ImageUploadField({ defaultUrl }: { defaultUrl?: string | null }) {
  const [url, setUrl] = useState(defaultUrl || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const dataUrl = await toCompressedDataUrl(file);
      setUrl(dataUrl);
    } catch {
      setError(
        "Could not read that photo. If it is from an iPhone, set Camera → Formats → " +
          "Most Compatible, or take a screenshot of the photo and upload that."
      );
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      {/* The value the service form saves */}
      <input type="hidden" name="imageUrl" value={url} />

      <div className="flex flex-wrap items-center gap-4">
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-black/10 bg-lavender-50">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Service preview" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-charcoal-muted">No photo</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="btn-primary !px-4 !py-2 text-sm"
          >
            {busy ? "Processing…" : url ? "Change photo" : "Add photo from phone"}
          </button>
          {url && (
            <button
              type="button"
              onClick={() => setUrl("")}
              className="text-left text-xs font-medium text-red-600 hover:underline"
            >
              Remove photo
            </button>
          )}
          <p className="text-xs text-charcoal-muted">
            Take a photo or pick one from your gallery. It is saved with the style.
          </p>
        </div>
      </div>

      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
