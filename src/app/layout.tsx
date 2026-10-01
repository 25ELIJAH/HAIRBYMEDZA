import type { Metadata } from "next";
import { Playfair_Display, Jost } from "next/font/google";
import "./globals.css";

// Luxury pairing: a high fashion serif for display, a clean geometric sans for text.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  title: "Magdalene Medza | Luxury Hair Braiding in Nairobi",
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
    title: "Magdalene Medza | Luxury Hair Braiding in Nairobi",
    description: "Book premium hair braiding in Nairobi. Studio visits or I come to you.",
    type: "website",
    locale: "en_KE",
    siteName: "Magdalene Medza",
    images: [{ url: "/logo.jpg", alt: "Magdalene Medza hair braiding" }],
  },
  twitter: {
    card: "summary",
    title: "Magdalene Medza | Luxury Hair Braiding in Nairobi",
    description: "Book premium hair braiding in Nairobi. Studio visits or I come to you.",
    images: ["/logo.jpg"],
  },
};

export const viewport = {
  themeColor: "#2a0f3d",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${jost.variable}`}>
      <body>{children}</body>
    </html>
  );
}
