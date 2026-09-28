"use client";
import { useAuth } from "@clerk/nextjs";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { dashboardQuery } from "./navigation";
import { fitParentViewport } from "./visible-viewport";
import styles from "./workspace.module.css";

export default function ParentWorkspace({ query = "" }: { query?: string }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
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
        if (token === null && isSignedIn === false) {
          if (frame.current?.contentDocument?.body.classList.contains('cloud-messages-active')) {
            // The conversation provides sign-in without throwing away an unsent draft.
            frame.current?.contentWindow?.postMessage({type:'bodeeguard-session-required'}, window.location.origin); return;
          }
          const current = new URLSearchParams(window.location.search);
          const target = '/guard/dashboard/' + dashboardQuery({ setup: current.get('setup') || undefined, conversation: current.get('conversation') || undefined });
          window.location.assign('/guard/sign-in/?redirect_url=' + encodeURIComponent(target)); return;
        }
        opened = true; setReady(true);
        if (token) frame.current?.contentWindow?.postMessage({type:'bodeeguard-session-ready'}, window.location.origin);
      } catch { if (!disposed && !document.hidden) { opened = true; setReady(true); } }
      finally { pending = false; }
    }
    const message = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'bodeeguard-renew-session') void renew(Boolean(event.data.manual || event.data.reason === 'authentication'));
      if (event.data?.type === 'bodeeguard-sign-in' && navigator.userActivation?.isActive) {
        const target = '/guard/dashboard/' + dashboardQuery({ conversation: event.data.studentId });
        window.open('/guard/sign-in/?redirect_url=' + encodeURIComponent(target), '_blank', 'noopener');
      }
    };
    const visible = () => { if (!document.hidden) void renew(); };
    window.addEventListener('message', message);
    window.addEventListener('online', visible);
    document.addEventListener('visibilitychange', visible);
    void renew();
    return () => { disposed = true; window.removeEventListener('message', message); window.removeEventListener('online', visible); document.removeEventListener('visibilitychange', visible); };
  }, [getToken, isLoaded, isSignedIn, query]);
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
