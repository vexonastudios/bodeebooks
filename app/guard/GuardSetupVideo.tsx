"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import styles from "./guard.module.css";

export default function GuardSetupVideo() {
  const [playing, setPlaying] = useState(false);

  return <div className={styles.heroVideo}>
    {playing ? <iframe
      className={styles.heroVideoPlayer}
      src="https://www.youtube-nocookie.com/embed/tlMNlJ5eBwE?autoplay=1"
      title="Bodee Guard Setup Tutorial"
      referrerPolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    /> : <button type="button" className={styles.heroVideoButton} onClick={() => setPlaying(true)} aria-label="Play the BodeeGuard setup tutorial">
      <Image src="/guard-tour/setup-tutorial.jpg" alt="" width={1280} height={720} sizes="(max-width: 760px) calc(100vw - 40px), 50vw" preload className={styles.heroVideoPoster} />
      <span className={styles.heroVideoPlay}><Play size={26} fill="currentColor" aria-hidden="true" /></span>
    </button>}
  </div>;
}
