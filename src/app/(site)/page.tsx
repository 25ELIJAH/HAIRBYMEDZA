import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ServiceCard from "@/components/ServiceCard";
import WhatsAppButton from "@/components/WhatsAppButton";
import Icon from "@/components/Icon";
import Reveal from "@/components/Reveal";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/booking";
import { headers } from "next/headers";
import { DAY_NAMES, formatKes, minutesToHHMM } from "@/lib/time";

export const dynamic = "force-dynamic";

const CATEGORY_ORDER = ["Kids", "Teen", "Package"];
const CATEGORY_LABEL: Record<string, string> = {
  Kids: "Kids Braiding",
  Teen: "Teen Braiding",
  Package: "Signature Packages",
};

const STEPS = [
  ["Choose your style", "Browse the styles and pick the one you love."],
  ["Studio or your place", "Come to my studio, or ask me to come to you."],
  ["Pick a free time", "Only open times show, so there is never a clash."],
  ["Secure it", "Pay a small deposit and I confirm on WhatsApp."],
];

export default async function HomePage() {
  const [services, settings, hours] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    getSettings(),
    prisma.workingHours.findMany({ orderBy: { dayOfWeek: "asc" } }),
  ]);


  // Show the known groups first, then any other categories the admin created,
  // so a newly added service always appears no matter its category name.
  const categories = [
    ...CATEGORY_ORDER.filter((c) => services.some((s) => s.category === c)),
    ...Array.from(new Set(services.map((s) => s.category)))
      .filter((c) => !CATEGORY_ORDER.includes(c))
      .sort(),
  ];
  const labelFor = (cat: string) => CATEGORY_LABEL[cat] || cat;

  const catMin = (cat: string) => {
    const prices = services.filter((s) => s.category === cat).map((s) => s.priceKes);
    return prices.length ? Math.min(...prices) : null;
  };

  const fromPrice = services.length ? Math.min(...services.map((s) => s.priceKes)) : null;
  const openDays = hours.filter((h) => h.isOpen);

  return (
    <>
      <SiteHeader />

      {/* ── Hero: photo as a full backdrop, words on top ────── */}
      <section className="relative isolate overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1572955304332-bf714bd49add?auto=format&fit=crop&w=1800&q=75"
          alt=""
          aria-hidden="true"
          className="animate-slow-zoom absolute inset-0 -z-20 h-full w-full object-cover object-center"
        />
        {/* soft white wash so the black text always reads clearly */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-white/80 sm:bg-transparent sm:bg-gradient-to-r sm:from-white sm:via-white/85 sm:to-white/20"
        />

        <div className="container-px flex min-h-[80vh] items-center py-16 sm:py-24">
          <div className="max-w-xl">
            <h1
              className="animate-fade-up font-display text-4xl font-bold leading-tight text-charcoal sm:text-6xl"
            >
              Neat, gentle braiding for kids and teens.
            </h1>
            <p
              className="mt-5 max-w-lg animate-fade-up text-lg leading-relaxed text-charcoal"
              style={{ animationDelay: "160ms" }}
            >
              Come to my studio or I come to you. Pick a free time online, pay a small deposit
              with M-Pesa, and I confirm on WhatsApp.
            </p>
            <div className="mt-8 flex animate-fade-up flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
              <Link
                href="/book"
                className="btn-primary group !px-6 !py-3.5 text-base shadow-soft transition-all duration-300 hover:-translate-y-0.5"
              >
                Book an appointment
                <Icon name="arrowRight" size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link href="/#services" className="btn-outline !bg-white/90 !px-6 !py-3.5 text-base">
                See prices
              </Link>
            </div>
            <ul
              className="mt-8 grid max-w-md animate-fade-up grid-cols-2 gap-x-6 gap-y-2 text-sm font-medium text-charcoal"
              style={{ animationDelay: "320ms" }}
            >
              {fromPrice != null && (
                <li className="flex items-center gap-2">
                  <Icon name="check" size={16} className="text-royal-600" /> From {formatKes(fromPrice)}
                </li>
              )}
              <li className="flex items-center gap-2">
                <Icon name="check" size={16} className="text-royal-600" /> Studio or home visits
              </li>
              <li className="flex items-center gap-2">
                <Icon name="check" size={16} className="text-royal-600" /> Pay deposit by M-Pesa
              </li>
              <li className="flex items-center gap-2">
                <Icon name="check" size={16} className="text-royal-600" /> Open {openDays.length} days a week
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Services ─────────────────────────────────────────── */}
      <section id="services" className="bg-cream-soft py-16 sm:py-20">
        <div className="container-px">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">Services</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-charcoal">Styles and prices</h2>
            <p className="mt-3 text-charcoal-muted">
              Every style includes a wash, blow dry, braiding and styling. Home visits cost a
              little more.
            </p>
          </Reveal>

          {categories.map((cat) => (
            <div key={cat} className="mt-12">
              <Reveal className="mb-5 flex items-center gap-3">
                <h3 className="font-display text-lg font-semibold text-charcoal">{labelFor(cat)}</h3>
                <span className="h-px flex-1 bg-gray-200" />
              </Reveal>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {services
                  .filter((s) => s.category === cat)
                  .map((s, i) => (
                    <Reveal key={s.id} delay={(i % 3) * 80} className="h-full">
                      <ServiceCard
                        service={s}
                        footer={
                          <Link href={`/book?service=${s.id}`} className="btn-outline w-full">
                            Book this style
                          </Link>
                        }
                      />
                    </Reveal>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section id="how" className="py-16 sm:py-20">
        <div className="container-px">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-charcoal">Booked in four easy steps</h2>
          </Reveal>
          <ol className="relative mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <span aria-hidden className="absolute left-5 right-5 top-5 hidden h-px bg-royal-100 lg:block" />
            {STEPS.map(([t, d], i) => (
              <Reveal as="li" key={t} delay={i * 100} className="relative">
                <span className="relative grid h-10 w-10 place-items-center rounded-full bg-royal-600 text-sm font-bold text-white ring-4 ring-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-charcoal">{t}</h3>
                <p className="mt-1.5 text-sm text-charcoal-muted">{d}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Final call to action ─────────────────────────────── */}
      <section className="pb-20">
        <div className="container-px">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-royal-700 px-6 py-12 text-white sm:px-12">
              <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-display text-2xl font-bold sm:text-3xl">Ready for your next look?</h2>
                  <p className="mt-2 text-royal-100">
                    Choose a time that suits you. I will message you on WhatsApp to confirm.
                  </p>
                </div>
                <Link
                  href="/book"
                  className="btn group shrink-0 bg-white !px-6 !py-3.5 text-base text-royal-800 transition-all duration-300 hover:-translate-y-0.5 hover:bg-royal-50"
                >
                  Book an appointment
                  <Icon name="arrowRight" size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </Reveal>
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
