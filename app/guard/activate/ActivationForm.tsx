"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Link2, LoaderCircle } from "lucide-react";
import { approveComputer, type ActivationState } from "../actions";
import styles from "../portal.module.css";

const initialState: ActivationState = { status: "idle", message: "" };

export default function ActivationForm({ initialCode = "" }: { initialCode?: string }) {
  const [state, action, pending] = useActionState(approveComputer, initialState);
  const [code, setCode] = useState(initialCode);
  return (
    <form action={action} className={styles.activationForm}>
      <label htmlFor="userCode">Pairing code shown on the child’s computer</label>
      <input id="userCode" name="userCode" value={code} onChange={event => setCode(event.target.value.toUpperCase())} placeholder="e.g. ABCD-EFGH" aria-describedby="pairing-help" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={20} disabled={pending || state.status === "success"} required />
      <p id="pairing-help" className={styles.pairingHelp}>If the code has expired, get a new pairing code in BodeeGuard on the child’s computer.</p>
      <button className={styles.portalButton} type="submit" disabled={pending || !code.trim() || state.status === "success"}>
        {pending ? <LoaderCircle className={styles.spin} size={17} /> : <Link2 size={17} />}
        {pending ? "Approving…" : state.status === "success" ? "Child computer approved" : "Approve child computer"}
      </button>
      {state.message && <p className={state.status === "success" ? styles.successMessage : styles.errorMessage} role="status">{state.status === "success" && <CheckCircle2 size={17} />}{state.message}</p>}
      {state.status === "success" && <Link className={styles.portalButton} href="/guard/dashboard/?setup=connect">Assign child & check readiness →</Link>}
    </form>
  );
}
