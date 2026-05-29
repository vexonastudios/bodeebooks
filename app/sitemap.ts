import booksData from "@/data/books.json";
import seriesData from "@/data/series.json";
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://bodeebooks.com";
  
  const books = booksData.map((b) => ({
    url: `${base}/listen/${b.slug}/`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));
  
  const series = seriesData.map((s) => ({
    url: `${base}/series/${s.slug}/`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  
  return [
    { url: `${base}/`, priority: 1.0, changeFrequency: "weekly" as const },
    { url: `${base}/tools/grep-indesign/`, priority: 0.5, changeFrequency: "yearly" as const },
    ...series,
    ...books,
  ];
}
