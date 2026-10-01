import Link from "next/link";
import Logo from "./Logo";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="container-px flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-charcoal-soft md:flex">
          <Link href="/#services" className="hover:text-royal-700">
            Services
          </Link>
          <Link href="/#how" className="hover:text-royal-700">
            How it works
          </Link>
          <Link href="/#gallery" className="hover:text-royal-700">
            Gallery
          </Link>
          <Link href="/#location" className="hover:text-royal-700">
            Location
          </Link>
        </nav>
        <Link href="/book" className="btn-primary !px-4 !py-2.5">
          Book now
        </Link>
      </div>
    </header>
  );
}
