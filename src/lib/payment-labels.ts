// Display helpers for Payment rows (safe to import in client components).

export function paymentMethod(p: { channel: string; provider?: string }): string {
  if (p.channel === "CASH" || p.provider === "MANUAL") return "Cash / manual";
  if (p.channel === "MPESA") return "M-Pesa";
  return "Card / online";
}

export const PAYMENT_STATUS_STYLE: Record<string, string> = {
  SUCCESS: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  CANCELLED: "bg-gray-100 text-gray-600",
  TIMEOUT: "bg-gray-100 text-gray-600",
  FAILED: "bg-red-50 text-red-700 ring-1 ring-red-200",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  SUCCESS: "Received",
  PENDING: "Waiting",
  CANCELLED: "Cancelled",
  TIMEOUT: "Timed out",
  FAILED: "Failed",
};
