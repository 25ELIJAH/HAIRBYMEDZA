// Small building blocks shared by the admin pages, so every page has the same
// header, figures and panels.

import Link from "next/link";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 pb-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-charcoal">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-charcoal-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 lg:grid-cols-4">
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-xs font-medium text-charcoal-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-charcoal">{value}</p>
      {hint && <p className="mt-1 text-xs text-charcoal-muted">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="block bg-white p-5 transition hover:bg-gray-50">
      {body}
    </Link>
  ) : (
    <div className="bg-white p-5">{body}</div>
  );
}

export function Panel({
  title,
  action,
  children,
  className = "",
  flush,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** No inner padding (for tables and lists that run edge to edge). */
  flush?: boolean;
}) {
  return (
    <section className={`rounded-xl border border-gray-200 bg-white ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-charcoal">{title}</h2>
          {action}
        </div>
      )}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <p className="px-5 py-10 text-center text-sm text-charcoal-muted">{text}</p>;
}

export function Tabs({
  items,
  active,
}: {
  items: { key: string; label: string; href: string; count?: number }[];
  active: string;
}) {
  return (
    <nav className="mb-5 flex gap-6 overflow-x-auto border-b border-gray-200 text-sm">
      {items.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`-mb-px shrink-0 border-b-2 pb-2.5 font-medium transition ${
            t.key === active
              ? "border-royal-600 text-charcoal"
              : "border-transparent text-charcoal-muted hover:text-charcoal"
          }`}
        >
          {t.label}
          {t.count != null && <span className="ml-1.5 text-charcoal-muted tabular-nums">{t.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
