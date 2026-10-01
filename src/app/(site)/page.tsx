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

const STEPS = ["Choose a style", "Studio or home", "Pick a time", "Pay a deposit"];

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

      {/* ── Hero: photo backdrop, words on top ──────────────── */}
      <section className="relative isolate overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1572955304332-bf714bd49add?auto=format&fit=crop&w=1600&q=70"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-white/80 sm:bg-transparent sm:bg-gradient-to-r sm:from-white sm:via-white/85 sm:to-white/20"
        />
        <div className="container-px flex min-h-[70vh] items-center py-16 sm:py-24">
          <div className="max-w-xl">
            <h1 className="font-display text-4xl font-bold leading-tight text-charcoal sm:text-6xl">
              Braiding for kids and teens.
            </h1>
            <p className="mt-4 text-lg text-charcoal">
              Studio or home visits{fromPrice != null ? ` · from ${formatKes(fromPrice)}` : ""}.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book" className="btn-primary !px-6 !py-3.5 text-base">
                Book now
              </Link>
              <Link href="/#services" className="btn-outline !bg-white/90 !px-6 !py-3.5 text-base">
                Prices
              </Link>
            </div>
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

      {/* ── How it works ─────────────────────────────────────── */}
      <section id="how" className="py-16">
        <div className="container-px">
          <h2 className="font-display text-3xl font-bold text-charcoal">How it works</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((t, i) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-royal-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <span className="font-display font-semibold text-charcoal">{t}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Call to action ───────────────────────────────────── */}
      <section className="pb-16">
        <div className="container-px">
          <div className="flex flex-col items-start justify-between gap-5 rounded-2xl bg-royal-700 px-6 py-10 text-white sm:flex-row sm:items-center sm:px-10">
            <h2 className="font-display text-2xl font-bold">Ready for your next look?</h2>
            <Link href="/book" className="btn shrink-0 bg-white !px-6 !py-3.5 text-base text-royal-800 hover:bg-royal-50">
              Book now
            </Link>
          </div>
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
