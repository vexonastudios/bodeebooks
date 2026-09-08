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
  useEffect(() => { if (open) dialog.current?.showModal(); }, [open]);
  useEffect(() => {
    if (location.hostname !== "guard.bodeebooks.com") return;
    setIos(/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    setInstalled(matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/guard-parent-sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    const capture = (event: Event) => { event.preventDefault(); installEvent.current = event as InstallEvent; setAvailable(true); };
    const done = () => { installEvent.current = null; setAvailable(false); setInstalled(true); setOpen(false); };
    const request = (event: MessageEvent) => {
      const frame = document.querySelector<HTMLIFrameElement>('iframe[title="BodeeGuard Parent Dashboard"]');
      if (event.origin === location.origin && event.source === frame?.contentWindow && event.data?.type === "bodeeguard-install") setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", done);
    window.addEventListener("message", request);
    return () => { window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", done); window.removeEventListener("message", request); };
  }, []);
  if (!open) return null;
  return <dialog ref={dialog} className={styles.installBackdrop} aria-labelledby="parent-install-title" onCancel={() => setOpen(false)}>
    <section className={styles.installCard}>
      <h2 id="parent-install-title">BodeeGuard on your phone</h2>
      <p>{installed ? "BodeeGuard is already installed." : available ? "Open your dashboard from your home screen." : ios ? "In Safari, tap Share → Add to Home Screen." : "Open your browser menu → Install app or Add to Home Screen."}</p>
      {available && !installed && <button type="button" onClick={async () => {
        const event = installEvent.current; if (!event) return;
        try { await event.prompt(); await event.userChoice; } finally { installEvent.current = null; setAvailable(false); setOpen(false); }
      }}>Install BodeeGuard</button>}
      <button type="button" autoFocus onClick={() => setOpen(false)}>Close</button>
    </section>
  </dialog>;
}
