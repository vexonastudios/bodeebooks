import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import ActivationForm from "./ActivationForm";
import styles from "../portal.module.css";

export const metadata: Metadata = { title: "Approve a BodeeGuard Computer" };

export default async function ActivatePage({ searchParams }: { searchParams: Promise<{ code?: string | string[]; setup?: string }> }) {
  await auth.protect();
  const {code:rawCode, setup} = await searchParams;
  const fromSetup = setup === "1";
  const initialCode = (Array.isArray(rawCode) ? rawCode[0] : rawCode || "").toUpperCase();
  return (
    <div className={styles.portalPage}>
      <div className={`container ${styles.narrowShell}`}>
        <Link className={styles.backLink} href={fromSetup ? "/guard/dashboard/?setup=connect" : "/guard/account"}><ArrowLeft size={15} /> {fromSetup ? "Back to computer setup" : "Parent account"}</Link>
        <section className={styles.activationCard}>
          <div className={styles.largeIcon}><ShieldCheck size={29} /></div>
          <span className={styles.kicker}>On your phone or parent computer</span>
          <h1>Approve your child’s computer.</h1>
          <p>Leave BodeeGuard open on the child’s computer. On this parent device, enter the <strong>pairing code from the child app</strong> below.</p>
          <p className={styles.approvalNote}>After approval, choose which child uses this computer.</p>
          <ActivationForm initialCode={initialCode} />
        </section>
      </div>
    </div>
  );
}
