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

const PERKS: { icon: "sparkle" | "clock" | "home"; title: string; text: string }[] = [
  { icon: "sparkle", title: "Gentle hands", text: "Patient with little ones, neat parting and no rushing." },
  { icon: "clock", title: "On time, every time", text: "Your slot is held for you. No long waits at the studio." },
  { icon: "home", title: "Studio or your home", text: "Come to me, or I bring everything to your door." },
];

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

  const studio = settings.location.split(",")[0];

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

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-royal-50 via-white to-white">
        {/* soft background shapes */}
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-royal-100/70 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-20 top-40 h-80 w-80 rounded-full bg-royal-100/60 blur-3xl" />

        <div className="container-px relative grid items-center gap-12 py-12 lg:grid-cols-2 lg:gap-16 lg:py-20">
          <div>
            <p className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-royal-200 bg-white/80 px-3 py-1 text-xs font-medium text-royal-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-royal-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-royal-600" />
              </span>
              Now booking · {studio || "Nairobi"}
            </p>
            <h1
              className="mt-5 animate-fade-up font-display text-4xl font-bold leading-tight text-charcoal sm:text-5xl"
              style={{ animationDelay: "80ms" }}
            >
              Neat, gentle braiding for <span className="text-royal-600">kids and teens</span>.
            </h1>
            <p
              className="mt-5 max-w-lg animate-fade-up text-lg leading-relaxed text-charcoal-muted"
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
              <Link href="/#services" className="btn-outline !px-6 !py-3.5 text-base">
                See prices
              </Link>
            </div>
            <ul
              className="mt-8 grid max-w-md animate-fade-up grid-cols-2 gap-x-6 gap-y-2 text-sm text-charcoal-soft"
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

          <div className="relative animate-fade-up" style={{ animationDelay: "200ms" }}>
            <div className="overflow-hidden rounded-3xl bg-white p-2 shadow-soft ring-1 ring-black/5">
              {/* min height keeps the frame in place while the photo loads */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1572955304332-bf714bd49add?auto=format&w=1200&q=75"
                alt="Braided hairstyle"
                className="block h-auto min-h-[220px] w-full rounded-2xl bg-royal-50"
              />
            </div>
            {fromPrice != null && (
              <div className="animate-float absolute -bottom-5 left-4 rounded-2xl bg-white px-4 py-3 shadow-soft ring-1 ring-black/5 sm:-left-6">
                <p className="text-xs text-charcoal-muted">Styles from</p>
                <p className="font-display text-lg font-bold text-charcoal">{formatKes(fromPrice)}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Why clients choose me ───────────────────────────── */}
      <section className="py-14">
        <div className="container-px grid gap-5 sm:grid-cols-3">
          {PERKS.map((p, i) => (
            <Reveal key={p.title} delay={i * 90}>
              <div className="h-full rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-royal-200 hover:shadow-soft">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-royal-50 text-royal-600">
                  <Icon name={p.icon} size={20} />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold text-charcoal">{p.title}</h3>
                <p className="mt-1 text-sm text-charcoal-muted">{p.text}</p>
              </div>
            </Reveal>
          ))}
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
              <div className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {services
                  .filter((s) => s.category === cat)
                  .map((s, i) => (
                    <Reveal key={s.id} delay={(i % 3) * 80}>
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
