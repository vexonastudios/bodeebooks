import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowRight, Laptop, ShieldCheck, UserRound } from "lucide-react";
import styles from "../portal.module.css";

export const metadata: Metadata = { title: "BodeeGuard Parent Account" };

export default async function GuardAccountPage() {
  await auth.protect();
  const user = await currentUser();
  const name = user?.firstName || user?.fullName || "Parent";

  return (
    <div className={styles.portalPage}>
      <div className={`container ${styles.portalShell}`}>
        <header className={styles.portalHeader}>
          <div><span><ShieldCheck size={15} /> BodeeGuard account</span><h1>Welcome, {name}.</h1><p>This parent account will own your family subscription and approve every protected computer.</p></div>
        </header>
        <div className={styles.portalGrid}>
          <section className={styles.portalCard}>
            <div className={styles.cardIcon}><Laptop size={22} /></div>
            <h2>Connect a computer</h2>
            <p>Open BodeeGuard on the computer, choose <strong>Settings → BodeeGuard Account</strong>, and enter the short code it displays.</p>
            <Link className={styles.portalButton} href="/guard/activate">Enter pairing code <ArrowRight size={16} /></Link>
          </section>
          <section className={styles.portalCard}>
            <div className={styles.cardIcon}><UserRound size={22} /></div>
            <h2>Parent identity</h2>
            <p className={styles.identity}>{user?.primaryEmailAddress?.emailAddress || "Signed in with Clerk"}</p>
            <p>Your sign-in stays with Clerk. BodeeGuard child computers never receive or store this password.</p>
          </section>
        </div>
        <aside className={styles.notice}><strong>Your secure parent account is connected.</strong><span>Subscription checkout, household records, and the public Windows installer will appear here as the remaining BodeeGuard services come online.</span></aside>
      </div>
    </div>
  );
}
