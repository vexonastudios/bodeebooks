import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import BookCard from "./BookCard";
import styles from "./SeriesShelf.module.css";

interface Book {
  slug: string;
  title: string;
  author: string;
  seriesSlug: string | null;
  seriesTitle: string | null;
  seriesNumber: number | null;
  youtubeVideoId: string;
  chapters: { title: string; timestamp: number }[];
}

interface SeriesShelfProps {
  title: string;
  seriesSlug?: string;
  books: Book[];
}

export default function SeriesShelf({ title, seriesSlug, books }: SeriesShelfProps) {
  if (books.length === 0) return null;

  return (
    <section className={styles.shelf}>
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        {seriesSlug && (
          <Link href={`/series/${seriesSlug}`} className={`section-link ${styles.viewAll}`}>
            View all <ChevronRight size={14} />
          </Link>
        )}
      </div>

      <div className={styles.grid}>
        {books.map((book) => (
          <BookCard key={book.slug} book={book} />
        ))}
      </div>
    </section>
  );
}
