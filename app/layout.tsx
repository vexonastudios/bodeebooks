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
  title: "Bodee Books – Classic Audiobooks, Free to Listen",
  description:
    "Discover and listen to free classic audiobooks — Hardy Boys, Ted Scott Flying Stories, Penny Parker, and more. All audiobooks are embedded from the Bodee Books YouTube channel.",
  keywords: "free audiobooks, classic books, Hardy Boys, Ted Scott, Penny Parker, Mercer Boys",
  authors: [{ name: "Bodee Books" }],
  openGraph: {
    siteName: "Bodee Books",
    type: "website",
    url: "https://bodeebooks.com",
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
