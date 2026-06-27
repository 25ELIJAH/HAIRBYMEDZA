import { durationLabel, formatKes } from "@/lib/time";

export interface ServiceCardData {
  id: string;
  name: string;
  description: string;
  priceKes: number; // in-call
  outCallPriceKes: number; // out-call
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
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-200 ${
        selected
          ? "border-royal-500 shadow-glow ring-2 ring-royal-200"
          : "border-black/5 shadow-card hover:-translate-y-1 hover:shadow-soft"
      }`}
    >
      <div className="relative h-44 w-full overflow-hidden bg-lavender-100">
        {service.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={service.imageUrl}
            alt={service.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-royal-300">
            <span className="font-display text-4xl">M</span>
          </div>
        )}
        <span className="absolute left-3 top-3 badge bg-white/95 text-royal-700 shadow-sm">
          {durationLabel(service.durationMin)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-semibold text-charcoal">
          {service.name}
        </h3>
        <p className="mt-1.5 text-sm text-charcoal-muted">{service.description}</p>

        {/* Two prices: In-call and Out-call */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-lavender-50 px-3 py-2 ring-1 ring-lavender-200">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-royal-500">
              In-call
            </p>
            <p className="font-display text-base font-bold text-royal-600">
              {formatKes(service.priceKes)}
            </p>
          </div>
          <div className="rounded-xl bg-gold/10 px-3 py-2 ring-1 ring-gold/30">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gold-dark">
              Out-call
            </p>
            <p className="font-display text-base font-bold text-gold-dark">
              {formatKes(service.outCallPriceKes)}
            </p>
          </div>
        </div>

        {includes.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {includes.map((item) => (
              <li
                key={item}
                className="badge bg-lavender-50 text-royal-700 ring-1 ring-lavender-200"
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
