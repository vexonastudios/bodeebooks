"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Maximize2, X } from "lucide-react";
import dimensions from "./tour-images.json";
import styles from "./guard.module.css";

export type TourImageId = "abeka" | "parent" | "parent-mobile" | "child" | "plan" | "messages" | "games" | "bible-reader" | "bible-topics" | "bible-memory" | "bible-plan";

type Props = { image: TourImageId; title: string; alt: string; caption?: string; sourceNote?: string; priority?: boolean; phone?: boolean };

/** Static, anonymous app screenshots. Enlarging a screenshot never opens a live child session. */
export default function TourScreenshot({ image, title, alt, caption, sourceNote = "Real app screen · fictional family data", priority = false, phone = false }: Props) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const size = dimensions.find(item => item.id === image)!;
  const src = `/guard-tour/${image}.webp`;

  useEffect(() => {
    if (!open || !dialog.current) return;
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (element.open) element.close();
    };
  }, [open]);

  return (
    <figure className={`${styles.screenshot} ${phone ? styles.phoneScreenshot : ""}`}>
      <button type="button" className={styles.screenButton} onClick={() => setOpen(true)} aria-label={`Enlarge screenshot: ${title}`} aria-haspopup="dialog">
        <Image src={src} alt={alt} width={size.width} height={size.height} sizes={phone ? "390px" : "(max-width: 720px) 100vw, 1200px"} preload={priority} className={styles.screenImage} />
        <span className={styles.zoomLabel}><Maximize2 size={14} aria-hidden="true" /> View larger</span>
      </button>
      {caption && <figcaption>{caption}</figcaption>}
      <dialog ref={dialog} className={styles.imageDialog} aria-label={`${title} — screenshot`} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
        {open && <div className={styles.dialogFrame}>
          <div className={styles.dialogHeader}><div><strong>{title}</strong><span>{sourceNote}</span></div><button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label="Close screenshot"><X size={24} /></button></div>
          <div className={styles.dialogImage}><Image src={src} alt={alt} width={size.width} height={size.height} sizes="100vw" /></div>
          <p>{caption || alt}</p>
        </div>}
      </dialog>
    </figure>
  );
}
