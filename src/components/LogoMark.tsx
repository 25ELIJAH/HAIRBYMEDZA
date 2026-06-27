// Magdalene Medza emblem: a gold woman's profile with flowing hair and leaves,
// drawn as fine gold line art. Inline SVG so it is self contained (no image
// file), stays crisp at any size, and is reused for the header logo, the
// favicon and the splash screen.

export default function LogoMark({
  size = 40,
  className = "",
  badge = false,
}: {
  size?: number;
  className?: string;
  badge?: boolean; // wrap in a purple circle for contrast
}) {
  const gid = "medzaGold";
  const art = (
    <>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0dd92" />
          <stop offset="0.5" stopColor="#d4af37" />
          <stop offset="1" stopColor="#a87f1f" />
        </linearGradient>
      </defs>

      {/* Leaf crown */}
      <g fill={`url(#${gid})`}>
        <path d="M34 15c-1-4 0-8 3-10 2 3 2 8-3 10z" />
        <path d="M40 14c1-4 4-7 8-7-1 4-3 7-8 7z" />
        <path d="M37 15c-3-3-4-7-3-11 4 2 6 7 3 11z" opacity="0.85" />
      </g>

      {/* Face profile + flowing hair, fine gold strokes */}
      <g
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* profile: forehead, nose, lips, chin */}
        <path d="M39 17c5 1 7 6 6 11c2 1 3 3 0 4c1 2 0 4-2 5c2 1 2 4-1 6c-2 2-5 2-7 1" />
        {/* outer hair sweep */}
        <path d="M39 17c-9-3-17 3-18 14c-1 10 4 18 13 21" strokeWidth="2.4" />
        {/* inner hair strands */}
        <path d="M33 21c-7 3-11 11-9 20" opacity="0.85" />
        <path d="M29 27c-4 4-5 11-2 17" opacity="0.7" />
      </g>
    </>
  );

  const common = {
    width: size,
    height: size,
    viewBox: "0 0 64 64",
    className,
    role: "img" as const,
    "aria-label": "Magdalene Medza",
  };

  if (badge) {
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="31" fill="#4a0a78" />
        <circle cx="32" cy="32" r="31" fill="none" stroke="#d4af37" strokeWidth="1.5" opacity="0.55" />
        {art}
      </svg>
    );
  }
  return <svg {...common}>{art}</svg>;
}
