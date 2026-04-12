import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AudiobookCard } from "@/components/cards";
import { SectionHeading } from "@/components/section-heading";
import { VideoPreview } from "@/components/video-preview";
import { siteConfig } from "@/lib/site-config";
import { getAudiobookByVideoId, getAudiobookPath, getLatestAudiobooks } from "@/lib/youtube";

export const revalidate = 1800;

type AudiobookDetailPageProps = {
  params: Promise<{
    videoId: string;
    slug: string;
  }>;
};

async function loadAudiobook(videoId: string) {
  return getAudiobookByVideoId(videoId);
}

export async function generateMetadata({
  params
}: AudiobookDetailPageProps): Promise<Metadata> {
  const { videoId } = await params;
  const audiobook = await loadAudiobook(videoId);

  if (!audiobook) {
    return {
      title: "Audiobook not found"
    };
  }

  const canonicalPath = getAudiobookPath(audiobook);

  return {
    title: audiobook.title,
    description: audiobook.summary,
    alternates: {
      canonical: canonicalPath
    },
    openGraph: {
      title: audiobook.title,
      description: audiobook.summary,
      type: "article",
      url: `${siteConfig.url}${canonicalPath}`,
      images: audiobook.thumbnailUrl ? [{ url: audiobook.thumbnailUrl }] : undefined
    },
    twitter: {
      card: "summary_large_image",
      title: audiobook.title,
      description: audiobook.summary,
      images: audiobook.thumbnailUrl ? [audiobook.thumbnailUrl] : undefined
    }
  };
}

export default async function AudiobookDetailPage({
  params
}: AudiobookDetailPageProps) {
  const { videoId } = await params;
  const audiobook = await loadAudiobook(videoId);

  if (!audiobook || !audiobook.videoId) {
    notFound();
  }

  const relatedFeed = await getLatestAudiobooks(6);
  const relatedAudiobooks = relatedFeed.items
    .filter((item) => item.videoId && item.videoId !== audiobook.videoId)
    .slice(0, 3);

  return (
    <section className="section">
      <div className="container">
        <nav aria-label="Breadcrumb" className="breadcrumbs">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/audiobooks">Audiobooks</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{audiobook.title}</span>
        </nav>

        <div className="audiobook-detail">
          <div className="audiobook-detail__media" id="listen">
            <VideoPreview
              badgeLabel="Featured listen"
              playLabel="Play this audiobook"
              thumbnailUrl={
                audiobook.thumbnailUrl ||
                `https://i.ytimg.com/vi/${audiobook.videoId}/hqdefault.jpg`
              }
              title={audiobook.title}
              videoId={audiobook.videoId}
            />
          </div>

          <aside className="audiobook-detail__panel">
            <p className="section-heading__eyebrow">Featured audiobook</p>
            <h1 className="page-header__title audiobook-detail__title">{audiobook.title}</h1>
            <p className="audiobook-detail__meta">{audiobook.publishedLabel}</p>
            <p className="page-header__copy">{audiobook.summary}</p>

            <div className="pill-row">
              <span className="pill">Free to listen</span>
              <span className="pill pill--soft">Family story time</span>
            </div>

            <div className="button-row">
              <a
                className="button"
                href={audiobook.href}
                rel="noreferrer"
                target="_blank"
              >
                Watch on YouTube
              </a>
              <Link className="button button--ghost" href="/audiobooks">
                More audiobooks
              </Link>
            </div>

            <p className="inline-note">
              Tap the cover image to load the player right on this page when you are
              ready to listen.
            </p>
          </aside>
        </div>

        <div className="audiobook-story-grid">
          <article className="detail-card">
            <p className="section-heading__eyebrow">Story snapshot</p>
            <h2 className="detail-card__title">A calmer start for listening time</h2>
            <p className="detail-card__copy">{audiobook.summary}</p>
            <p className="detail-card__copy">
              This page gives families a simple place to arrive first, see what the
              story is, and then start the audiobook when they are ready.
            </p>
          </article>

          <article className="detail-card">
            <p className="section-heading__eyebrow">Listening ideas</p>
            <h2 className="detail-card__title">Easy moments to press play</h2>
            <ul className="detail-list">
              <li>Quiet reading time after school</li>
              <li>Bedtime wind-down with a favorite story</li>
              <li>Car rides, errands, and weekend trips</li>
            </ul>
          </article>
        </div>

        {relatedAudiobooks.length ? (
          <div className="audiobook-related">
            <SectionHeading
              action={{ href: "/audiobooks", label: "Browse all audiobooks" }}
              description="Keep the listening going with more recent releases from the Bodee Books channel."
              eyebrow="Keep exploring"
              title="More stories to open next"
            />

            <div className="grid grid--3">
              {relatedAudiobooks.map((item) => (
                <AudiobookCard item={item} key={item.href} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
