"use client";

import { useRef, useState } from "react";

// Lets the admin add a service photo straight from their phone (camera or
// gallery) or paste an image URL. The chosen URL is written to a hidden input
// named "imageUrl" so the existing service form picks it up on save.
export default function ImageUploadField({ defaultUrl }: { defaultUrl?: string | null }) {
  const [url, setUrl] = useState(defaultUrl || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed.");
      } else {
        setUrl(data.url);
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      {/* The value the service form actually saves */}
      <input type="hidden" name="imageUrl" value={url} />

      <div className="flex flex-wrap items-center gap-4">
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-black/10 bg-lavender-50">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Service preview" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-charcoal-muted">No image</span>
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
            disabled={uploading}
            className="btn-outline !px-4 !py-2 text-sm"
          >
            {uploading ? "Uploading…" : url ? "Change photo" : "Add photo from phone"}
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
        </div>
      </div>

      <label className="mt-3 block">
        <span className="label">…or paste an image link</span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="input"
          placeholder="https://…"
        />
      </label>

      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
