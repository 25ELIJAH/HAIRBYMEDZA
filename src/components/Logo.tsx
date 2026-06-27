import Link from "next/link";
import LogoMark from "./LogoMark";

export default function Logo({
  variant = "dark",
  href = "/",
}: {
  variant?: "dark" | "light";
  href?: string | null;
}) {
  const textColor = variant === "light" ? "text-white" : "text-charcoal";
  const subColor = variant === "light" ? "text-lavender-200" : "text-royal-500";

  const inner = (
    <span className="inline-flex items-center gap-3">
      <LogoMark size={40} badge className="shrink-0 shadow-soft rounded-full" />
      <span className="leading-none">
        <span className={`block font-display text-lg font-semibold tracking-wide ${textColor}`}>
          Magdalene Medza
        </span>
        <span className={`block text-[10px] font-semibold uppercase tracking-[0.3em] ${subColor}`}>
          Hair Braiding
        </span>
      </span>
    </span>
  );

  if (!href) return inner;
  return (
    <Link href={href} className="shrink-0">
      {inner}
    </Link>
  );
}
