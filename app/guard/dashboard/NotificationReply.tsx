"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import styles from "./workspace.module.css";
export type NotificationDraft = { accountUserId: string; studentId: string; replyId: string; pendingReply: string; createdAt: number };

export default function NotificationReply({ draft, done }: { draft: NotificationDraft; done: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), pending = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [signIn, setSignIn] = useState(false);
  useEffect(() => { dialog.current?.showModal(); }, []);
  async function send() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(''); setSignIn(false);
    try {
      const response = await fetch('/guard/dashboard/notification-reply/', { method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
        signal: AbortSignal.timeout(12000), headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountUserId: draft.accountUserId, studentId: draft.studentId, id: draft.replyId, body: draft.pendingReply }) });
      const receipt = await response.json();
      if (!response.ok) { setSignIn(response.status === 401 || response.status === 409); throw Error(receipt.error || 'Sending was not confirmed. Try again.'); }
      if (receipt.saved !== true || receipt.id !== draft.replyId || receipt.studentId !== draft.studentId) throw Error('Sending was not confirmed. Retry the same reply.');
      complete();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Reconnect and retry this reply.'); }
    finally { pending.current = false; setBusy(false); }
  }
  function complete() {
    navigator.serviceWorker?.controller?.postMessage({ type: 'bodeeguard-reply-complete', accountUserId: draft.accountUserId, replyId: draft.replyId });
    done();
  }
  const target = '/dashboard/?conversation=' + draft.studentId;
  return <dialog ref={dialog} className={styles.installBackdrop} aria-labelledby="notification-reply-title" onCancel={event => { if (busy) event.preventDefault(); else done(); }}>
    <section className={[styles.installCard, styles.notificationCard].join(' ')}>
      <div className={styles.notificationHeading}><MessageCircle aria-hidden="true" /><h2 id="notification-reply-title">Review your quick reply</h2></div>
      <p>Sending was not confirmed. You can retry safely; your reply will not be sent twice. Your other message drafts stay in place.</p>
      <label className={styles.notificationLabel}>Your reply<textarea readOnly rows={5} value={draft.pendingReply} /></label>
      {error && <p role="alert">{error}</p>}
      {signIn && <a href={'/sign-in/?redirect_url=' + encodeURIComponent(target)}>Sign in to continue</a>}
      <div className={styles.notificationActions}>
        <button type="button" disabled={busy || draft.pendingReply.length > 2000} onClick={() => void send()}><Send size={18} />{busy ? 'Sending…' : 'Retry reply'}</button>
        <button type="button" disabled={busy} onClick={done}><X size={18} />Keep for later</button>
        <button type="button" disabled={busy} onClick={() => { if (window.confirm('Dismiss this saved reply? If an earlier send reached the server, it will remain in Messages.')) complete(); }}>Discard reply</button>
      </div>
      {draft.pendingReply.length > 2000 && <p>This reply exceeds 2,000 characters. Copy the text into Messages to shorten it before sending.</p>}
    </section>
  </dialog>;
}
