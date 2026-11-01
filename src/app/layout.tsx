import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Website: Fraunces (a soft, elegant serif) for headings and DM Sans for
// text. The admin uses Inter throughout (see admin layouts).
// The font files ship with the site (src/app/fonts, SIL Open Font License),
// so builds never depend on downloading them from Google Fonts.
const fraunces = localFont({
  src: "./fonts/fraunces-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-brand",
  display: "swap",
});
const dmSans = localFont({
  src: "./fonts/dm-sans-latin-wght-normal.woff2",
  weight: "100 1000",
  variable: "--font-body",
  display: "swap",
});
const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-admin",
  display: "swap",
});

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  title: "Magdalene Medza | Hair Braiding in Nairobi",
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
  description:
    "Magdalene Medza, premium hair braiding in Nairobi. Knotless, lemonade, cornrows, makeba, brazilian and more. Studio visits or I come to you. Book your appointment online.",
  keywords: [
    "braiding Nairobi",
    "knotless braids",
    "cornrows",
    "salon booking",
    "Magdalene Medza",
  ],
  openGraph: {
    title: "Magdalene Medza | Hair Braiding in Nairobi",
    description: "Book premium hair braiding in Nairobi. Studio visits or I come to you.",
    type: "website",
    locale: "en_KE",
    siteName: "Magdalene Medza",
    images: [{ url: "/logo.jpg", alt: "Magdalene Medza hair braiding" }],
  },
  twitter: {
    card: "summary",
    title: "Magdalene Medza | Hair Braiding in Nairobi",
    description: "Book premium hair braiding in Nairobi. Studio visits or I come to you.",
    images: ["/logo.jpg"],
  },
};

export const viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
