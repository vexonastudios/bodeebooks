import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site-config";
import { getAudiobookPath, getLatestAudiobooks } from "@/lib/youtube";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const audiobookFeed = await getLatestAudiobooks(15);
  const audiobookPaths = audiobookFeed.items
    .filter((item) => item.videoId)
    .map((item) => getAudiobookPath(item));

  return ["", "/audiobooks", "/books", "/games", ...audiobookPaths].map((path) => ({
    url: `${siteConfig.url}${path}`,
    lastModified: new Date()
  }));
}
