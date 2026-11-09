import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Gamepad2, Activity, ShieldCheck } from "lucide-react";
import SeriesShelf from "@/components/SeriesShelf";
import { newestBooks } from "@/data/newest-books";
import styles from "./page.module.css";

const description = "Free audiobooks and printed classics, BodeeGuard homeschool software, fitness, and family games.";

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
            <Link href="/books" className={`${styles.destination} ${styles.booksBanner}`}>
              <div className={`${styles.art} ${styles.bookArt}`}>
                <Image src="/home/hardy-boys.jpg" alt="The Hardy Boys: The Tower Treasure" width={768} height={432} className={styles.firstBook} preload />
                <Image src="/home/first-stop-honolulu.jpg" alt="Ted Scott: First Stop Honolulu" width={768} height={432} className={styles.secondBook} />
              </div>
              <div className={styles.bannerBody}>
                <p className={styles.bannerLabel}><BookOpen size={15} aria-hidden="true" /> The book library</p>
                <h2>Audiobooks &amp;<br />printed books</h2>
                <p className={styles.bannerDescription}>Classic stories to listen to freely and enjoy in print.</p>
                <span className={styles.bannerAction}>Browse books <ArrowRight size={17} /></span>
              </div>
            </Link>

            <Link href="/guard" className={`${styles.destination} ${styles.guardBanner}`}>
              <div className={`${styles.art} ${styles.guardArt}`}>
                <div className={styles.guardScreen}>
                  <Image src="/guard-tour/parent.webp" alt="BodeeGuard parent dashboard" width={2000} height={993} sizes="(max-width: 700px) 70vw, 430px" />
                </div>
                <Image src="/guard-icons/bodeeguard-parent-192.png" alt="" width={56} height={56} className={styles.guardIcon} />
              </div>
              <div className={styles.bannerBody}>
                <p className={styles.bannerLabel}><ShieldCheck size={15} aria-hidden="true" /> Homeschool software</p>
                <h2>BodeeGuard</h2>
                <p className={styles.bannerDescription}>Lessons, daily plans, and parent controls together in one Windows workspace.</p>
                <span className={styles.bannerAction}>Explore BodeeGuard <ArrowRight size={17} /></span>
              </div>
            </Link>

            <a href="https://fit.bodeebooks.com/" className={`${styles.destination} ${styles.fitnessBanner}`}>
              <div className={styles.art}>
                <Image src="/home/homeschool-fitness.webp" alt="Two children stretching outdoors" fill sizes="(max-width: 700px) 70vw, 430px" className={styles.coverImage} />
              </div>
              <div className={styles.bannerBody}>
                <p className={styles.bannerLabel}><Activity size={15} aria-hidden="true" /> BodeeFit</p>
                <h2>Homeschool fitness</h2>
                <p className={styles.bannerDescription}>Guided routines and movement games for your homeschool P.E.</p>
                <span className={styles.bannerAction}>Get moving <ArrowRight size={17} /></span>
              </div>
            </a>

            <a href="https://games.bodeebooks.com/" className={`${styles.destination} ${styles.gamesBanner}`}>
              <div className={styles.art}>
                <Image src="/home/games.webp" alt="Sailing ships in the Broadside Bay game" fill sizes="(max-width: 700px) 70vw, 430px" className={styles.coverImage} />
              </div>
              <div className={styles.bannerBody}>
                <p className={styles.bannerLabel}><Gamepad2 size={16} aria-hidden="true" /> Games Hub</p>
                <h2>Family games</h2>
                <p className={styles.bannerDescription}>Racing, strategy, and adventures for a little family fun.</p>
                <span className={styles.bannerAction}>Find a game <ArrowRight size={17} /></span>
              </div>
            </a>
          </div>
        </div>
      </section>

      <div id="audiobooks" className={`container ${styles.latest}`}>
        <SeriesShelf title="Newest Audiobooks" books={newestBooks} href="/books" linkLabel="Browse all books" />
      </div>
    </>
  );
}
