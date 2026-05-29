"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, BookOpen, User, List } from "lucide-react";
import YoutubePlayer, { type YoutubePlayerHandle } from "@/components/YoutubePlayer";
import ChapterList from "@/components/ChapterList";
import styles from "./ListenClient.module.css";

interface Chapter {
  title: string;
  timestamp: number;
}

interface Book {
  slug: string;
  title: string;
  author: string;
  seriesSlug: string | null;
  seriesTitle: string | null;
  seriesNumber: number | null;
  youtubeVideoId: string;
  description: string;
  chapters: Chapter[];
}

interface ListenClientProps {
  book: Book;
  prevBook: Book | null;
  nextBook: Book | null;
}

export default function ListenClient({ book, prevBook, nextBook }: ListenClientProps) {
  const playerRef = useRef<YoutubePlayerHandle>(null);
  const [activeChapter, setActiveChapter] = useState(-1);
  const [playerReady, setPlayerReady] = useState(false);

  const handlePlayerReady = useCallback(() => setPlayerReady(true), []);

  const handleChapterClick = useCallback((index: number) => {
    setActiveChapter(index);
  }, []);

  return (
    <div className={styles.page}>
      <div className={`container ${styles.inner}`}>

        {/* Breadcrumb */}
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/" className={styles.breadLink}>Audiobooks</Link>
          {book.seriesSlug && book.seriesTitle && (
            <>
              <ChevronRight size={14} className={styles.breadSep} />
              <Link href={`/series/${book.seriesSlug}`} className={styles.breadLink}>
                {book.seriesTitle}
              </Link>
            </>
          )}
          <ChevronRight size={14} className={styles.breadSep} />
          <span className={styles.breadCurrent}>{book.title}</span>
        </nav>

        {/* Structured Data (JSON-LD) for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "AudioObject",
              name: book.title,
              description: book.description,
              creator: {
                "@type": "Person",
                name: book.author,
              },
              url: `https://bodeebooks.com/listen/${book.slug}/`,
              embedUrl: `https://www.youtube.com/embed/${book.youtubeVideoId}`,
              thumbnailUrl: `https://img.youtube.com/vi/${book.youtubeVideoId}/maxresdefault.jpg`,
              inLanguage: "en",
              isAccessibleForFree: true,
              partOfSeries: book.seriesTitle
                ? {
                    "@type": "CreativeWorkSeries",
                    name: book.seriesTitle,
                  }
                : undefined,
            }),
          }}
        />

        {/* Main layout */}
        <div className={styles.layout}>

          {/* Left: Player + meta */}
          <div className={styles.main}>
            {/* Book meta above player */}
            <div className={styles.bookMeta}>
              {book.seriesTitle && book.seriesNumber && (
                <span className={styles.seriesLabel}>
                  {book.seriesTitle} · Book {book.seriesNumber}
                </span>
              )}
              <h1 className={styles.bookTitle}>{book.title}</h1>
              <div className={styles.bookAuthor}>
                <User size={14} />
                {book.author}
              </div>
            </div>

            {/* Player */}
            <YoutubePlayer
              ref={playerRef}
              videoId={book.youtubeVideoId}
              onReady={handlePlayerReady}
            />

            {/* Description */}
            <div className={styles.description}>
              <div className={styles.descHeader}>
                <BookOpen size={15} />
                <span>About this book</span>
              </div>
              <p>{book.description}</p>
            </div>

            {/* Episode navigation */}
            <div className={styles.episodeNav}>
              {prevBook ? (
                <Link href={`/listen/${prevBook.slug}`} className={styles.navBtn}>
                  <ChevronLeft size={16} />
                  <div className={styles.navBtnText}>
                    <span className={styles.navBtnLabel}>Previous</span>
                    <span className={styles.navBtnTitle}>{prevBook.title}</span>
                  </div>
                </Link>
              ) : <div />}

              {nextBook && (
                <Link href={`/listen/${nextBook.slug}`} className={`${styles.navBtn} ${styles.navBtnRight}`}>
                  <div className={styles.navBtnText}>
                    <span className={styles.navBtnLabel}>Next</span>
                    <span className={styles.navBtnTitle}>{nextBook.title}</span>
                  </div>
                  <ChevronRight size={16} />
                </Link>
              )}
            </div>
          </div>

          {/* Right: Chapter list */}
          {book.chapters && book.chapters.length > 0 && (
            <aside className={styles.sidebar}>
              <ChapterList
                chapters={book.chapters}
                playerRef={playerRef}
                activeIndex={activeChapter}
                onChapterClick={handleChapterClick}
              />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
