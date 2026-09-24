import type { Metadata } from "next";

const description =
  "BodeeGuard helps parents plan school days, follow learning progress, and manage their children's connected computers.";

export const metadata: Metadata = {
  title: { default: "BodeeGuard", template: "%s" },
  applicationName: "BodeeGuard",
  description,
  keywords: ["BodeeGuard", "parent dashboard", "homeschool planning"],
  openGraph: { type: "website", siteName: "BodeeGuard", title: "BodeeGuard", description },
  twitter: { card: "summary", title: "BodeeGuard", description },
  alternates: { canonical: null },
};

export default function GuardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
