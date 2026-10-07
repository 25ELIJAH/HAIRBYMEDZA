"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction, revokeAllSessions } from "@/lib/admin-actions";
import LogoMark from "./LogoMark";

const DAILY = [
  { href: "/admin", label: "Dashboard", short: "Home" },
  { href: "/admin/appointments", label: "Bookings", short: "Bookings" },
  { href: "/admin/customers", label: "Clients", short: "Clients" },
  { href: "/admin/payments", label: "Money", short: "Money" },
];
const SETUP = [
  { href: "/admin/services", label: "Services & prices" },
  { href: "/admin/availability", label: "Hours & settings" },
];

export default function AdminSidebar({ name }: { name: string }) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  const setupActive = SETUP.some((l) => isActive(l.href));

  // Close the "More" sheet whenever the page changes.
  useEffect(() => setMore(false), [pathname]);

  return (
    <>
      {/* ── Desktop: sidebar ───────────────────────────────── */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <LogoMark size={32} className="shrink-0" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-charcoal">Magdalene Medza</p>
            <p className="truncate text-xs text-charcoal-muted">{name}</p>
          </div>
        </div>
        <nav className="flex flex-col gap-6 px-3 pt-2">
          {[
            { title: "Daily", links: DAILY },
            { title: "Setup", links: SETUP },
          ].map((g) => (
            <div key={g.title} className="flex flex-col gap-0.5">
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted">
                {g.title}
              </p>
              {g.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    isActive(l.href)
                      ? "bg-royal-50 font-semibold text-royal-800"
                      : "font-medium text-charcoal-soft hover:bg-gray-50 hover:text-charcoal"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-0.5 border-t border-gray-200 px-3 py-4">
          <Link href="/" target="_blank" className="rounded-lg px-3 py-2 text-sm text-charcoal-soft hover:bg-gray-50 hover:text-charcoal">
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

      {/* ── Phones: slim top bar ───────────────────────────── */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2.5 border-b border-gray-200 bg-white/95 px-4 backdrop-blur md:hidden">
        <LogoMark size={28} className="shrink-0" />
        <p className="truncate text-sm font-semibold text-charcoal">Magdalene Medza</p>
      </header>

      {/* ── Phones: bottom tab bar ─────────────────────────── */}
      <nav
        aria-label="Admin"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid h-16 grid-cols-5">
          {DAILY.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative flex flex-col items-center justify-center text-[12px] font-medium ${
                  active ? "text-royal-700" : "text-charcoal-muted"
                }`}
              >
                <span
                  className={`absolute top-0 h-0.5 w-8 rounded-full ${active ? "bg-royal-600" : "bg-transparent"}`}
                />
                {l.short}
              </Link>
            );
          })}
          <button
            onClick={() => setMore((m) => !m)}
            aria-expanded={more}
            className={`relative flex flex-col items-center justify-center text-[12px] font-medium ${
              more || setupActive ? "text-royal-700" : "text-charcoal-muted"
            }`}
          >
            <span
              className={`absolute top-0 h-0.5 w-8 rounded-full ${setupActive ? "bg-royal-600" : "bg-transparent"}`}
            />
            More
          </button>
        </div>
      </nav>

      {/* ── Phones: "More" sheet ───────────────────────────── */}
      {more && (
        <div className="fixed inset-0 z-30 md:hidden" role="dialog" aria-modal="true">
          <button aria-label="Close" className="absolute inset-0 bg-black/30" onClick={() => setMore(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white px-4 pb-24 pt-3 shadow-xl animate-fade-up">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200" />
            <p className="px-2 pb-2 text-xs text-charcoal-muted">Signed in as {name}</p>
            <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
              {SETUP.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`block px-4 py-3.5 text-[15px] ${isActive(l.href) ? "font-semibold text-royal-700" : "text-charcoal"}`}
                >
                  {l.label}
                </Link>
              ))}
              <Link href="/" target="_blank" className="block px-4 py-3.5 text-[15px] text-charcoal">
                View website
              </Link>
            </div>
            <div className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
              <form action={logoutAction}>
                <button className="block w-full px-4 py-3.5 text-left text-[15px] text-charcoal">Sign out</button>
              </form>
              <form action={revokeAllSessions}>
                <button className="block w-full px-4 py-3.5 text-left text-[15px] text-red-600">
                  Sign out on all devices
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
