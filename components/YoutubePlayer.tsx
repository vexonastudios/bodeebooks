"use client";

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
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

    const initPlayer = useCallback(() => {
      if (!containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          origin: typeof window !== "undefined" ? window.location.origin : "",
        },
        events: {
          onReady: () => onReady?.(),
        },
      });
    }, [videoId, onReady]);

    useEffect(() => {
      if (typeof window === "undefined") return;

      if (window.YT && window.YT.Player) {
        initPlayer();
      } else {
        // Load the YouTube IFrame API
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
    }, [initPlayer]);

    useImperativeHandle(ref, () => ({
      seekTo(seconds: number) {
        playerRef.current?.seekTo(seconds, true);
        playerRef.current?.playVideo();
      },
      getCurrentTime() {
        return playerRef.current?.getCurrentTime() ?? 0;
      },
    }));

    return (
      <div className={styles.wrapper}>
        <div ref={containerRef} className={styles.player} />
      </div>
    );
  }
);

export default YoutubePlayer;
