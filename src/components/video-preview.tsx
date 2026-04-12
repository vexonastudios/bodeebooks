"use client";

import Image from "next/image";
import { useState } from "react";

type VideoPreviewProps = {
  title: string;
  videoId: string;
  thumbnailUrl: string;
};

export function VideoPreview({
  title,
  videoId,
  thumbnailUrl
}: VideoPreviewProps) {
  const [isActive, setIsActive] = useState(false);

  if (isActive) {
    return (
      <div className="video-frame">
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
        />
      </div>
    );
  }

  return (
    <div className="video-preview">
      <button
        aria-label={`Play ${title}`}
        className="video-preview__button"
        onClick={() => setIsActive(true)}
        type="button"
      >
        <Image
          alt=""
          aria-hidden="true"
          className="video-preview__image"
          fill
          sizes="(max-width: 960px) 100vw, 33vw"
          src={thumbnailUrl}
        />
        <span className="video-preview__content">
          <span className="video-preview__badge">Watch now</span>
          <span className="video-preview__play">
            <span aria-hidden="true" className="video-preview__icon" />
            Play audiobook
          </span>
        </span>
      </button>
    </div>
  );
}
