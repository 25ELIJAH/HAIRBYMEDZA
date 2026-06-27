"use client";

import { useState, useTransition } from "react";
import { saveTheme } from "@/lib/admin-actions";

const THEMES: { key: string; label: string; swatch: string }[] = [
  { key: "purple", label: "Purple", swatch: "#6a0dad" },
  { key: "pink", label: "Pink", swatch: "#db2777" },
  { key: "blue", label: "Blue", swatch: "#2563eb" },
  { key: "orange", label: "Orange", swatch: "#ea580c" },
];

export default function ThemePicker({ current }: { current: string }) {
  const [active, setActive] = useState(current);
  const [pending, startTransition] = useTransition();

  function choose(key: string) {
    setActive(key);
    // Instant preview for everyone viewing this page…
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = key;
    }
    // …and persist so the whole site (client + admin) uses it on every render.
    startTransition(() => void saveTheme(key));
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {THEMES.map((t) => {
          const selected = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => choose(t.key)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                selected
                  ? "border-royal-500 bg-royal-50 ring-2 ring-royal-200"
                  : "border-black/10 bg-white hover:border-royal-300"
              }`}
            >
              <span
                className="h-8 w-8 shrink-0 rounded-full ring-2 ring-black/5"
                style={{ backgroundColor: t.swatch }}
              />
              <span>
                <span className="block text-sm font-semibold text-charcoal">{t.label}</span>
                {selected && (
                  <span className="block text-xs text-royal-600">
                    {pending ? "Saving…" : "Active"}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-charcoal-muted">
        The colour changes here instantly and updates the public site on its next load.
      </p>
    </div>
  );
}
