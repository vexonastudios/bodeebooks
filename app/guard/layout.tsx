import type { Metadata } from "next";
import Script from "next/script";

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
  return <>{children}<Script src="/guard-admin/parent-diagnostics.js?v=20260927" data-bg-diagnostics="true" data-version={(process.env.BODEEGUARD_MONITOR_RELEASE||process.env.VERCEL_GIT_COMMIT_SHA) || "unknown"}/></>;
}
