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
          <h1>Approve your child’s computer.</h1>
          <p>On <strong>the child’s computer you’re setting up</strong>, open BodeeGuard. Type the <strong>pairing code shown on its setup screen</strong> below.</p>
          <p className={styles.approvalNote}>Keep BodeeGuard open on the child’s computer. Approving here connects that computer to your family.</p>
          <ActivationForm initialCode={initialCode} />
        </section>
      </div>
    </div>
  );
}
