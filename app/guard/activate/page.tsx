import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import ActivationForm from "./ActivationForm";
import styles from "../portal.module.css";

export const metadata: Metadata = { title: "Approve a BodeeGuard Computer" };

export default async function ActivatePage({ searchParams }: { searchParams: Promise<{ code?: string | string[] }> }) {
  await auth.protect();
  const rawCode = (await searchParams).code;
  const initialCode = (Array.isArray(rawCode) ? rawCode[0] : rawCode || "").toUpperCase();
  return (
    <div className={styles.portalPage}>
      <div className={`container ${styles.narrowShell}`}>
        <Link className={styles.backLink} href="/guard/account"><ArrowLeft size={15} /> Parent account</Link>
        <section className={styles.activationCard}>
          <div className={styles.largeIcon}><ShieldCheck size={29} /></div>
          <span className={styles.kicker}>Secure device approval</span>
          <h1>Connect this computer to your family.</h1>
          <p>Enter the short pairing code shown in <strong>BodeeGuard Settings → BodeeGuard Account</strong>. Codes expire quickly and can approve only one computer.</p>
          <ActivationForm initialCode={initialCode} />
        </section>
      </div>
    </div>
  );
}
