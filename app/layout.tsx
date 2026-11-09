import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Lora, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PublicSiteAnalytics from "@/components/PublicSiteAnalytics";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bodeebooks.com"),
  title: {
    default: "BodeeBooks — Books and tools for your homeschool family",
    template: "%s | BodeeBooks",
  },
  description:
    "Free audiobooks and printed classics, BodeeGuard homeschool software, fitness, and family games.",
  keywords: [
    "free audiobooks",
    "multi-voice audiobooks",
    "classic audiobooks",
    "dramatized audiobooks",
    "Hardy Boys audiobook",
    "Ted Scott Flying Stories audiobook",
    "Penny Parker audiobook",
    "Mercer Boys audiobook",
    "free classic literature",
    "children's classic audiobooks",
    "Franklin W. Dixon audiobook",
    "Bodee Books",
    "listen free online",
    "full cast audiobook",
  ],
  authors: [{ name: "Bodee Books", url: "https://bodeebooks.com" }],
  creator: "Bodee Books",
  publisher: "Bodee Books",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    siteName: "Bodee Books",
    type: "website",
    url: "https://bodeebooks.com",
    title: "BodeeBooks — Books and tools for your homeschool family",
    description:
      "Free audiobooks and printed classics, BodeeGuard homeschool software, fitness, and family games.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Bodee Books – Free Multi-voice Classic Audiobooks",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BodeeBooks — Books and tools for your homeschool family",
    description:
      "Free audiobooks and printed classics, BodeeGuard homeschool software, fitness, and family games.",
  },
  alternates: {
    canonical: "https://bodeebooks.com",
  },
  verification: {
    google: "cw2s97FQxvgwndAKlWH0XMN8GZxmTA_VgcmYHvv9q2Q",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${lora.variable} ${inter.variable}`}>
      <head />
      <body>
        <PublicSiteAnalytics />
        <ClerkProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </ClerkProvider>
      </body>
    </html>
  );
}
