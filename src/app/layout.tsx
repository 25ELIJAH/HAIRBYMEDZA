import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

// Clean, modern pairing: Manrope for headings, Inter for body text.
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
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
    <html lang="en" className={`${manrope.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
