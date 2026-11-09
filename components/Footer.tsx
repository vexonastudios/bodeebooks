import Link from "next/link";
import { BookOpen, ExternalLink, Wrench, MessageSquarePlus } from "lucide-react";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <Link href="/" className={styles.logo}><BookOpen size={18} strokeWidth={2} /><span>BodeeBooks</span></Link>
          <p className={styles.tagline}>Books and tools for<br />your homeschool family.</p>
        </div>
        <div className={styles.links}>
          <div className={styles.linkGroup}>
            <h4 className={styles.linkHeading}>Explore</h4>
            <Link href="/books" className={styles.link}>Audiobooks &amp; printed books</Link>
            <a href="https://games.bodeebooks.com/" className={styles.link}>Games Hub</a>
            <a href="https://fit.bodeebooks.com/" className={styles.link}>Homeschool fitness</a>
            <Link href="/guard" className={styles.link}>BodeeGuard</Link>
          </div>
          <div className={styles.linkGroup}>
            <h4 className={styles.linkHeading}>More from BodeeBooks</h4>
            <Link href="/feedback" className={styles.link}><MessageSquarePlus size={13} />Feedback</Link>
            <a href="https://www.youtube.com/@bodeebooks" target="_blank" rel="noopener noreferrer" className={styles.link}><ExternalLink size={13} />YouTube Channel</a>
            <Link href="/tools/grep-indesign" className={styles.link}><Wrench size={13} />GREP &amp; InDesign</Link>
          </div>
        </div>
      </div>
      <div className={styles.bottom}><span>© {new Date().getFullYear()} Bodee Books.</span></div>
    </footer>
  );
}
