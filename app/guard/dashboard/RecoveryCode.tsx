"use client";

import { useEffect, useState } from "react";
import type { CloudDevice } from "./cloud-api";
import { createCloudRecoveryCode } from "./actions";
import styles from "./dashboard.module.css";

export default function RecoveryCode({ device }: { device: CloudDevice }) {
  const [result, setResult] = useState<{ code?: string; revision?: number; error?: string }>({});
  const [pending, setPending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    const hide = () => { if (document.hidden) setResult({}); };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  return <details className={styles.recovery}>
    <summary>Offline parent recovery</summary>
    <p>Use a computer-specific code to recover access without internet. Your website password is never copied to the child computer.</p>
    <p>{device.recovery_configured ? "Replacing the code invalidates the old one only after this computer receives the new rules. Keep the old code until then." : "Set this up before beginning the cloud school test."}</p>
    {result.code ? <div className={styles.notice}>
      <p>Save this code privately now. It is shown only here and is hidden when you leave this tab.</p>
      <code className={styles.recoveryCode}>{result.code}</code>
      <p>{device.acknowledged_revision >= (result.revision || Infinity) ? "Received by the computer. Confirm the code in the cloud test app before starting school." : "Waiting for this computer to receive the new code. Keep any previous code until delivery is confirmed."}</p>
      <button type="button" className={styles.secondary} onClick={() => setResult({})}>Hide code</button>
    </div> : <>
      <label className={styles.checkbox}><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />I am ready to save the new recovery code privately.</label>
      <button type="button" className={styles.secondary} disabled={!confirmed || pending} onClick={async () => {
        setPending(true);
        try { setResult(await createCloudRecoveryCode(device.id)); setConfirmed(false); }
        catch { setResult({ error: "The request was interrupted. Check this computer’s recovery status before retrying." }); }
        finally { setPending(false); }
      }}>{pending ? "Creating…" : device.recovery_configured ? "Replace recovery code" : "Create recovery code"}</button>
    </>}
    {result.error && <p role="alert">{result.error}</p>}
  </details>;
}
