"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, Laptop } from "lucide-react";
import styles from "../portal.module.css";
import accountStyles from "./account.module.css";

export default function ChildSetup({ initiallyCollapsed, highlightDownload = false, children }: { initiallyCollapsed: boolean; highlightDownload?: boolean; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);
  const [firstVisit, setFirstVisit] = useState(false);
  useEffect(() => {
    if (!highlightDownload) return;
    try {
      if (localStorage.getItem("bg-child-download-seen-v1")) return;
    } catch { /* Setup still opens when storage is unavailable. */ }
    const frame = requestAnimationFrame(() => {
      try { localStorage.setItem("bg-child-download-seen-v1", "1"); } catch { /* Optional visit memory. */ }
      setFirstVisit(true);
      setCollapsed(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [highlightDownload]);
  return <details id="child-setup" className={`${accountStyles.section} ${firstVisit ? styles.firstDownloadVisit : ""}`} open={!collapsed} onToggle={event => {
    const next = !event.currentTarget.open;
    if (next === collapsed) return;
    setCollapsed(next);
    try { document.cookie = `bg_child_setup_collapsed=${next ? "1" : "0"}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`; } catch { /* Disclosure works without cookies. */ }
  }} onClick={event => {
    if ((event.target as Element).closest('a[href="/guard/download/windows"]')) setFirstVisit(false);
  }}>
    <summary className={accountStyles.sectionSummary}>
      <span className={accountStyles.sectionIcon}><Laptop size={20} /></span>
      <span className={accountStyles.sectionLabel}><strong id="child-setup-heading">Child app & setup</strong><small>Install or connect a Windows computer</small></span>
      <ChevronDown className={accountStyles.chevron} size={18} aria-hidden="true" />
    </summary>
    <div className={accountStyles.panelBody}>{children}</div>
  </details>;
}
