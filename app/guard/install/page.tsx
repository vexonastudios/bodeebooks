import type { Metadata } from "next";
import { MonitorDown, ShieldCheck } from "lucide-react";
import InstallForm from "./InstallForm";
import styles from "../portal.module.css";
export const metadata: Metadata = {title:"Install BodeeGuard on a Child’s Computer",robots:{index:false,follow:false},referrer:"no-referrer"};
export default function InstallPage() {
  return <div className={`${styles.portalPage} ${styles.installPage}`}><div className={`container ${styles.narrowShell}`}>
    <section className={styles.activationCard}>
      <div className={styles.largeIcon}><MonitorDown size={29} /></div>
      <span className={styles.kicker}>On your child’s Windows computer</span>
      <h1>Set up this child’s computer.</h1>
      <p>Enter the download code from the parent dashboard. You don’t need email or a parent sign-in on this computer.</p>
      <InstallForm />
      <p className={styles.approvalNote}><ShieldCheck size={18} aria-hidden="true" /> After installing, BodeeGuard shows a <strong>pairing code</strong>. Enter that code in the parent dashboard on your phone or computer, then choose the child’s existing profile.</p>
      <details className={styles.installHelp}><summary>Where does the download code come from?</summary><p>In the parent dashboard, open step four of Family Setup and select <strong>Create download code</strong>. Enter that download code on this page.</p></details>
    </section>
  </div></div>;
}
