"use client";
import { useEffect, useState } from "react";
import { Download, KeyRound, LoaderCircle } from "lucide-react";
import styles from "../portal.module.css";
type DownloadLink = {url:string;version:string;expiresAt:string|null};
export default function InstallForm() {
  const [code,setCode] = useState("");
  const [link,setLink] = useState<DownloadLink|null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  useEffect(() => {
    if (!link?.expiresAt) return;
    const timer = setTimeout(() => {setLink(null);setError("The download button expired. Choose Get download again to refresh it.");},Math.max(0,Date.parse(link.expiresAt)-Date.now()));
    return () => clearTimeout(timer);
  },[link]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true);setError("");setLink(null);
    try {
      const response = await fetch("/guard/install/redeem/",{method:"POST",credentials:"omit",headers:{"Content-Type":"application/json"},body:JSON.stringify({code}),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(15000)});
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Could not check that code. Please try again.");
      setLink(result);
    } catch (err) {setError(err instanceof Error ? err.message : "Could not check that code. Please try again.");}
    finally {setBusy(false);}
  }
  return <form className={styles.activationForm} onSubmit={submit}>
    <label htmlFor="download-code">Download code from the parent’s phone</label>
    <input id="download-code" value={code} onChange={event=>{setCode(event.target.value.toUpperCase());setLink(null);setError("");}} placeholder="XXXXX-XXXXX" required minLength={10} maxLength={24} autoCapitalize="characters" autoComplete="off" spellCheck={false} aria-describedby="download-help download-error" disabled={busy} />
    <p id="download-help" className={styles.pairingHelp}>10 letters and numbers. Spaces and the dash are optional.</p>
    <button className={styles.portalButton} type="submit" disabled={busy}>{busy ? <LoaderCircle size={18} className={styles.spin} /> : <KeyRound size={18} />}{busy?"Checking code…":"Get download"}</button>
    <div id="download-error" role="alert">{error && <p className={styles.errorMessage}>{error}</p>}</div>
    {link && <div className={styles.installReady} role="status">
      <strong>Your Windows download is ready.</strong>
      <p>Version {link.version} · Windows 64-bit</p>
      <a className={styles.portalButton} href={link.url} rel="noreferrer"><Download size={18} /> Download BodeeGuard</a>
      <p>Open the downloaded installer, then follow its setup steps. {link.expiresAt && "Start the download within 5 minutes."}</p>
    </div>}
  </form>;
}
