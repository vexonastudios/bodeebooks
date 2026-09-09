"use client";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { RotateCw } from "lucide-react";

export default function AccountRetry({ className }: { className?: string }) {
  const { getToken } = useAuth();
  const [busy, setBusy] = useState(false);
  async function retry() {
    if (busy) return;
    setBusy(true);
    // Refresh Clerk's cookie before making a real page request. A Link to
    // this same route can otherwise reuse the failed server-rendered page.
    try { await Promise.race([getToken({ skipCache: true }), new Promise(resolve => setTimeout(resolve, 5000))]); }
    catch { /* The full navigation can recover a failed session request. */ }
    window.location.reload();
  }
  return <button className={className} onClick={retry} disabled={busy} aria-live="polite"><RotateCw size={19} />{busy ? "Reconnecting…" : "Try again"}</button>;
}
