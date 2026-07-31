"use client";

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState } from "react";
import { Play } from "lucide-react";
import styles from "./YoutubePlayer.module.css";

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface YoutubePlayerProps {
  videoId: string;
  onReady?: () => void;
}

export interface YoutubePlayerHandle {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
}

declare global {
  interface Window {
    YT: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: { PLAYING: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  playVideo: () => void;
}

const YoutubePlayer = forwardRef<YoutubePlayerHandle, YoutubePlayerProps>(
  function YoutubePlayer({ videoId, onReady }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<YTPlayer | null>(null);
    const [activated, setActivated] = useState(false);
    const [savedTime, setSavedTime] = useState<number>(0);

    useEffect(() => {
      const timeStr = localStorage.getItem(`bodee_progress_${videoId}`);
      if (timeStr) {
        setSavedTime(Math.floor(parseFloat(timeStr)));
      }
    }, [videoId]);

    const initPlayer = useCallback(() => {
      if (!containerRef.current) return;
      
      const savedTime = localStorage.getItem(`bodee_progress_${videoId}`);
      const startSeconds = savedTime ? Math.floor(parseFloat(savedTime)) : 0;
      // Start 2 seconds earlier for context, but not before 0
      const start = startSeconds > 2 ? startSeconds - 2 : 0;

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          autoplay: 1,
          start,
          origin: typeof window !== "undefined" ? window.location.origin : "",
        },
        events: {
          onReady: () => onReady?.(),
        },
      });
    }, [videoId, onReady]);

    useEffect(() => {
      if (!activated) return;
      const interval = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
          const time = playerRef.current.getCurrentTime();
          // Only save if we actually have some progress
          if (time > 0) {
            localStorage.setItem(`bodee_progress_${videoId}`, time.toString());
          }
        }
      }, 5000);
      return () => clearInterval(interval);
    }, [activated, videoId]);

    useEffect(() => {
      if (!activated) return;
      if (typeof window === "undefined") return;

      if (window.YT && window.YT.Player) {
        initPlayer();
      } else {
        const existing = document.getElementById("yt-iframe-api");
        if (!existing) {
          const tag = document.createElement("script");
          tag.id = "yt-iframe-api";
          tag.src = "https://www.youtube.com/iframe_api";
          document.head.appendChild(tag);
        }
        window.onYouTubeIframeAPIReady = initPlayer;
      }

      return () => {
        // cleanup
      };
    }, [activated, initPlayer]);

    useImperativeHandle(ref, () => ({
      seekTo(seconds: number) {
        if (!activated) setActivated(true);
        // Small delay if player isn't ready yet
        setTimeout(() => {
          playerRef.current?.seekTo(seconds, true);
          playerRef.current?.playVideo();
        }, activated ? 0 : 2000);
      },
      getCurrentTime() {
        return playerRef.current?.getCurrentTime() ?? 0;
      },
    }));

    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    if (!activated) {
      return (
        <div className={styles.wrapper}>
          <button
            className={styles.facade}
            onClick={() => setActivated(true)}
            aria-label="Play video"
            type="button"
          >
            <img
              src={thumbnailUrl}
              alt="Video thumbnail"
              className={styles.thumbnail}
              loading="eager"
            />
            <div className={styles.playOverlay}>
              {savedTime > 2 ? (
                <div className={styles.continueBtn}>
                  <Play size={20} fill="white" color="white" />
                  Continue Listening {formatTime(savedTime)}
                </div>
              ) : (
                <div className={styles.playBtn}>
                  <Play size={32} fill="white" color="white" />
                </div>
              )}
            </div>
          </button>
        </div>
      );
    }

    return (
      <div className={styles.wrapper}>
        <div ref={containerRef} className={styles.player} />
      </div>
    );
  }
);

export default YoutubePlayer;
