// Kenyan phone number helpers.
//
// Clients type their number in many shapes: "0712 345 678", "+254712345678",
// "254 712 345678", "712345678". Stored raw, the same client ended up as
// several different customers and their booking history was split. Every
// number is now stored in one canonical shape: "2547XXXXXXXX" (also exactly
// what M-Pesa expects).

/** Digits only. */
export function digitsOnly(raw: string): string {
  return (raw || "").replace(/[^0-9]/g, "");
}

/**
 * Canonical Kenyan mobile number "2547XXXXXXXX" / "2541XXXXXXXX".
 * Returns null when the input cannot be a Kenyan mobile number.
 */
export function normalizeKePhone(raw: string): string | null {
  let d = digitsOnly(raw);
  if (d.startsWith("00")) d = d.slice(2); // 00254...
  if (d.startsWith("254")) d = d.slice(3);
  else if (d.startsWith("0")) d = d.slice(1);
  if (!/^[17]\d{8}$/.test(d)) return null;
  return `254${d}`;
}

/**
 * Best key to store a customer's phone under. Kenyan numbers are canonicalised;
 * anything else (a foreign number) keeps its digits with a leading "+".
 */
export function customerPhoneKey(raw: string): string {
  return normalizeKePhone(raw) ?? `+${digitsOnly(raw)}`;
}

/** Every stored shape an older record might use for the same number. */
export function phoneVariants(raw: string): string[] {
  const out = new Set<string>([raw.trim()]);
  const ke = normalizeKePhone(raw);
  if (ke) {
    const local = ke.slice(3); // 7XXXXXXXX
    out.add(ke);
    out.add(`+${ke}`);
    out.add(`0${local}`);
    out.add(local);
    out.add(`+254 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`);
    out.add(`0${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`);
  } else {
    out.add(`+${digitsOnly(raw)}`);
    out.add(digitsOnly(raw));
  }
  return [...out].filter(Boolean);
}

/** Friendly display: "+254 712 345 678". */
export function formatPhone(stored: string): string {
  const ke = normalizeKePhone(stored);
  if (!ke) return stored;
  const l = ke.slice(3);
  return `+254 ${l.slice(0, 3)} ${l.slice(3, 6)} ${l.slice(6)}`;
}
