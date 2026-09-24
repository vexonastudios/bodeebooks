"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { fetchParentRelease, watchParentRelease } from "./parentRelease";
import styles from "./workspace.module.css";

export default function ParentUpdate() {
  const [available, setAvailable] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const updating = useRef(false);
  const loadedRelease = process.env.NEXT_PUBLIC_GUARD_RELEASE;
  useEffect(() => {
    if (loadedRelease && loadedRelease !== "local") return watchParentRelease(loadedRelease, setAvailable);
  }, [loadedRelease]);

  async function update() {
    if (updating.current || !window.confirm("Update BodeeGuard now? Save your changes first. This reloads the parent dashboard, and unsaved edits will be lost.")) return;
    updating.current = true; setBusy(true); setNotice("");
    try {
      // Check connectivity before leaving the working dashboard. No storage or
      // cookies are cleared; existing beforeunload draft warnings still apply.
      await fetchParentRelease();
      window.location.reload();
    } catch { setNotice("Could not connect. Your dashboard is still open. Reconnect and try Update again."); }
    finally { updating.current = false; setBusy(false); }
  }
  if (!available) return null;
  return <aside className={styles.updateBanner} aria-label="BodeeGuard update">
    <RefreshCw size={20} aria-hidden="true" />
    <div role="status"><strong>Update available</strong><span>{notice || "Save your changes, then update to the latest dashboard."}</span></div>
    <button type="button" disabled={busy} onClick={() => void update()}>{busy ? "Connecting…" : "Update"}</button>
  </aside>;
}
