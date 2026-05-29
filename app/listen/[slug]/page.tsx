import { notFound } from "next/navigation";
import type { Metadata } from "next";
import booksData from "@/data/books.json";
import ListenClient from "./ListenClient";

type Book = (typeof booksData)[number];

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return booksData.map((book) => ({ slug: book.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const book = booksData.find((b) => b.slug === slug);
  if (!book) return {};

  const seriesLabel = book.seriesTitle ? ` | ${book.seriesTitle}` : "";
  const title = `${book.title} – Free Multi-voice Audiobook${seriesLabel}`;
  const description = `Listen free to the multi-voice, dramatized audiobook of "${book.title}" by ${book.author}. ${book.description} Stream instantly — no app, no account.`;
  const thumbnail = `https://img.youtube.com/vi/${book.youtubeVideoId}/maxresdefault.jpg`;

  return {
    title,
    description,
    keywords: [
      `${book.title} audiobook`,
      `${book.title} free audiobook`,
      `${book.author} audiobook`,
      "multi-voice audiobook",
      "free audiobook online",
      "dramatized audiobook",
      ...(book.seriesTitle ? [`${book.seriesTitle} audiobook`] : []),
    ],
    alternates: {
      canonical: `https://bodeebooks.com/listen/${book.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://bodeebooks.com/listen/${book.slug}`,
      type: "website",
      images: [{ url: thumbnail, width: 1280, height: 720, alt: `${book.title} – Bodee Books` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [thumbnail],
    },
  };
}

export default async function ListenPage({ params }: PageProps) {
  const { slug } = await params;
  const book = booksData.find((b) => b.slug === slug) as Book | undefined;
  if (!book) notFound();

  // Get sibling books in the same series for navigation
  const seriesBooks = book.seriesSlug
    ? booksData
        .filter((b) => b.seriesSlug === book.seriesSlug)
        .sort((a, b) => (a.seriesNumber ?? 0) - (b.seriesNumber ?? 0))
    : [];

  const currentIndex = seriesBooks.findIndex((b) => b.slug === slug);
  const prevBook = currentIndex > 0 ? seriesBooks[currentIndex - 1] : null;
  const nextBook = currentIndex >= 0 && currentIndex < seriesBooks.length - 1
    ? seriesBooks[currentIndex + 1]
    : null;

  return (
    <ListenClient
      book={book}
      prevBook={prevBook as Book | null}
      nextBook={nextBook as Book | null}
    />
  );
}
