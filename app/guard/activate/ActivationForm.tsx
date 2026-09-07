"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardPaste, Link2, LoaderCircle } from "lucide-react";
import { approveComputer, type ActivationState } from "../actions";
import styles from "../portal.module.css";

const initialState: ActivationState = { status: "idle", message: "" };

export default function ActivationForm({ initialCode = "" }: { initialCode?: string }) {
  const [state, action, pending] = useActionState(approveComputer, initialState);
  const [code, setCode] = useState(initialCode);
  const [pasteMessage, setPasteMessage] = useState("");
  async function pasteCode() {
    try {
      const pasted = (await navigator.clipboard.readText()).trim().toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9-]{3,19}$/.test(pasted)) { setPasteMessage("Copy the short pairing code from the child app, then try again."); return; }
      setCode(pasted); setPasteMessage("Code pasted. Check it matches the child app, then approve below.");
    } catch { setPasteMessage("Your browser could not paste automatically. Select the code field and use Paste, or type the code."); }
  }
  return (
    <form action={action} className={styles.activationForm}>
      <label htmlFor="userCode">Pairing code</label>
      <div className={styles.pairingInputRow}><input id="userCode" name="userCode" value={code} onChange={event => setCode(event.target.value.toUpperCase())} placeholder="e.g. ABCD-EFGH" aria-describedby="pairing-help" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={20} disabled={pending || state.status === "success"} required /><button className={styles.pasteCodeButton} type="button" onClick={pasteCode} disabled={pending || state.status === "success"}><ClipboardPaste size={17} /> Paste code</button></div>
      <p id="pairing-help" className={styles.pairingHelp}>This field is empty until you paste or type your code. If it expires, get a new one in the child app.</p>
      {pasteMessage && <p className={styles.pairingHelp} role="status">{pasteMessage}</p>}
      <button className={styles.portalButton} type="submit" disabled={pending || !code.trim() || state.status === "success"}>
        {pending ? <LoaderCircle className={styles.spin} size={17} /> : <Link2 size={17} />}
        {pending ? "Approving…" : state.status === "success" ? "Child computer approved" : "Approve child computer"}
      </button>
      {state.message && <p className={state.status === "success" ? styles.successMessage : styles.errorMessage} role="status">{state.status === "success" && <CheckCircle2 size={17} />}{state.message}</p>}
      {state.status === "success" && <Link className={styles.portalButton} href="/guard/dashboard/">Open family dashboard →</Link>}
    </form>
  );
}
