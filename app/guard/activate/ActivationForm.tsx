"use client";

import { useActionState } from "react";
import { CheckCircle2, Link2, LoaderCircle } from "lucide-react";
import { approveComputer, type ActivationState } from "../actions";
import styles from "../portal.module.css";

const initialState: ActivationState = { status: "idle", message: "" };

export default function ActivationForm({ initialCode = "" }: { initialCode?: string }) {
  const [state, action, pending] = useActionState(approveComputer, initialState);
  return (
    <form action={action} className={styles.activationForm}>
      <label htmlFor="userCode">Pairing code</label>
      <input id="userCode" name="userCode" defaultValue={initialCode} placeholder="ABCD-EFGH" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={20} required />
      <button className={styles.portalButton} type="submit" disabled={pending}>
        {pending ? <LoaderCircle className={styles.spin} size={17} /> : <Link2 size={17} />}
        {pending ? "Approving…" : "Approve this computer"}
      </button>
      {state.message && <p className={state.status === "success" ? styles.successMessage : styles.errorMessage} role="status">{state.status === "success" && <CheckCircle2 size={17} />}{state.message}</p>}
    </form>
  );
}
