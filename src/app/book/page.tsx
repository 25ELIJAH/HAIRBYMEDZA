import Link from "next/link";
import Logo from "@/components/Logo";
import BookingWizard from "@/components/BookingWizard";
import { getPublicHours, getPublicServices, getPublicSettings, getUpcomingBlockedDates } from "@/lib/public-data";
import { cardPaymentsEnabled, paymentsEnabled, providerInfo } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default async function BookPage({
  searchParams,
}: {
  searchParams: { service?: string };
}) {
  // Cached reads: photos come as small links, not embedded in the page.
  const [services, settings, hours, blockedDates] = await Promise.all([
    getPublicServices(),
    getPublicSettings(),
    getPublicHours(),
    getUpcomingBlockedDates(),
  ]);

  const openDays = hours.filter((h) => h.isOpen).map((h) => h.dayOfWeek);

  return (
    <div className="min-h-screen bg-cream-soft">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="container-px flex h-16 items-center justify-between">
          <Logo />
          <Link href="/" className="text-sm text-charcoal-muted transition hover:text-royal-700">
            Back to site
          </Link>
        </div>
      </header>

      <main className="container-px py-8 sm:py-10">
        <BookingWizard
          services={services.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            category: s.category,
            priceKes: s.priceKes,
            outCallPriceKes: s.outCallPriceKes,
            durationMin: s.durationMin,
            imageUrl: s.imageUrl,
            includes: s.includes,
          }))}
          initialServiceId={searchParams.service}
          salonName={settings.salonName}
          salonPhone={settings.phone}
          location={settings.location}
          openDays={openDays}
          blockedDates={blockedDates}
          mpesaNumber={settings.mpesaNumber}
          stkEnabled={paymentsEnabled()}
          cardEnabled={cardPaymentsEnabled()}
          providerName={providerInfo()?.name || ""}
        />
      </main>
    </div>
  );
}
