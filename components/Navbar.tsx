"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Menu, X, Gamepad2, Activity, ShieldCheck } from "lucide-react";
import { useState } from "react";
import styles from "./Navbar.module.css";

const links = [
  { href: "/books", label: "Books", icon: BookOpen },
  { href: "https://games.bodeebooks.com/", label: "Games", icon: Gamepad2 },
  { href: "https://fit.bodeebooks.com/", label: "Fitness", icon: Activity },
  { href: "/guard", label: "BodeeGuard", icon: ShieldCheck },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (href: string) => href === "/books"
    ? ["/books", "/listen/", "/series/"].some((path) => pathname.startsWith(path))
    : pathname.startsWith(href);

  return (
    <nav className={styles.nav} data-public-site-header aria-label="Main navigation">
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo}>
          <BookOpen size={22} strokeWidth={2} className={styles.logoIcon} />
          <span className={styles.logoText}>
            Bodee<span className={styles.logoAccent}>Books</span>
            <span className={styles.logoTagline}>For your homeschool family</span>
          </span>
        </Link>

        <ul className={styles.links}>
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className={`${styles.link} ${isActive(href) ? styles.active : ""}`} aria-current={isActive(href) ? "page" : undefined}>
                <Icon size={15} strokeWidth={2} />{label}
              </Link>
            </li>
          ))}
        </ul>

        <button className={styles.mobileToggle} onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} aria-controls="mobile-navigation">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div id="mobile-navigation" className={styles.mobileMenu}>
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`${styles.mobileLink} ${isActive(href) ? styles.mobileActive : ""}`} aria-current={isActive(href) ? "page" : undefined} onClick={() => setMobileOpen(false)}>
              <Icon size={16} />{label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
