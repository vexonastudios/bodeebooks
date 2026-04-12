import Image from "next/image";
import Link from "next/link";

type AudiobookPosterLinkProps = {
  href: string;
  title: string;
  thumbnailUrl: string;
};

export function AudiobookPosterLink({
  href,
  title,
  thumbnailUrl
}: AudiobookPosterLinkProps) {
  return (
    <Link
      aria-label={`Open audiobook page for ${title}`}
      className="audiobook-poster"
      href={href}
    >
      <Image
        alt=""
        aria-hidden="true"
        className="audiobook-poster__image"
        fill
        sizes="(max-width: 960px) 100vw, 33vw"
        src={thumbnailUrl}
      />
      <span className="audiobook-poster__scrim" />
      <span className="audiobook-poster__content">
        <span className="video-preview__badge">Audiobook page</span>
        <span className="audiobook-poster__cta">Open this story</span>
      </span>
    </Link>
  );
}
