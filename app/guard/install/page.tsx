import type { Metadata } from "next";
import { MonitorDown, ShieldCheck } from "lucide-react";
import InstallForm from "./InstallForm";
import styles from "../portal.module.css";
export const metadata: Metadata = {title:"Install BodeeGuard on a Child’s Computer",robots:{index:false,follow:false},referrer:"no-referrer"};
export default function InstallPage() {
  return <main className={styles.portalPage}><div className={`container ${styles.narrowShell}`}>
    <section className={styles.activationCard}>
      <div className={styles.largeIcon}><MonitorDown size={29} /></div>
      <span className={styles.kicker}>BodeeGuard · Windows child app</span>
      <h1>Set up this child’s computer.</h1>
      <p>Enter the download code shown on your parent’s phone. You don’t need email or a parent sign-in on this computer.</p>
      <InstallForm />
      <p className={styles.approvalNote}><ShieldCheck size={18} aria-hidden="true" /> After installing, BodeeGuard shows a <strong>pairing code</strong>. Approve that new code from the parent’s phone, then choose the child’s existing profile.</p>
      <details className={styles.installHelp}><summary>Where does the download code come from?</summary><p>On the parent’s phone, open BodeeGuard → Parent account → Connect a child computer → <strong>Create download code</strong>. Keep that screen open while you type the code here.</p></details>
    </section>
  </div></main>;
}
