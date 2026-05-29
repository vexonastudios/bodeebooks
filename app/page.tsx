import type { Metadata } from "next";
import { BookOpen, Headphones, ExternalLink } from "lucide-react";
import SeriesShelf from "@/components/SeriesShelf";
import seriesData from "@/data/series.json";
import booksData from "@/data/books.json";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Bodee Books – Free Classic Audiobooks",
  description:
    "Listen to free classic audiobooks — Hardy Boys, Ted Scott Flying Stories, Penny Parker, Mercer Boys, and more. All embedded right here, no app needed.",
};

type Book = (typeof booksData)[number];

function getBooksForSeries(seriesSlug: string): Book[] {
  return booksData.filter((b) => b.seriesSlug === seriesSlug);
}

function getStandaloneBooks(): Book[] {
  return booksData.filter((b) => b.seriesSlug === null);
}

export default function HomePage() {
  const featuredSeries = seriesData.filter((s) => s.featured);
  const allSeries = seriesData.filter((s) => !s.featured);
  const standaloneBooks = getStandaloneBooks();

  return (
    <>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroContent}>
            <div className={styles.heroLabel}>
              <Headphones size={14} />
              Free Audiobooks
            </div>
            <h1 className={styles.heroTitle}>
              Classic Stories,<br />
              <span className={styles.heroAccent}>Free to Listen</span>
            </h1>
            <p className={styles.heroDesc}>
              Explore beloved series — Hardy Boys, Ted Scott, Penny Parker, and more.
              Stream every audiobook directly in your browser, powered by YouTube.
            </p>
            <div className={styles.heroActions}>
              <a href="#audiobooks" className={styles.heroCta}>
                <BookOpen size={16} />
                Browse Audiobooks
              </a>
              <a
                href="https://www.youtube.com/@bodeebooks"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.heroYt}
              >
                <ExternalLink size={16} />
                YouTube Channel
              </a>
            </div>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <span className={styles.statNum}>{seriesData.length}</span>
              <span className={styles.statLabel}>Series</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>{booksData.length}+</span>
              <span className={styles.statLabel}>Audiobooks</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>Free</span>
              <span className={styles.statLabel}>Always</span>
            </div>
          </div>
        </div>
      </section>

      {/* Audiobook Shelves */}
      <div id="audiobooks" className={`container ${styles.content}`}>

        {/* Featured series */}
        {featuredSeries.map((series) => {
          const books = getBooksForSeries(series.slug);
          if (books.length === 0) return null;
          return (
            <SeriesShelf
              key={series.slug}
              title={series.title}
              seriesSlug={series.slug}
              books={books}
            />
          );
        })}

        {/* Other series */}
        {allSeries.map((series) => {
          const books = getBooksForSeries(series.slug);
          if (books.length === 0) return null;
          return (
            <SeriesShelf
              key={series.slug}
              title={series.title}
              seriesSlug={series.slug}
              books={books}
            />
          );
        })}

        {/* Standalone books */}
        {standaloneBooks.length > 0 && (
          <SeriesShelf
            title="Classic Single Titles"
            books={standaloneBooks}
          />
        )}
      </div>
    </>
  );
}
