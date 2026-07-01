import { durationLabel, formatKes } from "@/lib/time";

export interface ServiceCardData {
  id: string;
  name: string;
  description: string;
  priceKes: number; // studio
  outCallPriceKes: number; // home
  durationMin: number;
  imageUrl: string | null;
  includes: string | null;
}

export default function ServiceCard({
  service,
  footer,
  selected = false,
}: {
  service: ServiceCardData;
  footer?: React.ReactNode;
  selected?: boolean;
}) {
  const includes = (service.includes || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-500 ${
        selected
          ? "border-gold shadow-glow ring-1 ring-gold/50"
          : "border-charcoal/5 shadow-card hover:-translate-y-1.5 hover:shadow-soft"
      }`}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-royal-900">
        {service.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={service.imageUrl}
            alt={service.name}
            className="h-full w-full object-cover object-top transition-transform duration-[1200ms] ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-gold/60">
            <span className="font-display text-5xl">M</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal/55 via-transparent to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold tracking-wide text-royal-800 backdrop-blur">
          {durationLabel(service.durationMin)}
        </span>
        <h3 className="absolute inset-x-4 bottom-3 font-display text-2xl font-semibold text-cream drop-shadow">
          {service.name}
        </h3>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-sm leading-relaxed text-charcoal-muted">{service.description}</p>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-royal-100 bg-royal-50/60 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-royal-500">
              Studio
            </p>
            <p className="font-display text-lg font-bold text-royal-800">
              {formatKes(service.priceKes)}
            </p>
          </div>
          <div className="rounded-xl border border-gold/40 bg-gold/10 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gold-dark">
              I come to you
            </p>
            <p className="font-display text-lg font-bold text-gold-dark">
              {formatKes(service.outCallPriceKes)}
            </p>
          </div>
        </div>

        {includes.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {includes.map((item) => (
              <li
                key={item}
                className="rounded-full bg-cream-soft px-2.5 py-0.5 text-[11px] font-medium text-charcoal-soft ring-1 ring-charcoal/5"
              >
                {item}
              </li>
            ))}
          </ul>
        )}

        {footer && <div className="mt-5 pt-1">{footer}</div>}
      </div>
    </article>
  );
}
