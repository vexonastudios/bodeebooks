import Link from "next/link";
import { BookOpen, YoutubeIcon, Wrench } from "lucide-react";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <Link href="/" className={styles.logo}>
            <BookOpen size={18} strokeWidth={2} />
            <span>BodeeBooks</span>
          </Link>
          <p className={styles.tagline}>
            Classic Reprints, Free Audiobooks,<br />and the Tools to Craft Your Own
          </p>
        </div>

        <div className={styles.links}>
          <div className={styles.linkGroup}>
            <h4 className={styles.linkHeading}>Explore</h4>
            <Link href="/" className={styles.link}>Audiobooks</Link>
            <Link href="/series/hardy-boys" className={styles.link}>Hardy Boys</Link>
            <Link href="/series/ted-scott-flying-stories" className={styles.link}>Ted Scott</Link>
            <Link href="/series/penny-parker" className={styles.link}>Penny Parker</Link>
          </div>

          <div className={styles.linkGroup}>
            <h4 className={styles.linkHeading}>Tools</h4>
            <Link href="/tools/grep-indesign" className={styles.link}>
              <Wrench size={13} />
              GREP &amp; InDesign
            </Link>
            <a
              href="https://www.youtube.com/@bodeebooks"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              <YoutubeIcon size={13} />
              YouTube Channel
            </a>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <span>© {new Date().getFullYear()} Bodee Books. Classic literature, freely shared.</span>
      </div>
    </footer>
  );
}
