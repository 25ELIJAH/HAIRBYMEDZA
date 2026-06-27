import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ServiceCard from "@/components/ServiceCard";
import WhatsAppButton from "@/components/WhatsAppButton";
import Icon from "@/components/Icon";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/booking";
import { DAY_NAMES, minutesToLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

const CATEGORY_ORDER = ["Kids", "Teen", "Package"];
const CATEGORY_LABEL: Record<string, string> = {
  Kids: "Kids Braiding",
  Teen: "Teen Braiding",
  Package: "Packages",
};

const STEPS = [
  ["Pick a style", "Choose the braids you want from my list of services."],
  ["In-call or out-call", "Come to my studio, or I can come to your home."],
  ["Choose a free time", "Only the open times show, so there is never a clash."],
  ["Get confirmed", "I send you a confirmation on WhatsApp right away."],
];

export default async function HomePage() {
  const [services, settings, hours] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    getSettings(),
    prisma.workingHours.findMany({ orderBy: { dayOfWeek: "asc" } }),
  ]);

  const mapsQuery = encodeURIComponent(settings.location);
  const studio = settings.location.split(",")[0];

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1572955304332-bf714bd49add?auto=format&fit=crop&w=1600&q=75"
            alt="Woman with long box braids"
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-royal-hero" />
        </div>

        <div className="container-px flex min-h-[90vh] flex-col justify-center py-24 text-white">
          <p className="eyebrow animate-fade-up text-gold-light">
            Luxury Hair Braiding in Nairobi
          </p>
          <h1 className="mt-4 max-w-2xl animate-fade-up font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Beautiful braids, booked in{" "}
            <span className="text-gold-light">minutes</span>.
          </h1>
          <p className="mt-5 max-w-xl animate-fade-up text-lg text-lavender-100">
            I do knotless, lemonade, cornrows, makeba, brazilian and more. Come to my
            studio or let me come to you. Check my live availability and pick a time
            that works for you.
          </p>

          <div className="mt-8 flex animate-fade-up flex-wrap items-center gap-3">
            <Link href="/book" className="btn-gold !px-8 !py-4 text-base">
              Book an appointment
              <Icon name="arrowRight" size={18} />
            </Link>
            <Link
              href="/#services"
              className="btn !border !border-white/40 !bg-white/10 !px-7 !py-4 text-base text-white backdrop-blur hover:!bg-white/20"
            >
              See my services
            </Link>
          </div>

          <div className="mt-12 grid max-w-2xl animate-fade-up gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
              <span className="inline-flex rounded-xl bg-white/15 p-2 text-gold-light">
                <Icon name="home" />
              </span>
              <h2 className="mt-3 font-display text-lg font-semibold">Come to my studio</h2>
              <p className="mt-1 text-sm text-lavender-100">
                I am based at {studio} along Ngong Road, near Kenyatta Hospital.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
              <span className="inline-flex rounded-xl bg-white/15 p-2 text-gold-light">
                <Icon name="car" />
              </span>
              <h2 className="mt-3 font-display text-lg font-semibold">I come to you</h2>
              <p className="mt-1 text-sm text-lavender-100">
                I can travel to your home. I will share the transport fare once I
                confirm your booking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick facts */}
      <section className="border-b border-black/5 bg-royal-50">
        <div className="container-px grid grid-cols-2 gap-6 py-8 text-center sm:grid-cols-4">
          {[
            ["Kids & Teens", "Braiding styles"],
            ["In & out", "Call options"],
            ["Mon to Sat", "Open six days"],
            ["Same day", "WhatsApp replies"],
          ].map(([big, small]) => (
            <div key={small}>
              <div className="font-display text-2xl font-bold text-royal-600">{big}</div>
              <div className="text-xs uppercase tracking-widest text-charcoal-muted">
                {small}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="services" className="container-px py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">My Menu</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-charcoal sm:text-4xl">
            Services and prices
          </h2>
          <p className="mt-3 text-charcoal-muted">
            Braiding for kids and teens. Every style includes a wash, blow dry,
            braiding and styling. Out-call costs a little more because I travel to you.
          </p>
        </div>

        {CATEGORY_ORDER.filter((cat) => services.some((s) => s.category === cat)).map(
          (cat) => (
            <div key={cat} className="mt-12">
              <h3 className="mb-6 font-display text-2xl font-bold text-charcoal">
                {CATEGORY_LABEL[cat]}
              </h3>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {services
                  .filter((s) => s.category === cat)
                  .map((s) => (
                    <ServiceCard
                      key={s.id}
                      service={s}
                      footer={
                        <Link href={`/book?service=${s.id}`} className="btn-outline w-full">
                          Book {s.name}
                        </Link>
                      }
                    />
                  ))}
              </div>
            </div>
          )
        )}
      </section>

      {/* How it works */}
      <section id="how" className="bg-lavender-50 py-20">
        <div className="container-px">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Simple booking</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-charcoal sm:text-4xl">
              How it works
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {STEPS.map(([t, d], i) => (
              <div key={t} className="card p-6">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-royal-gradient font-display text-lg font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{t}</h3>
                <p className="mt-1.5 text-sm text-charcoal-muted">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/book" className="btn-primary !px-8 !py-4 text-base">
              Start booking
              <Icon name="arrowRight" size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Location and hours */}
      <section id="location" className="bg-lavender-50 py-20">
        <div className="container-px grid items-start gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Find me</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-charcoal sm:text-4xl">
              Location and working hours
            </h2>
            <p className="mt-4 text-charcoal-muted">
              <strong className="text-charcoal">{settings.location}</strong>
              <br />
              I am right opposite the KMTC main gate, a short walk from Kenyatta National
              Hospital.
            </p>

            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`}
              target="_blank"
              rel="noreferrer"
              className="btn-primary mt-6"
            >
              <Icon name="pin" size={18} />
              Get directions
            </a>

            <div className="mt-8 card overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {hours.map((h) => (
                    <tr key={h.dayOfWeek} className="border-b border-black/5 last:border-0">
                      <td className="px-5 py-2.5 font-medium text-charcoal">
                        {DAY_NAMES[h.dayOfWeek]}
                      </td>
                      <td className="px-5 py-2.5 text-right text-charcoal-muted">
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

          <div className="overflow-hidden rounded-2xl border border-black/5 shadow-card">
            <iframe
              title="Magdalene Medza location"
              src={`https://www.google.com/maps?q=${mapsQuery}&output=embed`}
              width="100%"
              height="460"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      {/* Final call to action */}
      <section className="bg-royal-gradient">
        <div className="container-px flex flex-col items-center gap-5 py-16 text-center text-white">
          <h2 className="max-w-2xl font-display text-3xl font-bold sm:text-4xl">
            Ready for your next look?
          </h2>
          <p className="max-w-lg text-lavender-100">
            Pick a time that suits you and I will confirm on WhatsApp. It only takes a
            minute.
          </p>
          <Link href="/book" className="btn-gold !px-8 !py-4 text-base">
            Book an appointment
            <Icon name="arrowRight" size={18} />
          </Link>
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
