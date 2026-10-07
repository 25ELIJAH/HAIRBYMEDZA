import Link from "next/link";
import Logo from "@/components/Logo";
import { prisma } from "@/lib/prisma";
import { syncWithPaystack } from "@/lib/payments";
import { formatKes, minutesToLabel, prettyDate } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

// Paystack sends the client back here after the hosted checkout. The outcome
// shown comes from verifying the transaction with Paystack, never from the URL.
export default async function PaymentCompletePage({
  searchParams,
}: {
  searchParams: { reference?: string; trxref?: string };
}) {
  const reference = String(searchParams.reference || searchParams.trxref || "");
  const valid = /^MM-[A-Za-z0-9-]{6,80}$/.test(reference);
  if (valid) await syncWithPaystack(reference).catch(() => undefined);
  const payment = valid
    ? await prisma.payment.findUnique({
        where: { reference },
        include: { appointment: { include: { service: true } } },
      })
    : null;

  const status = payment?.status ?? "UNKNOWN";
  const title =
    status === "SUCCESS"
      ? "Payment received"
      : status === "PENDING"
        ? "Payment is being confirmed"
        : status === "UNKNOWN"
          ? "Payment not found"
          : "Payment not completed";
  const text =
    status === "SUCCESS"
      ? "Thank you. Your booking is paid. You'll get a WhatsApp confirmation."
      : status === "PENDING"
        ? "We are waiting for the payment provider to confirm. Refresh this page in a minute."
        : status === "UNKNOWN"
          ? "We could not find this payment. If money left your account, please message us on WhatsApp with the details."
          : "The payment did not go through, and you have not been charged for it. You can try again from your booking, or message us on WhatsApp.";

  return (
    <div className="min-h-screen bg-cream-soft">
      <header className="border-b border-gray-200 bg-white">
        <div className="container-px flex h-16 items-center justify-between">
          <Logo />
          <Link href="/" className="text-sm text-charcoal-muted hover:text-royal-700">
            Back to site
          </Link>
        </div>
      </header>
      <main className="container-px py-12">
        <div className="card mx-auto max-w-lg p-6 sm:p-8">
          <h1 className="font-display text-2xl font-medium text-charcoal">{title}</h1>
          <p className="mt-2 text-charcoal-muted">{text}</p>

          {payment && (
            <dl className="mt-6 divide-y divide-gray-100 border-y border-gray-100 text-sm">
              <Row k="Service" v={payment.appointment.service.name} />
              <Row
                k="When"
                v={`${prettyDate(payment.appointment.date)}, ${minutesToLabel(payment.appointment.startMin)}`}
              />
              <Row k="Amount" v={formatKes(payment.amount)} />
              <Row k="Reference" v={payment.receiptNumber || payment.reference} />
            </dl>
          )}

          <Link href="/" className="btn-outline mt-6 w-full">
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-charcoal-muted">{k}</dt>
      <dd className="break-all text-right font-medium text-charcoal">{v}</dd>
    </div>
  );
}
