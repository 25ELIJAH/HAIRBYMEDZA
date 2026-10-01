import Link from "next/link";
import Logo from "./Logo";
import { minutesToLabel } from "@/lib/time";

type Hours = { dayOfWeek: number; isOpen: boolean; startMin: number; endMin: number };

const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Monday-first rows, joining neighbouring days with the same hours ("Mon – Fri"). */
function hourRows(hours: Hours[]): { days: string; time: string }[] {
  const byDay = new Map(hours.map((h) => [h.dayOfWeek, h]));
  const order = [1, 2, 3, 4, 5, 6, 0];
  const rows: { from: number; to: number; time: string }[] = [];
  for (const d of order) {
    const h = byDay.get(d);
    const time = h?.isOpen ? `${minutesToLabel(h.startMin)} – ${minutesToLabel(h.endMin)}` : "Closed";
    const last = rows.at(-1);
    if (last && last.time === time) last.to = d;
    else rows.push({ from: d, to: d, time });
  }
  return rows.map((r) => ({
    days: r.from === r.to ? SHORT[r.from] : `${SHORT[r.from]} – ${SHORT[r.to]}`,
    time: r.time,
  }));
}

export default function SiteFooter({
  phone,
  email,
  location,
  hours,
  devWhatsapp,
}: {
  phone: string;
  email?: string;
  location?: string;
  hours: Hours[];
  devWhatsapp: string;
}) {
  const waNumber = phone.replace(/[^0-9]/g, "");
  const devNumber = devWhatsapp.replace(/[^0-9]/g, "");
  const devMessage =
    "Hello EliDevs, I am reaching out from the Magdalene Medza booking platform. I would like to talk about a website or booking system.";
  const devHref = `https://wa.me/${devNumber}?text=${encodeURIComponent(devMessage)}`;
  const rows = hourRows(hours);

  return (
    <footer id="contact" className="mt-4 border-t border-gray-200 bg-white text-charcoal">
      <div className="container-px grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_0.8fr]">
        <div>
          <Logo href={null} />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-charcoal-muted">
            Braiding for kids and teens in Nairobi. Studio appointments and home visits.
          </p>
          <Link href="/book" className="btn-primary mt-6 !px-5 !py-2.5">
            Book now
          </Link>
        </div>

        <div className="text-sm">
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Contact</h4>
          <ul className="space-y-2.5">
            {phone && (
              <li>
                <a href={`tel:${phone.replace(/\s+/g, "")}`} className="hover:text-royal-700">
                  {phone}
                </a>
              </li>
            )}
            {waNumber && (
              <li>
                <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer" className="hover:text-royal-700">
                  WhatsApp
                </a>
              </li>
            )}
            {email && (
              <li>
                <a href={`mailto:${email}`} className="break-all hover:text-royal-700">
                  {email}
                </a>
              </li>
            )}
            {location && <li className="text-charcoal-muted">{location}</li>}
          </ul>
        </div>

        <div className="text-sm">
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Opening hours</h4>
          <dl className="max-w-xs space-y-2.5">
            {rows.map((r) => (
              <div key={r.days} className="flex justify-between gap-4">
                <dt>{r.days}</dt>
                <dd className={r.time === "Closed" ? "text-charcoal-muted" : "tabular-nums"}>{r.time}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="text-sm">
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Links</h4>
          <ul className="space-y-2.5">
            <li>
              <Link href="/book" className="hover:text-royal-700">
                Book
              </Link>
            </li>
            <li>
              <Link href="/#services" className="hover:text-royal-700">
                Prices
              </Link>
            </li>
            <li>
              <Link href="/admin" className="text-charcoal-muted hover:text-royal-700">
                Owner sign in
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-200">
        <div className="container-px flex flex-col items-center justify-between gap-2 pb-24 pt-5 text-xs text-charcoal-muted sm:flex-row sm:pb-5">
          <p>© {new Date().getFullYear()} Magdalene Medza. All rights reserved.</p>
          <p>
            Made by{" "}
            <a href={devHref} target="_blank" rel="noreferrer" className="font-medium text-charcoal-soft hover:text-royal-700">
              EliDevs
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
