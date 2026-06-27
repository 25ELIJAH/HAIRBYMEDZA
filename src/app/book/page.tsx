import Link from "next/link";
import Logo from "@/components/Logo";
import BookingWizard from "@/components/BookingWizard";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/booking";
import { todayStr } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function BookPage({
  searchParams,
}: {
  searchParams: { service?: string };
}) {
  const [services, settings, hours, blocked] = await Promise.all([
    prisma.service.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
    getSettings(),
    prisma.workingHours.findMany(),
    prisma.blockedDate.findMany({
      where: { date: { gte: todayStr() } },
      select: { date: true },
    }),
  ]);

  const openDays = hours.filter((h) => h.isOpen).map((h) => h.dayOfWeek);
  const blockedDates = blocked.map((b) => b.date);

  return (
    <div className="min-h-screen bg-lavender-50">
      <header className="border-b border-black/5 bg-white">
        <div className="container-px flex h-16 items-center justify-between">
          <Logo />
          <Link href="/" className="text-sm font-medium text-charcoal-muted hover:text-royal-600">
            ← Back to site
          </Link>
        </div>
      </header>

      <main className="container-px py-8 sm:py-12">
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
        />
      </main>
    </div>
  );
}
