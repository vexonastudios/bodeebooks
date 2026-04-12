const rawHandle = process.env.YOUTUBE_CHANNEL_HANDLE?.trim() || "@bodeebooks";
const youtubeHandle = rawHandle.startsWith("@") ? rawHandle : `@${rawHandle}`;

export const siteConfig = {
  name: "Bodee Books",
  url: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://bodeebooks.com",
  description:
    "Classic stories, free audiobook premieres, printed editions, and reading games for growing readers.",
  youtubeHandle,
  youtubeUrl: `https://www.youtube.com/${youtubeHandle}`,
  youtubeVideosUrl: `https://www.youtube.com/${youtubeHandle}/videos`
} as const;
