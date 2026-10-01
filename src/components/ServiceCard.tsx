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
      className={`flex flex-col overflow-hidden rounded-xl border bg-white transition-colors ${
        selected ? "border-royal-600 ring-1 ring-royal-600" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
        {service.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={service.imageUrl}
            alt={service.name}
            className="h-full w-full object-cover object-top"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center font-display text-4xl text-gray-300">
            M
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-bold text-charcoal">{service.name}</h3>
          <span className="shrink-0 pt-1 text-xs text-charcoal-muted">
            {durationLabel(service.durationMin)}
          </span>
        </div>
        {service.description && (
          <p className="mt-1.5 text-sm leading-relaxed text-charcoal-muted">{service.description}</p>
        )}

        <dl className="mt-4 divide-y divide-gray-100 border-y border-gray-100 text-sm">
          <div className="flex items-center justify-between py-2">
            <dt className="text-charcoal-muted">At the studio</dt>
            <dd className="font-semibold text-charcoal">{formatKes(service.priceKes)}</dd>
          </div>
          <div className="flex items-center justify-between py-2">
            <dt className="text-charcoal-muted">I come to you</dt>
            <dd className="font-semibold text-charcoal">{formatKes(service.outCallPriceKes)}</dd>
          </div>
        </dl>

        {includes.length > 0 && (
          <p className="mt-3 text-xs text-charcoal-muted">Includes {includes.join(", ").toLowerCase()}.</p>
        )}

        {footer && <div className="mt-auto pt-5">{footer}</div>}
      </div>
    </article>
  );
}
