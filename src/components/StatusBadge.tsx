const STATUS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-royal-100 text-royal-700",
  CANCELLED: "bg-red-100 text-red-600",
};

const PAYMENT: Record<string, string> = {
  UNPAID: "bg-gray-100 text-gray-600",
  PAID: "bg-emerald-100 text-emerald-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  REFUND: "bg-red-100 text-red-600",
};

const TYPE: Record<string, string> = {
  INCALL: "bg-lavender-100 text-royal-700",
  OUTCALL: "bg-gold/20 text-gold-dark",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS[status] || "bg-gray-100 text-gray-600"}`}>
      {status[0] + status.slice(1).toLowerCase()}
    </span>
  );
}

export function PaymentBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${PAYMENT[status] || "bg-gray-100 text-gray-600"}`}>
      {status[0] + status.slice(1).toLowerCase()}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`badge ${TYPE[type] || "bg-gray-100"}`}>
      {type === "OUTCALL" ? "Home" : "Studio"}
    </span>
  );
}
