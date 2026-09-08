"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Laptop } from "lucide-react";
import styles from "../portal.module.css";

export default function ChildSetup({ initiallyCollapsed, children }: { initiallyCollapsed: boolean; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);
  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try { document.cookie = `bg_child_setup_collapsed=${next ? "1" : "0"}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`; } catch { /* The toggle still works when cookies are blocked. */ }
  }
  return <section className={`${styles.setupSection} ${styles.childSetup}`} aria-labelledby="child-setup-heading">
    <div className={styles.childSetupHeading}>
      <div><span className={styles.kicker}><Laptop size={15} /> Child app & setup</span><h2 id="child-setup-heading">Connect a child computer</h2></div>
      <button type="button" onClick={toggle} aria-expanded={!collapsed} aria-controls="child-setup-content" className={styles.setupToggle}>
        {collapsed ? "Show setup" : "Hide setup"}<ChevronDown size={18} aria-hidden="true" style={{ transform: collapsed ? undefined : "rotate(180deg)" }} />
      </button>
    </div>
    <div id="child-setup-content" hidden={collapsed}>{children}</div>
  </section>;
}
