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
          <p>In the child app, open <strong>Parent setup &amp; connection</strong>, choose <strong>Get pairing code</strong>, then <strong>Copy code</strong>. Paste that code below—or type it here if you’re using your phone.</p>
          <p className={styles.approvalNote}>You’re approving the child computer showing the code, not this phone or browser. No parent sign-in is needed inside the child app.</p>
          <ActivationForm initialCode={initialCode} />
        </section>
      </div>
    </div>
  );
}
