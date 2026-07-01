import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Magdalene Medza | Luxury Hair Braiding in Nairobi",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  description:
    "Magdalene Medza, premium hair braiding in Nairobi. Knotless, lemonade, cornrows, makeba, brazilian and more. In-call and out-call. Book your appointment online.",
  keywords: [
    "braiding Nairobi",
    "knotless braids",
    "cornrows",
    "salon booking",
    "Magdalene Medza",
  ],
  openGraph: {
    title: "Magdalene Medza | Luxury Hair Braiding in Nairobi",
    description: "Book premium hair braiding in Nairobi, in-call or out-call.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
