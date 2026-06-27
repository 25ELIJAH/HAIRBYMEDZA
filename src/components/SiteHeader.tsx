import Link from "next/link";
import Logo from "./Logo";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/85 backdrop-blur-md">
      <div className="container-px flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm font-medium text-charcoal-soft md:flex">
          <Link href="/#services" className="hover:text-royal-600">
            Services
          </Link>
          <Link href="/#how" className="hover:text-royal-600">
            How it works
          </Link>
          <Link href="/#location" className="hover:text-royal-600">
            Location
          </Link>
          <Link href="/#contact" className="hover:text-royal-600">
            Contact
          </Link>
        </nav>
        <Link href="/book" className="btn-primary !px-5 !py-2.5">
          Book Now
        </Link>
      </div>
    </header>
  );
}
