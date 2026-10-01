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
import { DAY_NAMES, formatKes, minutesToHHMM, minutesToLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

const CATEGORY_ORDER = ["Kids", "Teen", "Package"];
const CATEGORY_LABEL: Record<string, string> = {
  Kids: "Kids Braiding",
  Teen: "Teen Braiding",
  Package: "Signature Packages",
};

const GALLERY = [
  "1572954889228-2b12a55144d1",
  "1658497730270-b5f4fef00ae1",
  "1757866332825-42368c1105e8",
  "1648010035195-6b0a56e14667",
  "1614173968962-0e61c5ed196f",
  "1572955304332-bf714bd49add",
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

  const mapsQuery = encodeURIComponent(settings.location);
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
      <section className="border-b border-gray-200 bg-white">
        <div className="container-px grid items-center gap-10 py-12 lg:grid-cols-2 lg:gap-14 lg:py-20">
          <div>
            <p className="eyebrow">Hair braiding in {studio || "Nairobi"}</p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-charcoal sm:text-5xl">
              Neat, gentle braiding for kids and teens.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-charcoal-muted">
              Come to my studio or I come to you. Pick a free time online, pay a small
              deposit with M-Pesa, and I confirm on WhatsApp.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book" className="btn-primary !px-6 !py-3.5 text-base">
                Book an appointment
              </Link>
              <Link href="/#services" className="btn-outline !px-6 !py-3.5 text-base">
                See prices
              </Link>
            </div>
            <ul className="mt-8 grid max-w-md grid-cols-2 gap-x-6 gap-y-2 text-sm text-charcoal-soft">
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
          <div className="overflow-hidden rounded-2xl bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1572955304332-bf714bd49add?auto=format&fit=crop&w=1200&q=75"
              alt="Braided hairstyle"
              className="aspect-[4/3] h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── Services ─────────────────────────────────────────── */}
      <section id="services" className="bg-cream-soft py-16 sm:py-20">
        <div className="container-px">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold text-charcoal">Services and prices</h2>
            <p className="mt-3 text-charcoal-muted">
              Every style includes a wash, blow dry, braiding and styling. Home visits cost a
              little more.
            </p>
          </div>

          {categories.map((cat) => (
            <div key={cat} className="mt-12">
              <h3 className="mb-5 font-display text-lg font-semibold text-charcoal">{labelFor(cat)}</h3>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {services
                  .filter((s) => s.category === cat)
                  .map((s) => (
                    <Reveal key={s.id}>
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
          <h2 className="font-display text-3xl font-bold text-charcoal">How booking works</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="border-t-2 border-royal-600 pt-4">
                <p className="text-sm font-semibold text-royal-600">Step {i + 1}</p>
                <h3 className="mt-1 font-display text-lg font-semibold text-charcoal">{t}</h3>
                <p className="mt-1.5 text-sm text-charcoal-muted">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Gallery ──────────────────────────────────────────── */}
      <section id="gallery" className="border-t border-gray-200 py-16 sm:py-20">
        <div className="container-px">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold text-charcoal">Recent work</h2>
              <p className="mt-2 text-charcoal-muted">A few of the styles I have done for clients.</p>
            </div>
            <Link href="/book" className="btn-outline">
              Book your style
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {GALLERY.map((id) => (
              <div key={id} className="overflow-hidden rounded-xl bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=700&q=70`}
                  alt="Braided hairstyle"
                  loading="lazy"
                  className="aspect-square h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Location and hours ───────────────────────────────── */}
      <section id="location" className="bg-cream-soft py-16 sm:py-20">
        <div className="container-px grid items-start gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold text-charcoal">Location and hours</h2>
            <p className="mt-4 text-charcoal-muted">
              <strong className="font-semibold text-charcoal">{settings.location}</strong>
              <br />
              Right opposite the KMTC main gate, a short walk from Kenyatta National Hospital.
            </p>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`}
              target="_blank"
              rel="noreferrer"
              className="btn-outline mt-6"
            >
              <Icon name="pin" size={16} />
              Get directions
            </a>

            <div className="card mt-8 overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {hours.map((h) => (
                    <tr key={h.dayOfWeek} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2.5 text-charcoal">{DAY_NAMES[h.dayOfWeek]}</td>
                      <td className="px-4 py-2.5 text-right text-charcoal-muted">
                        {h.isOpen
                          ? `${minutesToLabel(h.startMin)} to ${minutesToLabel(h.endMin)}`
                          : "Closed"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
            <iframe
              title="Magdalene Medza location"
              src={`https://www.google.com/maps?q=${mapsQuery}&output=embed`}
              width="100%"
              height="440"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      {/* ── Final call to action ─────────────────────────────── */}
      <section className="py-16">
        <div className="container-px">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-royal-50 px-6 py-10 sm:flex-row sm:items-center sm:px-10">
            <div>
              <h2 className="font-display text-2xl font-bold text-charcoal">Ready for your next look?</h2>
              <p className="mt-2 text-charcoal-muted">
                Choose a time that suits you. I will message you on WhatsApp to confirm.
              </p>
            </div>
            <Link href="/book" className="btn-primary shrink-0 !px-6 !py-3.5 text-base">
              Book an appointment
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
        location={settings.location}
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
