"use client";
import { useAuth } from "@clerk/nextjs";
import { Bell, BellOff, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createParentNotifications } from "./parent-notifications-client.js";
import styles from "./workspace.module.css";

export default function ParentNotifications() {
  const { userId } = useAuth();
  const client = useRef<ReturnType<typeof createParentNotifications> | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ supported: false, enabled: false, busy: true, message: '', iosInstall: false });
  useEffect(() => { if (open) dialog.current?.showModal(); }, [open]);
  useEffect(() => {
    if (!userId) return;
    const controller = createParentNotifications({ userId, onChange: setState }); client.current = controller;
    let pendingMessage: string | null = null;
    const frame = () => document.querySelector<HTMLIFrameElement>('iframe[title="BodeeGuard Parent Dashboard"]')?.contentWindow;
    const request = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame()) return;
      if (event.data?.type === 'bodeeguard-messages-ready' && pendingMessage !== null) frame()?.postMessage({type:'bodeeguard-open-messages',studentId:pendingMessage},location.origin);
      if (event.data?.type === 'bodeeguard-message-opened') pendingMessage = null;
      if (event.data?.type !== 'bodeeguard-phone-notifications') return;
      setState(controller.state()); setOpen(true); void controller.load();
    };
    const notification = (event: MessageEvent) => {
      if (event.source !== navigator.serviceWorker?.controller || event.data?.type !== 'bodeeguard-open-messages') return;
      pendingMessage = typeof event.data.studentId === 'string' ? event.data.studentId : '';
      frame()?.postMessage({ type: 'bodeeguard-open-messages', studentId: event.data.studentId }, location.origin);
    };
    const visible = () => { if (!document.hidden) void controller.renew().catch(() => {}); };
    window.addEventListener('message', request);
    document.addEventListener('visibilitychange', visible);
    navigator.serviceWorker?.addEventListener('message', notification);
    visible();
    return () => { controller.dispose(); client.current = null; window.removeEventListener('message', request); document.removeEventListener('visibilitychange', visible); navigator.serviceWorker?.removeEventListener('message', notification); };
  }, [userId]);
  if (!open) return null;
  return <dialog ref={dialog} className={styles.installBackdrop} aria-labelledby="phone-notifications-title" onCancel={event => { if (state.busy) event.preventDefault(); else setOpen(false); }}>
    <section className={`${styles.installCard} ${styles.notificationCard}`}>
      <div className={styles.notificationHeading}><Bell size={26} aria-hidden="true" /><h2 id="phone-notifications-title">Message notifications</h2></div>
      <p>Get a phone alert when your child sends a message, even when BodeeGuard isn’t open. Message contents stay off your lock screen.</p>
      {state.iosInstall ? <p>Add BodeeGuard to your Home Screen, open it from that icon, then return here to enable notifications.</p> : !state.supported ? <p>This browser doesn’t support phone notifications. Open BodeeGuard in Safari on iPhone or Chrome on Android.</p> : <>
        <p className={styles.notificationStatus}>{state.enabled ? 'On for this device' : 'Off for this device'}</p>
        <div className={styles.notificationActions}>
          <button type="button" disabled={state.busy} onClick={() => void (state.enabled ? client.current?.disable() : client.current?.enable())}>
            {state.enabled ? <BellOff size={18} aria-hidden="true" /> : <Bell size={18} aria-hidden="true" />}{state.enabled ? 'Turn off' : 'Enable notifications'}
          </button>
          {state.enabled && <button type="button" disabled={state.busy} onClick={() => void client.current?.test()}><Send size={18} aria-hidden="true" />Send test notification</button>}
        </div>
      </>}
      <p role="status" aria-live="polite">{state.busy ? 'Checking notification settings…' : state.message}</p>
      <p className={styles.notificationHint}>Your phone’s Focus, silent mode and notification settings control how alerts appear.</p>
      <button type="button" disabled={state.busy} onClick={() => setOpen(false)}><X size={18} aria-hidden="true" />Close</button>
    </section>
  </dialog>;
}
