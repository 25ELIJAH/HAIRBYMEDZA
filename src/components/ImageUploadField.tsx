"use client";

import { useRef, useState } from "react";

// Lets the admin add a service photo straight from their phone (camera or
// gallery). The image is resized + compressed in the browser and stored as a
// compact data URL, so it works everywhere (including Vercel) with no external
// storage or links needed. The result is written to a hidden "imageUrl" input
// that the service form saves.
const MAX_DIM = 900; // longest edge in px
const QUALITY = 0.72;

function compress(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        let { width, height } = img;
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
        if (!ctx) return reject(new Error("no canvas"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
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
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await compress(file);
      setUrl(dataUrl);
    } catch {
      setError("Could not read that image. Try another photo.");
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
