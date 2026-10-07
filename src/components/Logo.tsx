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
  const subColor = variant === "light" ? "text-white/70" : "text-charcoal-muted";

  const inner = (
    <span className="inline-flex items-center gap-3">
      <LogoMark size={36} badge className="shrink-0 rounded-full" />
      <span className="leading-none">
        <span className={`block font-display text-[17px] font-medium ${textColor}`}>
          Magdalene Medza
        </span>
        <span className={`mt-0.5 block text-xs ${subColor}`}>Hair braiding, Nairobi</span>
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
