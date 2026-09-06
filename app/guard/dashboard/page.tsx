import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import styles from "./workspace.module.css";

export const metadata: Metadata = { title: "BodeeGuard Parent Dashboard", robots: { index: false, follow: false } };

export default async function FamilyDashboard() {
  if (!(await auth()).isAuthenticated) redirect("/guard/sign-in?redirect_url=%2Fguard%2Fdashboard%2F");
  // Keep the surrounding ClerkProvider alive to renew the parent's session.
  // A same-origin document isolates shared desktop CSS from the book site.
  // It is not a LAN iframe and never calls the parent's desktop.
  return <div className={styles.workspace} data-guard-workspace="true">
    <iframe title="BodeeGuard Parent Dashboard" src="/guard/dashboard/workspace/" className={styles.frame}
      sandbox="allow-same-origin allow-scripts allow-forms allow-modals allow-top-navigation-by-user-activation" />
  </div>;
}
