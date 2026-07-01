import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ServiceCard from "@/components/ServiceCard";
import WhatsAppButton from "@/components/WhatsAppButton";
import Icon from "@/components/Icon";
import Reveal from "@/components/Reveal";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/booking";
import { DAY_NAMES, formatKes, minutesToLabel } from "@/lib/time";

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

  const catMin = (cat: string) => {
    const prices = services.filter((s) => s.category === cat).map((s) => s.priceKes);
    return prices.length ? Math.min(...prices) : null;
  };
  const priceRail = [
    { label: "Kids braids", value: catMin("Kids"), prefix: "from" },
    { label: "Teen braids", value: catMin("Teen"), prefix: "from" },
    {
      label: "Full package",
      value: services.find((s) => s.category === "Package")?.priceKes ?? null,
      prefix: "",
    },
  ].filter((p) => p.value != null) as { label: string; value: number; prefix: string }[];

  return (
    <>
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1572955304332-bf714bd49add?auto=format&fit=crop&w=1700&q=80"
            alt="Elegant braided hairstyle"
            className="animate-kenburns h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-royal-hero" />
        </div>

        <div className="container-px flex min-h-[94vh] flex-col justify-center py-28 text-cream">
          <div className="flex animate-fade-up items-center gap-4">
            <span className="h-px w-12 bg-gold/70" />
            <p className="text-[11px] font-semibold uppercase tracking-luxe text-gold-light">
              Luxury Hair Braiding in Nairobi
            </p>
          </div>

          <h1
            className="mt-6 max-w-3xl animate-fade-up font-display text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl"
            style={{ animationDelay: "80ms" }}
          >
            Beautiful braids,
            <br />
            made just for <span className="italic text-gold-light">you</span>.
          </h1>

          <p
            className="mt-6 max-w-xl animate-fade-up text-lg font-light leading-relaxed text-cream/85"
            style={{ animationDelay: "160ms" }}
          >
            Gentle hands, clean work and styles that turn heads. Come to my studio in
            {" "}
            {studio}, or let me come to you.
          </p>

          <div
            className="mt-9 flex animate-fade-up flex-wrap gap-3"
            style={{ animationDelay: "240ms" }}
          >
            {priceRail.map((p) => (
              <div
                key={p.label}
                className="rounded-2xl border border-gold/40 bg-white/5 px-5 py-3 backdrop-blur-md"
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest text-cream/70">
                  {p.label}
                </p>
                <p className="font-display text-xl font-semibold text-gold-light">
                  {p.prefix ? `${p.prefix} ` : ""}
                  {formatKes(p.value)}
                </p>
              </div>
            ))}
          </div>

          <div
            className="mt-9 flex animate-fade-up flex-wrap items-center gap-3"
            style={{ animationDelay: "320ms" }}
          >
            <Link href="/book" className="btn-gold !px-9 !py-4 text-base">
              Book your appointment
              <Icon name="arrowRight" size={18} />
            </Link>
            <Link
              href="/#services"
              className="btn border border-cream/40 bg-white/5 !px-8 !py-4 text-base text-cream backdrop-blur hover:bg-white/15"
            >
              View the price list
            </Link>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-cream/50">
          <span className="text-[10px] uppercase tracking-luxe">Scroll</span>
        </div>
      </section>

      {/* ── Quick facts ──────────────────────────────────────── */}
      <section className="border-y border-charcoal/5 bg-white">
        <div className="container-px grid grid-cols-2 gap-6 py-9 text-center sm:grid-cols-4">
          {[
            ["Kids and Teens", "Braiding styles"],
            ["Studio or Home", "You choose"],
            ["Six days a week", "Monday to Saturday"],
            ["Same day", "WhatsApp replies"],
          ].map(([big, small]) => (
            <div key={small}>
              <div className="font-display text-2xl font-semibold text-royal-700">{big}</div>
              <div className="mt-1 text-[11px] uppercase tracking-widest text-charcoal-muted">
                {small}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Services ─────────────────────────────────────────── */}
      <section id="services" className="container-px py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <div className="gold-rule" />
          <p className="eyebrow mt-4">The Menu</p>
          <h2 className="mt-3 font-display text-4xl font-semibold text-charcoal sm:text-5xl">
            Services and prices
          </h2>
          <p className="mt-4 text-charcoal-muted">
            Braiding for kids and teens. Every style comes with a wash, blow dry,
            braiding and styling. Prices are a touch higher when I travel to you.
          </p>
        </Reveal>

        {CATEGORY_ORDER.filter((cat) => services.some((s) => s.category === cat)).map((cat) => (
          <div key={cat} className="mt-16">
            <Reveal className="mb-7 flex items-center gap-4">
              <h3 className="font-display text-2xl font-semibold text-royal-800">
                {CATEGORY_LABEL[cat]}
              </h3>
              <span className="h-px flex-1 bg-charcoal/10" />
            </Reveal>
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {services
                .filter((s) => s.category === cat)
                .map((s, i) => (
                  <Reveal key={s.id} delay={i * 70}>
                    <ServiceCard
                      service={s}
                      footer={
                        <Link href={`/book?service=${s.id}`} className="btn-outline w-full">
                          Book {s.name}
                        </Link>
                      }
                    />
                  </Reveal>
                ))}
            </div>
          </div>
        ))}
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section id="how" className="bg-cream-soft py-24">
        <div className="container-px">
          <Reveal className="mx-auto max-w-2xl text-center">
            <div className="gold-rule" />
            <p className="eyebrow mt-4">Simple to book</p>
            <h2 className="mt-3 font-display text-4xl font-semibold text-charcoal sm:text-5xl">
              How it works
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-7 md:grid-cols-4">
            {STEPS.map(([t, d], i) => (
              <Reveal key={t} delay={i * 90} className="text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-gold/50 font-display text-xl font-semibold text-royal-700">
                  {i + 1}
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold text-charcoal">{t}</h3>
                <p className="mt-2 text-sm text-charcoal-muted">{d}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-12 text-center">
            <Link href="/book" className="btn-primary !px-9 !py-4 text-base">
              Start booking
              <Icon name="arrowRight" size={18} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Gallery ──────────────────────────────────────────── */}
      <section id="gallery" className="bg-royal-900 py-24">
        <div className="container-px">
          <Reveal className="mx-auto max-w-2xl text-center">
            <div className="mx-auto flex items-center justify-center gap-4">
              <span className="h-px w-10 bg-gold/60" />
              <p className="text-[11px] font-semibold uppercase tracking-luxe text-gold-light">
                The Gallery
              </p>
              <span className="h-px w-10 bg-gold/60" />
            </div>
            <h2 className="mt-4 font-display text-4xl font-semibold text-cream sm:text-5xl">
              Signature looks
            </h2>
            <p className="mt-4 text-cream/70">
              A glimpse of the braids, twists and styles I create for my clients.
            </p>
          </Reveal>

          <div className="mt-14 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {GALLERY.map((id, i) => (
              <Reveal
                key={id}
                delay={i * 60}
                className={`group relative overflow-hidden rounded-2xl ${
                  i === 0 ? "col-span-2 row-span-2 md:col-span-1 md:row-span-2" : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=75`}
                  alt="Braided hairstyle"
                  loading="lazy"
                  className="h-full min-h-[200px] w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-royal-900/60 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12 text-center">
            <Link href="/book" className="btn-gold !px-9 !py-4 text-base">
              Book your look
              <Icon name="arrowRight" size={18} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Location and hours ───────────────────────────────── */}
      <section id="location" className="bg-cream py-24">
        <div className="container-px grid items-start gap-12 lg:grid-cols-2">
          <Reveal>
            <div className="gold-rule !mx-0" />
            <p className="eyebrow mt-4">Find me</p>
            <h2 className="mt-3 font-display text-4xl font-semibold text-charcoal sm:text-5xl">
              Location and hours
            </h2>
            <p className="mt-5 text-charcoal-muted">
              <strong className="text-charcoal">{settings.location}</strong>
              <br />
              You will find me right opposite the KMTC main gate, a short walk from
              Kenyatta National Hospital.
            </p>

            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`}
              target="_blank"
              rel="noreferrer"
              className="btn-primary mt-7"
            >
              <Icon name="pin" size={18} />
              Get directions
            </a>

            <div className="mt-8 card overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {hours.map((h) => (
                    <tr key={h.dayOfWeek} className="border-b border-charcoal/5 last:border-0">
                      <td className="px-5 py-3 font-medium text-charcoal">
                        {DAY_NAMES[h.dayOfWeek]}
                      </td>
                      <td className="px-5 py-3 text-right text-charcoal-muted">
                        {h.isOpen
                          ? `${minutesToLabel(h.startMin)} to ${minutesToLabel(h.endMin)}`
                          : "Closed"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>

          <Reveal delay={120} className="overflow-hidden rounded-2xl border border-charcoal/5 shadow-card">
            <iframe
              title="Magdalene Medza location"
              src={`https://www.google.com/maps?q=${mapsQuery}&output=embed`}
              width="100%"
              height="480"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </Reveal>
        </div>
      </section>

      {/* ── Final call to action ─────────────────────────────── */}
      <section className="bg-royal-gradient">
        <div className="container-px flex flex-col items-center gap-6 py-20 text-center text-cream">
          <Reveal>
            <div className="gold-rule" />
            <h2 className="mt-5 max-w-2xl font-display text-4xl font-semibold sm:text-5xl">
              Ready for your next look?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-cream/80">
              Pick a time that suits you and pay a small deposit to hold it. I will call
              or message you to confirm.
            </p>
            <Link href="/book" className="btn-gold mt-8 !px-9 !py-4 text-base">
              Book your appointment
              <Icon name="arrowRight" size={18} />
            </Link>
          </Reveal>
        </div>
      </section>

      <SiteFooter
        phone={settings.phone}
        location={settings.location}
        devWhatsapp={process.env.DEV_WHATSAPP || ""}
      />
      <WhatsAppButton phone={settings.phone} />
    </>
  );
}
