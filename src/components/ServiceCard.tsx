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
      className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-300 ${
        selected
          ? "border-royal-600 ring-1 ring-royal-600"
          : "border-gray-200 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_18px_40px_-20px_rgba(109,40,217,0.35)]"
      }`}
    >
      {/* Every card has the same photo frame. The whole photo is always visible
          (never cropped); any spare space is filled with a soft blurred copy. */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-gray-100">
        {service.imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={service.imageUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-xl"
              loading="lazy"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={service.imageUrl}
              alt={service.name}
              className="relative h-full w-full object-contain"
              loading="lazy"
            />
          </>
        ) : (
          <div className="grid h-full w-full place-items-center font-display text-4xl text-gray-300">
            M
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[17px] font-medium leading-snug text-charcoal">{service.name}</h3>
          <span className="shrink-0 pt-1 text-xs text-charcoal-muted">
            {durationLabel(service.durationMin)}
          </span>
        </div>
        {service.description && (
          <p className="mt-1.5 text-sm leading-relaxed text-charcoal-muted">{service.description}</p>
        )}

        <dl className="mt-4 divide-y divide-gray-100 border-y border-gray-100 text-sm">
          <div className="flex items-center justify-between py-2">
            <dt className="text-charcoal-muted">Studio</dt>
            <dd className="font-semibold text-charcoal">{formatKes(service.priceKes)}</dd>
          </div>
          <div className="flex items-center justify-between py-2">
            <dt className="text-charcoal-muted">Home visit</dt>
            <dd className="font-semibold text-charcoal">{formatKes(service.outCallPriceKes)}</dd>
          </div>
        </dl>


        {footer && <div className="mt-auto pt-5">{footer}</div>}
      </div>
    </article>
  );
}
