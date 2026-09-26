"use client";
import { useAuth } from "@clerk/nextjs";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { fitParentViewport } from "./visible-viewport";
import styles from "./workspace.module.css";

export default function ParentWorkspace({ query = "" }: { query?: string }) {
  const { getToken, isLoaded } = useAuth();
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!isLoaded) return;
    let disposed = false, pending = false, opened = false, lastAttempt = 0;
    async function renew(force = false) {
      if (disposed || document.hidden || pending || (opened && !force && Date.now() - lastAttempt < 10000)) return;
      pending = true; lastAttempt = Date.now();
      try {
        const token = await Promise.race([getToken({ skipCache: true }), new Promise<undefined>(resolve => setTimeout(resolve, 6000))]);
        if (disposed || document.hidden) return;
        if (token === null) {
          const target = '/guard/dashboard/' + query;
          window.location.assign('/guard/sign-in/?redirect_url=' + encodeURIComponent(target)); return;
        }
        opened = true; setReady(true);
        if (token) frame.current?.contentWindow?.postMessage({type:'bodeeguard-session-ready'}, window.location.origin);
      } catch { if (!disposed && !document.hidden) { opened = true; setReady(true); } }
      finally { pending = false; }
    }
    const message = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.source === frame.current?.contentWindow && event.data?.type === 'bodeeguard-renew-session') void renew(Boolean(event.data.manual));
    };
    const visible = () => { if (!document.hidden) void renew(); };
    window.addEventListener('message', message);
    window.addEventListener('online', visible);
    document.addEventListener('visibilitychange', visible);
    void renew();
    return () => { disposed = true; window.removeEventListener('message', message); window.removeEventListener('online', visible); document.removeEventListener('visibilitychange', visible); };
  }, [getToken, isLoaded, query]);
  useEffect(() => {
    if (ready && frame.current) return fitParentViewport(frame.current);
  }, [ready]);
  if (!ready) return <div className={styles.connecting} role="status">
    <Image className={styles.connectingLogo} src="/guard-icons/bodeeguard-parent-192.png" alt="" width={64} height={64} priority />
    <p>Opening your dashboard…</p>
    <div className={styles.connectingProgress} role="progressbar" aria-label="Opening your dashboard">
      <span />
    </div>
  </div>;
  return <iframe ref={frame} title="BodeeGuard Parent Dashboard" src={"/guard/dashboard/workspace/" + query} className={styles.frame}
    allow="autoplay; fullscreen; encrypted-media; microphone 'self'"
    sandbox="allow-same-origin allow-scripts allow-forms allow-modals allow-downloads allow-top-navigation-by-user-activation" />;
}
