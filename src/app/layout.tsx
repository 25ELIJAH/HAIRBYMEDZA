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

export const metadata: Metadata = {
  title: "Magdalene Medza | Luxury Hair Braiding in Nairobi",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
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
  },
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
