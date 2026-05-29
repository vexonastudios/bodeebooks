import Link from "next/link";
import Image from "next/image";
import { Play, BookOpen } from "lucide-react";
import styles from "./BookCard.module.css";

interface Book {
  slug: string;
  title: string;
  author: string;
  seriesTitle?: string | null;
  seriesNumber?: number | null;
  youtubeVideoId: string;
  chapters?: { title: string; timestamp: number }[];
}

export default function BookCard({ book }: { book: Book }) {
  const thumbUrl = `https://img.youtube.com/vi/${book.youtubeVideoId}/mqdefault.jpg`;
  const chapterCount = book.chapters?.length ?? 0;

  return (
    <Link href={`/listen/${book.slug}`} className={styles.card}>
      <div className={styles.thumb}>
        <Image
          src={thumbUrl}
          alt={book.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className={styles.thumbImg}
          unoptimized
        />
        <div className={styles.playOverlay}>
          <div className={styles.playBtn}>
            <Play size={20} fill="white" strokeWidth={0} />
          </div>
        </div>
        {book.seriesNumber && (
          <div className={styles.numBadge}>#{book.seriesNumber}</div>
        )}
      </div>

      <div className={styles.info}>
        {book.seriesTitle && (
          <span className={styles.series}>{book.seriesTitle}</span>
        )}
        <h3 className={styles.title}>{book.title}</h3>
        <p className={styles.author}>{book.author}</p>

        {chapterCount > 0 && (
          <div className={styles.meta}>
            <BookOpen size={12} />
            <span>{chapterCount} chapters</span>
          </div>
        )}
      </div>
    </Link>
  );
}
