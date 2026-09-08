"use client";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { CloudDevice } from "./cloud-api";
import { createCloudRecoveryCode } from "./actions";
import styles from "./dashboard.module.css";

export default function RecoveryCode({ device }: { device: CloudDevice }) {
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const hide = () => { if (document.hidden) setPassword(""); };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  return <details className={styles.recovery}>
    <summary>Parent password</summary>
    <p>Choose a password only parents know. Use it to unlock or exit BodeeGuard, even without internet.</p>
    {device.recovery_configured && <p>Your current password works until the child app confirms the new one.</p>}
    <form onSubmit={async event => {
      event.preventDefault(); setPending(true); setMessage("");
      try { const result = await createCloudRecoveryCode(device.id, password); setMessage(result.error || "Password saved. Type it in the child app and choose Confirm password."); }
      catch { setMessage("Could not save the password. Try again."); }
      finally { setPassword(""); setPending(false); }
    }}>
      <label>Parent password<input type="text" autoComplete="off" spellCheck={false} value={password} onChange={event => setPassword(event.target.value)} minLength={6} maxLength={64} placeholder="At least 6 characters" required /></label>
      <button type="submit" className={styles.secondary} disabled={pending}><ShieldCheck size={16} /> {pending ? "Saving…" : "Save parent password"}</button>
    </form>
    <p role="status">{message}</p>
  </details>;
}
