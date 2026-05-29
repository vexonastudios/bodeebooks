"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Wrench, ExternalLink, Menu, X } from "lucide-react";
import { useState } from "react";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "/", label: "Audiobooks", icon: BookOpen },
    { href: "/tools/grep-indesign", label: "Tools", icon: Wrench },
  ];

  return (
    <nav className={styles.nav}>
      <div className={`container ${styles.inner}`}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <BookOpen size={22} strokeWidth={2} className={styles.logoIcon} />
          <span className={styles.logoText}>
            Bodee<span className={styles.logoAccent}>Books</span>
            <span className={styles.logoTagline}>Free Multi-voice Audiobooks</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <ul className={styles.links}>
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={`${styles.link} ${pathname === href ? styles.active : ""}`}
              >
                <Icon size={15} strokeWidth={2} />
                {label}
              </Link>
            </li>
          ))}
          <li>
            <a
              href="https://www.youtube.com/@bodeebooks"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ytLink}
            >
              <ExternalLink size={14} strokeWidth={2} />
              YouTube
            </a>
          </li>
        </ul>

        {/* Mobile toggle */}
        <button
          className={styles.mobileToggle}
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className={styles.mobileMenu}>
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.mobileLink} ${pathname === href ? styles.mobileActive : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
          <a
            href="https://www.youtube.com/@bodeebooks"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.mobileLink}
            onClick={() => setMobileOpen(false)}
          >
            <ExternalLink size={16} />
            YouTube Channel
          </a>
        </div>
      )}
    </nav>
  );
}
