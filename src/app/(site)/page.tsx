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
        {/* Soft violet wash behind the photo, and a glow for phones */}
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 -z-0 hidden w-[40%] bg-gradient-to-br from-violet-100 via-violet-50 to-royal-50 lg:block"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-200/60 blur-3xl lg:hidden"
        />
        <div className="container-px relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-20">
          <div className="max-w-xl">
            <p className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">
              <span className="h-px w-8 bg-violet-400" />
              Hair braiding · Nairobi
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.1] text-charcoal sm:text-6xl">
              Braiding for kids and{" "}
              <span className="bg-gradient-to-r from-royal-600 to-violet-600 bg-clip-text text-transparent">teens.</span>
            </h1>
            <p className="mt-5 text-lg text-charcoal-soft">
              Studio or home visits{fromPrice != null ? ` · from ${formatKes(fromPrice)}` : ""}.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book" className="btn-brand !px-6 !py-3.5 text-base">
                Book now
              </Link>
              <Link href="/#services" className="btn-outline !px-6 !py-3.5 text-base hover:!border-violet-300 hover:!text-violet-700">
                Prices
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-violet-100 pt-6 text-sm">
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

          <div className="relative mx-auto w-full max-w-sm sm:max-w-md lg:max-w-none">
            <div
              aria-hidden
              className="absolute -bottom-3 -left-3 hidden h-full w-full rounded-2xl border border-violet-300/70 sm:block"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1572955304332-bf714bd49add?auto=format&fit=crop&crop=faces&w=900&h=1125&q=75"
              alt="Box braids by Magdalene Medza"
              width={900}
              height={1125}
              fetchPriority="high"
              className="relative aspect-[4/3] w-full rounded-2xl object-cover object-[center_30%] shadow-[0_24px_60px_-20px_rgba(76,29,149,0.35)] sm:aspect-[4/5]"
            />
          </div>
        </div>
      </section>

      {/* ── Services ─────────────────────────────────────────── */}
      <section id="services" className="bg-gradient-to-b from-violet-50/70 via-cream-soft to-cream-soft py-16 sm:py-20">
        <div className="container-px">
          <p className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">
            <span className="h-px w-8 bg-violet-400" />
            Price list
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-charcoal">Prices</h2>
          <p className="mt-2 text-charcoal-muted">Wash, blow dry and styling included.</p>

          {categories.map((cat) => (
            <div key={cat} className="mt-10">
              <h3 className="mb-5 inline-flex items-center rounded-full bg-violet-100 px-3.5 py-1 text-sm font-semibold text-violet-800">
                {labelFor(cat)}
              </h3>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {services
                  .filter((s) => s.category === cat)
                  .map((s) => (
                    <ServiceCard
                      key={s.id}
                      service={s}
                      footer={
                        <Link
                          href={`/book?service=${s.id}`}
                          className="btn-outline w-full hover:!border-violet-400 hover:!bg-violet-50 hover:!text-violet-800"
                        >
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
