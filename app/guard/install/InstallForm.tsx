"use client";
import { useEffect, useRef, useState } from "react";
import { CircleCheck, KeyRound, LoaderCircle } from "lucide-react";
import styles from "../portal.module.css";
import InstallerDownload from "../InstallerDownload";
type DownloadLink = {url:string;version:string;expiresAt:string|null};
export default function InstallForm() {
  const [code,setCode] = useState("");
  const [link,setLink] = useState<DownloadLink|null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const readyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!link) return;
    const download = readyRef.current?.querySelector<HTMLAnchorElement>("a");
    if (!download) return;
    download.focus({preventScroll:true});
    download.scrollIntoView({block:"center",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
  }, [link]);
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
    <input id="download-code" value={code} onChange={event=>{setCode(event.target.value.toUpperCase());setLink(null);setError("");}} placeholder="MKR7" required minLength={4} maxLength={24} autoCapitalize="characters" autoComplete="off" spellCheck={false} aria-describedby="download-help download-error" disabled={busy} />
    <p id="download-help" className={styles.pairingHelp}>3 letters and 1 number, like MKR7. Capital or lowercase letters both work.</p>
    <button className={styles.portalButton} type="submit" disabled={busy}>{busy ? <LoaderCircle size={18} className={styles.spin} /> : <KeyRound size={18} />}{busy?"Checking code…":"Get download"}</button>
    <div id="download-error" role="alert">{error && <p className={styles.errorMessage}>{error}</p>}</div>
    {link && <div className={styles.installReady} ref={readyRef}>
      <strong className={styles.installReadyHeading} role="status"><CircleCheck size={22} aria-hidden="true" />Your Windows download is ready.</strong>
      <p>Next, choose <strong>Download BodeeGuard</strong> below to save the installer.</p>
      <p>Version {link.version} · Windows 64-bit</p>
      <InstallerDownload key={link.url} href={link.url} label="Download BodeeGuard" version={link.version} expiresAt={link.expiresAt} />
      <p>Open the downloaded installer, then follow its setup steps. {link.expiresAt && "Start the download within 5 minutes."}</p>
    </div>}
  </form>;
}
