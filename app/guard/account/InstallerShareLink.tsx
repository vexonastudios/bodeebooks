"use client";
import { useEffect, useState } from "react";
import { KeyRound, LoaderCircle, MonitorDown, Smartphone } from "lucide-react";
import styles from "../portal.module.css";
type DownloadCode = {code:string;version:string;expiresAt:string};
export default function InstallerShareLink() {
  const [grant,setGrant] = useState<DownloadCode|null>(null);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  useEffect(() => {
    if (!grant) return;
    const timer=setTimeout(()=>{setGrant(null);setMessage("That code expired. Create a new one when you’re ready.");},Math.max(0,Date.parse(grant.expiresAt)-Date.now()));
    return ()=>clearTimeout(timer);
  },[grant]);
  async function createCode() {
    if (busy) return;
    setBusy(true);setGrant(null);setMessage("");
    try {
      const response=await fetch("/guard/install/code/",{method:"POST",credentials:"same-origin",cache:"no-store",redirect:"error",signal:AbortSignal.timeout(15000)});
      const result=await response.json();
      if (!response.ok) throw Error(result.error || "Could not create a code. Try again.");
      setGrant(result);
    } catch(error){setMessage(error instanceof Error ? error.message : "Could not create a code. Try again.");}
    finally{setBusy(false);}
  }
  return <section className={styles.installerShare} aria-label="Install from your phone">
    <h3><Smartphone size={20} /> Installing on your child’s computer?</h3>
    <p>Keep this page open on your phone. No email or parent sign-in is needed on the child’s PC.</p>
    <button type="button" className={styles.portalButton} disabled={busy} onClick={createCode}>{busy?<LoaderCircle size={18} className={styles.spin}/>:<KeyRound size={18}/>} {busy?"Creating code…":grant?"Create a fresh code":"Create download code"}</button>
    {grant && <div className={styles.installerLinkDetails} role="status">
      <p><MonitorDown size={18} /> On the child’s PC, open:</p>
      <strong className={styles.installAddress}>guard.bodeebooks.com/install</strong>
      <p>Then enter this download code:</p>
      <strong className={styles.installCode}>{grant.code}</strong>
      <p>Valid until {new Date(grant.expiresAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})} (30 minutes). Use the same code on your other children’s computers before it expires.</p>
      <p>Once installed, approve each computer’s <strong>pairing code</strong> from your phone.</p>
    </div>}
    <p role="status" aria-live="polite">{message}</p>
    <details className={styles.installHelp}><summary>Using a USB drive instead?</summary><p>Download the Windows app once, then copy that installer to your children’s computers. Approve each computer from your phone after installing.</p></details>
  </section>;
}
