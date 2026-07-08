import type { Metadata } from "next";
import { Lora, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
    default: "Bodee Books – Free Multi-voice Classic Audiobooks",
    template: "%s | Bodee Books – Free Multi-voice Audiobooks",
  },
  description:
    "Listen free to multi-voice classic audiobooks — Hardy Boys, Ted Scott Flying Stories, Penny Parker, Mercer Boys, and more. Dramatized with full cast, streamed directly in your browser.",
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
    title: "Bodee Books – Free Multi-voice Classic Audiobooks",
    description:
      "Listen free to dramatized, multi-voice classic audiobooks — Hardy Boys, Ted Scott, Penny Parker, and more. No account needed, stream right in your browser.",
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
    title: "Bodee Books – Free Multi-voice Classic Audiobooks",
    description:
      "Dramatized multi-voice audiobooks of Hardy Boys, Ted Scott, Penny Parker & more. Free to stream.",
  },
  alternates: {
    canonical: "https://bodeebooks.com",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${lora.variable} ${inter.variable}`}>
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
