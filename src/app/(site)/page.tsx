import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ServiceCard from "@/components/ServiceCard";
import WhatsAppButton from "@/components/WhatsAppButton";
import { getPublicHours, getPublicServices, getPublicSettings } from "@/lib/public-data";
import { headers } from "next/headers";
import { DAY_NAMES, formatKes, minutesToHHMM } from "@/lib/time";

export const dynamic = "force-dynamic";

const CATEGORY_ORDER = ["Kids", "Teen", "Package"];
const CATEGORY_LABEL: Record<string, string> = {
  Kids: "Kids",
  Teen: "Teens",
  Package: "Packages",
};

export default async function HomePage() {
  // Cached reads: photos come as small links, not embedded in the page.
  const [services, settings, hours] = await Promise.all([
    getPublicServices(),
    getPublicSettings(),
    getPublicHours(),
  ]);

  const categories = [
    ...CATEGORY_ORDER.filter((c) => services.some((s) => s.category === c)),
    ...Array.from(new Set(services.map((s) => s.category)))
      .filter((c) => !CATEGORY_ORDER.includes(c))
      .sort(),
  ];
  const labelFor = (cat: string) => CATEGORY_LABEL[cat] || cat;
  const fromPrice = services.length ? Math.min(...services.map((s) => s.priceKes)) : null;

  return (
    <>
      <SiteHeader />

      {/* ── Hero: words left, full photo right ─────────────── */}
      <section className="relative overflow-hidden bg-white">
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 -z-0 hidden w-[38%] bg-royal-50 lg:block"
        />
        <div className="container-px relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-20">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-royal-700">
              Hair braiding · Nairobi
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.1] text-charcoal sm:text-6xl">
              Braiding for kids and teens.
            </h1>
            <p className="mt-5 text-lg text-charcoal-soft">
              Studio or home visits{fromPrice != null ? ` · from ${formatKes(fromPrice)}` : ""}.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book" className="btn-primary !px-6 !py-3.5 text-base">
                Book now
              </Link>
              <Link href="/#services" className="btn-outline !px-6 !py-3.5 text-base">
                Prices
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-gray-200 pt-6 text-sm">
              <div>
                <dt className="text-charcoal-muted">Book</dt>
                <dd className="mt-1 font-semibold text-charcoal">Online</dd>
              </div>
              <div>
                <dt className="text-charcoal-muted">Pay</dt>
                <dd className="mt-1 font-semibold text-charcoal">M-Pesa</dd>
              </div>
              <div>
                <dt className="text-charcoal-muted">Visit</dt>
                <dd className="mt-1 font-semibold text-charcoal">Studio or home</dd>
              </div>
            </dl>
          </div>

          <div className="mx-auto w-full max-w-sm sm:max-w-md lg:max-w-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1572955304332-bf714bd49add?auto=format&fit=crop&crop=faces&w=900&h=1125&q=75"
              alt="Box braids by Magdalene Medza"
              width={900}
              height={1125}
              fetchPriority="high"
              className="aspect-[4/3] w-full rounded-2xl object-cover object-[center_30%] sm:aspect-[4/5] shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)]"
            />
          </div>
        </div>
      </section>

      {/* ── Services ─────────────────────────────────────────── */}
      <section id="services" className="bg-cream-soft py-16">
        <div className="container-px">
          <h2 className="font-display text-3xl font-bold text-charcoal">Prices</h2>
          <p className="mt-2 text-charcoal-muted">Wash, blow dry and styling included.</p>

          {categories.map((cat) => (
            <div key={cat} className="mt-10">
              <h3 className="mb-4 font-display text-lg font-semibold text-charcoal">{labelFor(cat)}</h3>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {services
                  .filter((s) => s.category === cat)
                  .map((s) => (
                    <ServiceCard
                      key={s.id}
                      service={s}
                      footer={
                        <Link href={`/book?service=${s.id}`} className="btn-outline w-full">
                          Book
                        </Link>
                      }
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Structured data: lets Google show the salon as a local business with
          hours, location and prices. */}
      <script
        type="application/ld+json"
        nonce={headers().get("x-nonce") || undefined}
        dangerouslySetInnerHTML={{ __html: jsonLd(settings, hours, services) }}
      />

      <SiteFooter
        phone={settings.phone}
        email={settings.email}
        location={settings.location}
        hours={hours}
        devWhatsapp={process.env.DEV_WHATSAPP || ""}
      />
      <WhatsAppButton phone={settings.phone} />
    </>
  );
}

function jsonLd(
  settings: { salonName: string; phone: string; email: string; location: string },
  hours: { dayOfWeek: number; isOpen: boolean; startMin: number; endMin: number }[],
  services: { name: string; priceKes: number }[]
): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
  const data = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: settings.salonName,
    url: site || undefined,
    image: site ? `${site}/logo.jpg` : undefined,
    telephone: settings.phone || undefined,
    email: settings.email || undefined,
    priceRange: "KES",
    currenciesAccepted: "KES",
    paymentAccepted: "M-Pesa, Cash",
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.location,
      addressLocality: "Nairobi",
      addressCountry: "KE",
    },
    openingHoursSpecification: hours
      .filter((h) => h.isOpen)
      .map((h) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: DAY_NAMES[h.dayOfWeek],
        opens: minutesToHHMM(h.startMin),
        closes: minutesToHHMM(h.endMin),
      })),
    makesOffer: services.slice(0, 30).map((s) => ({
      "@type": "Offer",
      price: s.priceKes,
      priceCurrency: "KES",
      itemOffered: { "@type": "Service", name: s.name },
    })),
  };
  // Escape "<" so client-entered text can never close the script tag.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
