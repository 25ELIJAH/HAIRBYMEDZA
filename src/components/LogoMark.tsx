// Magdalene Medza logo. Renders the real logo image (public/logo.png) so it is
// exactly the artwork provided, with no redrawing. The image already sits on a
// black background, so as a badge it reads as a clean circular emblem.

export default function LogoMark({
  size = 40,
  className = "",
  badge = false,
}: {
  size?: number;
  className?: string;
  badge?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.jpg"
      alt="Magdalene Medza"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`${badge ? "rounded-full object-cover" : "object-contain"} ${className}`}
    />
  );
}
