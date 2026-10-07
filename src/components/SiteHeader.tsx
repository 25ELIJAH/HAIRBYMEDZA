import Link from "next/link";
import Logo from "./Logo";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-violet-100/80 bg-white/75 backdrop-blur-md">
      <div className="container-px flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-charcoal-soft md:flex">
          <Link href="/#services" className="hover:text-violet-700">
            Services
          </Link>
          <Link href="/#contact" className="hover:text-violet-700">
            Contact
          </Link>
        </nav>
        <Link href="/book" className="btn-brand !px-4 !py-2.5">
          Book now
        </Link>
      </div>
    </header>
  );
}
