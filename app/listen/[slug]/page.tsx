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

  return {
    title: `${book.title} – Listen Free | Bodee Books`,
    description: book.description,
    openGraph: {
      title: `${book.title} – Listen Free | Bodee Books`,
      description: book.description,
      images: [`https://img.youtube.com/vi/${book.youtubeVideoId}/maxresdefault.jpg`],
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
