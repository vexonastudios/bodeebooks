import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, BookOpen } from "lucide-react";
import seriesData from "@/data/series.json";
import booksData from "@/data/books.json";
import BookCard from "@/components/BookCard";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return seriesData.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const series = seriesData.find((s) => s.slug === slug);
  if (!series) return {};
  return {
    title: `${series.title} Audiobooks – Bodee Books`,
    description: series.description,
  };
}

export default async function SeriesPage({ params }: PageProps) {
  const { slug } = await params;
  const series = seriesData.find((s) => s.slug === slug);
  if (!series) notFound();

  const books = booksData
    .filter((b) => b.seriesSlug === slug)
    .sort((a, b) => (a.seriesNumber ?? 0) - (b.seriesNumber ?? 0));

  return (
    <div className={styles.page}>
      <div className={`container ${styles.inner}`}>

        {/* Back */}
        <Link href="/" className={styles.back}>
          <ChevronLeft size={16} />
          All Audiobooks
        </Link>

        {/* Series header */}
        <header className={styles.header}>
          <div className={styles.headerMeta}>
            <div className={`badge badge-green ${styles.badge}`}>
              <BookOpen size={11} />
              Series
            </div>
          </div>
          <h1 className={styles.title}>{series.title}</h1>
          <p className={styles.author}>by {series.author}</p>
          <p className={styles.description}>{series.description}</p>
          <div className={styles.stats}>
            <span className={styles.statItem}>
              <strong>{books.length}</strong> audiobooks
            </span>
          </div>
        </header>

        {/* Books grid */}
        {books.length > 0 ? (
          <div className={styles.grid}>
            {books.map((book) => (
              <BookCard key={book.slug} book={book} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <p>No audiobooks listed yet — check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}
