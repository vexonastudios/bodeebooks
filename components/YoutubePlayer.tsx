"use client";

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState } from "react";
import { Play } from "lucide-react";
import styles from "./YoutubePlayer.module.css";

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

    const initPlayer = useCallback(() => {
      if (!containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          autoplay: 1,
          origin: typeof window !== "undefined" ? window.location.origin : "",
        },
        events: {
          onReady: () => onReady?.(),
        },
      });
    }, [videoId, onReady]);

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
              <div className={styles.playBtn}>
                <Play size={32} fill="white" color="white" />
              </div>
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
