import Link from "next/link";
import Logo from "./Logo";
import Icon from "./Icon";

export default function SiteFooter({
  phone,
  location,
  devWhatsapp,
}: {
  phone: string;
  location: string;
  devWhatsapp: string;
}) {
  const waNumber = phone.replace(/[^0-9]/g, "");
  const devNumber = devWhatsapp.replace(/[^0-9]/g, "");
  const devMessage =
    "Hello EliDevs, I am reaching out from the Magdalene Medza booking platform. I would like to talk about a website or booking system.";
  const devHref = `https://wa.me/${devNumber}?text=${encodeURIComponent(devMessage)}`;
  return (
    <footer id="contact" className="border-t border-gray-200 bg-cream-soft text-charcoal">
      <div className="container-px grid gap-10 py-12 md:grid-cols-3">
        <div>
          <Logo href={null} />
          <p className="mt-4 max-w-xs text-sm text-charcoal-muted">
            Hair braiding for kids and teens in Nairobi. Come to my studio, or I come
            to you.
          </p>
        </div>

        <div className="text-sm">
          <h4 className="mb-3 font-semibold text-charcoal">
            Get in touch
          </h4>
          <ul className="space-y-3 text-charcoal-muted">
            <li>
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:text-royal-700"
              >
                <Icon name="whatsapp" size={18} />
                {phone}
              </a>
            </li>
            <li className="inline-flex items-start gap-2">
              <Icon name="pin" size={18} />
              <span>{location}</span>
            </li>
          </ul>
        </div>

        <div className="text-sm">
          <h4 className="mb-3 font-semibold text-charcoal">
            Quick links
          </h4>
          <ul className="space-y-2 text-charcoal-muted">
            <li>
              <Link href="/book" className="hover:text-royal-700">
                Book an appointment
              </Link>
            </li>
            <li>
              <Link href="/#services" className="hover:text-royal-700">
                Services and prices
              </Link>
            </li>
            <li>
              <Link href="/admin" className="hover:text-royal-700">
                Owner sign in
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-200">
        <div className="container-px flex flex-col items-center justify-between gap-2 py-5 text-xs text-charcoal-muted sm:flex-row">
          <p>© {new Date().getFullYear()} Magdalene Medza. All rights reserved.</p>
          <p className="inline-flex items-center gap-1.5">
            Made by
            <a
              href={devHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-charcoal-soft hover:text-royal-700"
            >
              <Icon name="whatsapp" size={14} />
              EliDevs
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
