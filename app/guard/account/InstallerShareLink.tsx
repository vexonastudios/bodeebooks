"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Link2, LoaderCircle } from "lucide-react";
import styles from "../portal.module.css";

type DownloadLink = { url: string; version: string; expiresAt: string | null };

export default function InstallerShareLink({ temporary }: { temporary: boolean }) {
  const [link, setLink] = useState<DownloadLink | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!link?.expiresAt) return;
    const timer = setTimeout(() => {
      setLink(null);
      setMessage("That link expired. Create a new one when you are ready to download.");
    }, Math.max(0, Date.parse(link.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [link]);
  async function createLink() {
    if (busy) return;
    setBusy(true); setLink(null); setMessage("");
    try {
      const response = await fetch("/guard/download/windows/", { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Could not create a download link. Try again.");
      setLink(result);
      setMessage("Link ready. Copy it to the child computer and open it there. No website sign-in is needed on that computer.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create a download link. Try again."); }
    finally { setBusy(false); }
  }
  async function copyLink() {
    if (!link) return;
    if (link.expiresAt && Date.parse(link.expiresAt) <= Date.now()) {
      setLink(null); setMessage("That link expired. Create a new one."); return;
    }
    try { await navigator.clipboard.writeText(link.url); setMessage("Download link copied. Open it on the child computer, then approve the app’s pairing code from your own device."); }
    catch { input.current?.focus(); input.current?.select(); setMessage("Select and copy the download link below."); }
  }
  return <div className={styles.installerShare}>
    <button type="button" className={styles.secondaryPortalButton} disabled={busy} onClick={createLink}>
      {busy ? <LoaderCircle size={17} className={styles.spin} /> : <Link2 size={17} />}
      {busy ? "Creating link…" : temporary ? "Create temporary download link" : "Create download link"}
    </button>
    <p>Installing on another computer? Open this link there, or download once here and copy the installer with a USB drive or shared folder.</p>
    {link && <div className={styles.installerLinkDetails}>
      <label htmlFor="child-installer-link">Windows child app · Version {link.version}</label>
      <div className={styles.installerLinkRow}>
        <input id="child-installer-link" ref={input} readOnly value={link.url} onFocus={event => event.currentTarget.select()} spellCheck={false} />
        <button type="button" className={styles.secondaryPortalButton} onClick={copyLink}><Copy size={16} /> Copy link</button>
      </div>
      <p>{link.expiresAt ? `Start the download before ${new Date(link.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} (5-minute link). The downloaded installer can be reused for your other children’s computers.` : "This link downloads the installer. You still approve each computer from your own parent account."}</p>
    </div>}
    <p role="status" aria-live="polite">{message}</p>
  </div>;
}
