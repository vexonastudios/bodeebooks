"use client";

import { Clock } from "lucide-react";
import styles from "./ChapterList.module.css";
import type { YoutubePlayerHandle } from "./YoutubePlayer";
import type { RefObject } from "react";

interface Chapter {
  title: string;
  timestamp: number;
}

interface ChapterListProps {
  chapters: Chapter[];
  playerRef: RefObject<YoutubePlayerHandle | null>;
  activeIndex?: number;
  onChapterClick?: (index: number) => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ChapterList({
  chapters,
  playerRef,
  activeIndex = -1,
  onChapterClick,
}: ChapterListProps) {
  function handleClick(chapter: Chapter, index: number) {
    playerRef.current?.seekTo(chapter.timestamp);
    onChapterClick?.(index);
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.heading}>
        <Clock size={15} />
        Chapters
      </h3>
      <ol className={styles.list}>
        {chapters.map((chapter, i) => (
          <li key={i}>
            <button
              className={`${styles.item} ${i === activeIndex ? styles.active : ""}`}
              onClick={() => handleClick(chapter, i)}
            >
              <span className={styles.num}>{i + 1}</span>
              <span className={styles.chTitle}>{chapter.title}</span>
              <span className={styles.time}>{formatTime(chapter.timestamp)}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
