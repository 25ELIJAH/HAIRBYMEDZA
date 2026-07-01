// Magdalene Medza emblem: a gold woman's profile with a leaf crown, on dark.
// Recreated as inline SVG so it stays crisp at any size and needs no image file.
// Used for the header logo (client + admin), the favicon and the splash.

export default function LogoMark({
  size = 40,
  className = "",
  badge = false,
}: {
  size?: number;
  className?: string;
  badge?: boolean; // wrap in a dark circle for contrast
}) {
  const gid = "medzaGold";
  const art = (
    <>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f2e08f" />
          <stop offset="0.5" stopColor="#cfa24a" />
          <stop offset="1" stopColor="#9c7726" />
        </linearGradient>
      </defs>

      {/* Leaf crown: three outlined leaves */}
      <g
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* centre leaf */}
        <path d="M50 15 C58 24 58 37 50 45 C42 37 42 24 50 15 Z" />
        <path d="M50 21 L50 41" strokeWidth="1.3" />
        {/* left leaf */}
        <path d="M33 26 C44 30 49 40 47 51 C36 47 31 37 33 26 Z" />
        {/* right leaf */}
        <path d="M67 26 C56 30 51 40 53 51 C64 47 69 37 67 26 Z" />
      </g>

      {/* Woman's profile (cameo, facing right), filled gold */}
      <path
        fill={`url(#${gid})`}
        d="M46 22
           C58 22 66 30 66 41
           C70 45 72 49 67 53
           C70 56 69 60 64 62
           C67 65 65 71 59 74
           C55 77 54 83 54 91
           L41 91
           C41 79 35 75 33 61
           C31 47 33 33 46 22 Z"
      />
      {/* Flowing hair strands sweeping to the back */}
      <g fill="none" stroke={`url(#${gid})`} strokeWidth="2.1" strokeLinecap="round">
        <path d="M40 30 C26 42 24 64 33 84" />
        <path d="M35 34 C24 48 24 66 31 84" opacity="0.8" />
      </g>

      {/* Sparkle */}
      <g fill="#f2e08f">
        <path d="M40 62 l1.4 3.2 3.2 1.4 -3.2 1.4 -1.4 3.2 -1.4-3.2 -3.2-1.4 3.2-1.4z" />
      </g>
    </>
  );

  const common = {
    width: size,
    height: size,
    viewBox: "0 0 100 100",
    className,
    role: "img" as const,
    "aria-label": "Magdalene Medza",
  };

  if (badge) {
    return (
      <svg {...common}>
        <circle cx="50" cy="50" r="49" fill="#140b12" />
        <circle cx="50" cy="50" r="49" fill="none" stroke="#cfa24a" strokeWidth="1.5" opacity="0.6" />
        {art}
      </svg>
    );
  }
  return <svg {...common}>{art}</svg>;
}
