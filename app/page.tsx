import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Gamepad2, Activity, ShieldCheck } from "lucide-react";
import SeriesShelf from "@/components/SeriesShelf";
import { newestBooks } from "@/data/newest-books";
import styles from "./page.module.css";

const description = "Free audiobooks, printed classics, educational games, homeschool fitness, and BodeeGuard to help children stay focused.";

export const metadata: Metadata = {
  title: { absolute: "BodeeBooks — Books and tools for your homeschool family" },
  description,
  alternates: { canonical: "https://www.bodeebooks.com/" },
  openGraph: {
    title: "BodeeBooks — Books and tools for your homeschool family",
    description,
    url: "https://www.bodeebooks.com/",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "BodeeBooks — Books and tools for your homeschool family", description },
};

export default function HomePage() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className="container">
          <div className={styles.intro}>
            <p className={styles.eyebrow}>Welcome to BodeeBooks</p>
            <h1 id="home-title">Books and tools for<br /><span>your homeschool family.</span></h1>
            <p className={styles.description}>{description}</p>
          </div>

          <div className={styles.destinations}>
            <Link href="/books" className={styles.destination}>
              <div className={`${styles.art} ${styles.bookArt}`}>
                <Image src="/home/hardy-boys.jpg" alt="The Hardy Boys: The Tower Treasure" width={320} height={180} className={styles.firstBook} preload />
                <Image src="/home/first-stop-honolulu.jpg" alt="Ted Scott: First Stop Honolulu" width={320} height={180} className={styles.secondBook} />
                <span className={styles.artLabel}><BookOpen size={13} /> Listen free. Read in print.</span>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.cardLabel}>The book library</p>
                <h2>Audiobooks &amp; printed books</h2>
                <p className={styles.cardDescription}>Classic stories brought to life with multiple voices, plus books to enjoy in print.</p>
                <span className={styles.cardAction}>Browse books <ArrowRight size={17} /></span>
              </div>
            </Link>

            <a href="https://games.bodeebooks.com/" className={styles.destination}>
              <div className={`${styles.art} ${styles.gamesArt}`}>
                <Image src="/home/games.webp" alt="Sailing ships in the Broadside Bay game" fill sizes="(max-width: 1000px) 50vw, 300px" className={styles.coverImage} />
                <span className={styles.artLabel}><Gamepad2 size={14} /> A little adventure awaits</span>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.cardLabel}>Games Hub</p>
                <h2>Educational games</h2>
                <p className={styles.cardDescription}>Spelling, strategy, racing, and adventures for curious minds and family fun.</p>
                <span className={styles.cardAction}>Find a game <ArrowRight size={17} /></span>
              </div>
            </a>

            <a href="https://fit.bodeebooks.com/" className={styles.destination}>
              <div className={`${styles.art} ${styles.fitnessArt}`}>
                <Image src="/home/homeschool-fitness.webp" alt="Two children stretching outdoors" fill sizes="(max-width: 1000px) 50vw, 300px" className={styles.coverImage} />
                <span className={styles.artLabel}><Activity size={14} /> Make movement part of the day</span>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.cardLabel}>BodeeFit</p>
                <h2>Homeschool fitness</h2>
                <p className={styles.cardDescription}>Guided routines and movement games that make homeschool P.E. easy to include.</p>
                <span className={styles.cardAction}>Get moving <ArrowRight size={17} /></span>
              </div>
            </a>

            <Link href="/guard" className={styles.destination}>
              <div className={`${styles.art} ${styles.guardArt}`}>
                <div className={styles.guardScreen}>
                  <Image src="/guard-tour/parent.webp" alt="BodeeGuard parent dashboard" width={2000} height={993} sizes="(max-width: 1000px) 50vw, 300px" />
                </div>
                <Image src="/guard-icons/bodeeguard-parent-192.png" alt="" width={48} height={48} className={styles.guardIcon} />
                <span className={styles.artLabel}><ShieldCheck size={14} /> Help learning stay on track</span>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.cardLabel}>A focused school day</p>
                <h2>BodeeGuard</h2>
                <p className={styles.cardDescription}>A bodyguard against distractions. Choose what opens on your children’s computers and stay connected.</p>
                <span className={styles.cardAction}>Meet BodeeGuard <ArrowRight size={17} /></span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <div id="audiobooks" className={`container ${styles.latest}`}>
        <SeriesShelf title="Newest Audiobooks" books={newestBooks} href="/books" linkLabel="Browse all books" />
      </div>
    </>
  );
}
