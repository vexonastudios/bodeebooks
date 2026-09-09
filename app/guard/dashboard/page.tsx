import type { Metadata, Viewport } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import styles from "./workspace.module.css";
import ParentPwa from "./ParentPwa";
import ParentWorkspace from "./ParentWorkspace";

export const metadata: Metadata = {
  metadataBase: new URL("https://guard.bodeebooks.com"),
  title: "BodeeGuard Parent Dashboard", robots: { index: false, follow: false },
  manifest: "/guard-parent.webmanifest",
  appleWebApp: { capable: true, title: "BodeeGuard", statusBarStyle: "black-translucent" },
  icons: { icon: "/guard-icons/bodeeguard-parent-192.png", apple: "/guard-icons/bodeeguard-parent-apple-180.png" }
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#11152b" };

export default async function FamilyDashboard() {
  if (!(await auth()).isAuthenticated) redirect("/guard/sign-in?redirect_url=%2Fguard%2Fdashboard%2F");
  // Keep the surrounding ClerkProvider alive to renew the parent's session.
  // A same-origin document isolates shared desktop CSS from the book site.
  // It is not a LAN iframe and never calls the parent's desktop.
  return <div className={styles.workspace} data-guard-workspace="true">
    <ParentPwa />
    <ParentWorkspace />
  </div>;
}
