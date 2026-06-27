"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/admin-actions";
import Icon, { IconName } from "./Icon";

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin", label: "Dashboard", icon: "chart" },
  { href: "/admin/appointments", label: "Appointments", icon: "calendar" },
  { href: "/admin/customers", label: "Customers", icon: "users" },
  { href: "/admin/services", label: "Services", icon: "scissors" },
  { href: "/admin/availability", label: "Availability", icon: "settings" },
];

export default function AdminSidebar({ name }: { name: string }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <aside className="sticky top-0 z-30 flex shrink-0 flex-col bg-royal-gradient text-white md:h-screen md:w-64">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 md:py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-sm font-bold ring-2 ring-gold/50">
            M
          </span>
          <div className="leading-tight">
            <p className="font-display text-base font-semibold">Magdalene Medza</p>
            <p className="text-[11px] text-lavender-200">Owner · {name}</p>
          </div>
        </div>
        {/* Sign out is always reachable, including on phones */}
        <form action={logoutAction} className="md:hidden">
          <button
            aria-label="Sign out"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <Icon name="logout" size={18} />
          </button>
        </form>
      </div>

      {/* Nav: horizontal scroll on phones, vertical on desktop */}
      <nav className="flex gap-1.5 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:px-3">
        {LINKS.map((l) => {
          const active = isActive(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition md:gap-3 md:py-2.5 ${
                active ? "bg-white/20 text-white" : "text-lavender-100 hover:bg-white/10"
              }`}
            >
              <Icon name={l.icon} size={18} />
              {l.label}
            </Link>
          );
        })}
      </nav>

      {/* Desktop only footer actions */}
      <div className="mt-auto hidden flex-col gap-1 px-3 pb-4 md:flex">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-lavender-100 hover:bg-white/10"
        >
          <Icon name="external" size={16} /> View live site
        </Link>
        <form action={logoutAction}>
          <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-lavender-100 hover:bg-white/10">
            <Icon name="logout" size={16} /> Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
