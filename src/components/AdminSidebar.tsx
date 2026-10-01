"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction, revokeAllSessions } from "@/lib/admin-actions";
import LogoMark from "./LogoMark";

const GROUPS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Daily",
    links: [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/appointments", label: "Bookings" },
      { href: "/admin/customers", label: "Clients" },
      { href: "/admin/payments", label: "Money" },
    ],
  },
  {
    title: "Setup",
    links: [
      { href: "/admin/services", label: "Services & prices" },
      { href: "/admin/availability", label: "Hours & settings" },
    ],
  },
];

export default function AdminSidebar({ name }: { name: string }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <aside className="sticky top-0 z-30 flex shrink-0 flex-col border-b border-gray-200 bg-white md:h-screen md:w-60 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between gap-2 px-4 py-3 md:px-5 md:py-5">
        <div className="flex items-center gap-2.5">
          <LogoMark size={32} className="shrink-0" />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-charcoal">Magdalene Medza</p>
            <p className="text-xs text-charcoal-muted">{name}</p>
          </div>
        </div>
        <form action={logoutAction} className="md:hidden">
          <button className="text-sm font-medium text-charcoal-muted hover:text-charcoal">Sign out</button>
        </form>
      </div>

      {/* Phones: one scrolling row. Desktop: grouped column. */}
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:flex-col md:gap-6 md:overflow-visible md:px-3 md:pb-0 md:pt-2">
        {GROUPS.map((g) => (
          <div key={g.title} className="flex gap-1 md:flex-col md:gap-0.5">
            <p className="hidden px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted md:block">
              {g.title}
            </p>
            {g.links.map((l) => {
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
                    active
                      ? "bg-royal-50 font-semibold text-royal-800"
                      : "font-medium text-charcoal-soft hover:bg-gray-50 hover:text-charcoal"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto hidden flex-col gap-0.5 border-t border-gray-200 px-3 py-4 md:flex">
        <Link
          href="/"
          target="_blank"
          className="rounded-lg px-3 py-2 text-sm text-charcoal-soft hover:bg-gray-50 hover:text-charcoal"
        >
          View website
        </Link>
        <form action={logoutAction}>
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-charcoal-soft hover:bg-gray-50 hover:text-charcoal">
            Sign out
          </button>
        </form>
        <form action={revokeAllSessions}>
          <button className="w-full rounded-lg px-3 py-2 text-left text-xs text-charcoal-muted hover:bg-gray-50">
            Sign out everywhere
          </button>
        </form>
      </div>
    </aside>
  );
}
