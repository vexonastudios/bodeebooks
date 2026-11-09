import type { Metadata } from "next";
import Image from "next/image";
import { BookOpen, ExternalLink, Headphones } from "lucide-react";
import SeriesShelf from "@/components/SeriesShelf";
import booksData from "@/data/books.json";
import seriesData from "@/data/series.json";
import { newestBooks } from "@/data/newest-books";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Free Audiobooks & Printed Books",
  description: "Listen free to multi-voice classic audiobooks, browse your favorite series, and discover available printed editions from BodeeBooks.",
  alternates: { canonical: "https://www.bodeebooks.com/books/" },
};

export default function BooksPage() {
  const printedBooks = booksData.filter((book) => book.paperbackUrl);
  const sortedSeries = [...seriesData.filter((series) => series.featured), ...seriesData.filter((series) => !series.featured)];

  return (
    <>
      <header className={styles.header}>
        <div className="container">
          <p className={styles.eyebrow}>The BodeeBooks library</p>
          <h1>Audiobooks &amp; printed books.</h1>
          <p className={styles.description}>Enjoy classic stories brought to life with multiple voices, free to listen. Find your next adventure on screen or in print.</p>
          <div className={styles.formats}>
            <a href="#audiobooks"><Headphones size={16} /> Free audiobooks</a>
            <a href="#printed-books"><BookOpen size={16} /> Printed books</a>
          </div>
        </div>
      </header>

      <div className={`container ${styles.content}`}>
        <section id="printed-books" className={styles.printed} aria-labelledby="printed-title">
          <div className="section-header"><h2 id="printed-title" className="section-title">Also available in print</h2></div>
          {printedBooks.map((book) => (
            <article key={book.slug} className={styles.printedBook}>
              <Image src={`https://img.youtube.com/vi/${book.youtubeVideoId}/mqdefault.jpg`} alt={book.title} width={320} height={180} unoptimized />
              <div>
                <p className={styles.eyebrow}>Paperback</p>
                <h3>{book.title}</h3>
                <p className={styles.author}>{book.author}</p>
                <a href={book.paperbackUrl} target="_blank" rel="noopener noreferrer" className={styles.amazonLink}>View printed book on Amazon <ExternalLink size={14} /></a>
              </div>
            </article>
          ))}
        </section>

        <div id="audiobooks" className={styles.audiobooks}>
          <SeriesShelf title="Newest Audiobooks" books={newestBooks} />
          {sortedSeries.map((series) => (
            <SeriesShelf key={series.slug} title={series.title} seriesSlug={series.slug} books={booksData.filter((book) => book.seriesSlug === series.slug)} />
          ))}
          <SeriesShelf title="Classic Single Titles" books={booksData.filter((book) => book.seriesSlug === null)} />
        </div>
      </div>
    </>
  );
}
