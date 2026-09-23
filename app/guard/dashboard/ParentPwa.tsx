"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./workspace.module.css";

type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };

export default function ParentPwa() {
  const installEvent = useRef<InstallEvent | null>(null);
  const dialog = useRef<HTMLDialogElement | null>(null);
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [desktop, setDesktop] = useState(true);
  const [edge, setEdge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => { if (open) dialog.current?.showModal(); }, [open]);
  useEffect(() => {
    if (location.hostname !== "guard.bodeebooks.com") return;
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIos(isIos);
    setDesktop(!isIos && !/Android/.test(navigator.userAgent));
    setEdge(/Edg\//.test(navigator.userAgent));
    setInstalled(matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/guard-parent-sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    const capture = (event: Event) => { event.preventDefault(); installEvent.current = event as InstallEvent; setAvailable(true); };
    const done = () => { installEvent.current = null; setAvailable(false); setInstalled(true); };
    const request = (event: MessageEvent) => {
      const frame = document.querySelector<HTMLIFrameElement>('iframe[title="BodeeGuard Parent Dashboard"]');
      if (event.origin === location.origin && event.source === frame?.contentWindow && event.data?.type === "bodeeguard-install") { setNotice(""); setOpen(true); }
    };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", done);
    window.addEventListener("message", request);
    return () => { window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", done); window.removeEventListener("message", request); };
  }, []);
  if (!open) return null;
  async function install() {
    const event = installEvent.current; if (!event || busy) return;
    installEvent.current = null; setAvailable(false); setBusy(true); setNotice("");
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === "accepted") { setInstalled(true); setNotice("Installed. Use your new BodeeGuard shortcut to open the parent dashboard."); }
      else setNotice("Installation was canceled. You can install later from your browser’s menu.");
    } catch { setNotice("The install prompt could not open. Use the browser menu instructions below."); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className={styles.installBackdrop} aria-labelledby="parent-install-title" aria-describedby="parent-install-description" onCancel={() => setOpen(false)}>
    <section className={styles.installCard}>
      <h2 id="parent-install-title">{desktop ? "Your parent dashboard, in its own window" : "BodeeGuard on your home screen"}</h2>
      <p id="parent-install-description">{desktop ? "Open BodeeGuard like an app and keep it separate from your browser tabs. It uses the same parent account and family settings." : "Open your parent dashboard from a home-screen icon, using the same account and family settings."}</p>
      {installed && <p>BodeeGuard is installed. You can keep its window open or minimized while you work.</p>}
      {!installed && <p>{ios ? "In Safari, tap Share → Add to Home Screen." : desktop ? edge ? "In Edge, open the browser menu → More tools → Apps → Install this site as an app." : "In Chrome, open the browser menu → Cast, save, and share → Install page as app. Chrome and Edge may also show an install icon in the address bar." : "Open your browser menu → Install app or Add to Home Screen."}</p>}
      {desktop && <div className={styles.installSteps}>
        <h3>Keep it easy to find</h3>
        <p><strong>On Windows:</strong> open the installed app, right-click its taskbar icon, and choose Pin to taskbar. You can leave it open all day.</p>
        <details>
          <summary>Open automatically when I sign in</summary>
          <p>{edge ? "Open edge://apps in Edge. Find BodeeGuard, open its options, and enable Auto-start on device login." : "Open chrome://apps in Chrome. Right-click BodeeGuard and choose Launch at startup. In Edge, use edge://apps → BodeeGuard options → Auto-start on device login."}</p>
          <p>This is optional and is controlled by your browser. You can turn it off in the same place.</p>
        </details>
      </div>}
      <p className={styles.installNote}>Internet is required for live monitoring and saving changes. You may occasionally need to sign in again.</p>
      {notice && <p role="status">{notice}</p>}
      {available && !installed && <button type="button" disabled={busy} onClick={() => void install()}>Install parent app</button>}
      <button type="button" autoFocus onClick={() => setOpen(false)}>Close</button>
    </section>
  </dialog>;
}
