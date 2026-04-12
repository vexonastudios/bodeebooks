import { fallbackAudiobooks } from "@/data/site-content";
import { siteConfig } from "@/lib/site-config";

export type AudiobookEntry = {
  title: string;
  summary: string;
  href: string;
  videoId?: string;
  publishedAt?: string;
  publishedLabel: string;
  thumbnailUrl?: string;
  source: "youtube" | "fallback";
};

type AudiobookFeedResult = {
  items: AudiobookEntry[];
  source: "youtube" | "fallback";
  syncedAt: string;
};

function escapeTag(tagName: string) {
  return tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtml(value: string) {
  return value
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function readTag(block: string, tagName: string) {
  const pattern = new RegExp(
    `<${escapeTag(tagName)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapeTag(tagName)}>`,
    "i"
  );
  const match = block.match(pattern);

  if (!match) {
    return undefined;
  }

  return decodeHtml(match[1]);
}

function readLink(block: string) {
  const match = block.match(/<link\b[^>]*href="([^"]+)"/i);
  return match?.[1];
}

function formatPublished(dateString?: string) {
  if (!dateString) {
    return "Latest release";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.valueOf())) {
    return "Latest release";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

async function fetchText(url: string, revalidate: number) {
  const response = await fetch(url, {
    next: {
      revalidate
    },
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; BodeeBooksBot/1.0; +https://bodeebooks.com)"
    }
  });

  if (!response.ok) {
    throw new Error(`Fetch failed for ${url} with ${response.status}`);
  }

  return response.text();
}

async function resolveChannelId() {
  const html = await fetchText(siteConfig.youtubeVideosUrl, 3600);

  const patterns = [
    /"channelId":"(UC[^"]+)"/,
    /"externalId":"(UC[^"]+)"/,
    /itemprop="channelId"\s+content="(UC[^"]+)"/
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match) {
      return match[1];
    }
  }

  throw new Error("Could not resolve YouTube channel ID from the public handle page.");
}

function parseYoutubeFeed(xml: string, limit: number) {
  const entries = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];

  const items = entries.flatMap((entry) => {
      const videoId = readTag(entry, "yt:videoId");
      const title = readTag(entry, "title");
      const publishedAt = readTag(entry, "published");
      const href = readLink(entry);

      if (!videoId || !title || !href) {
        return [];
      }

      const summary =
        readTag(entry, "media:description") ||
        "Free audiobook release from the Bodee Books YouTube channel.";

      return [
        {
          title,
          summary,
          href,
          videoId,
          publishedAt,
          publishedLabel: formatPublished(publishedAt),
          thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          source: "youtube"
        } satisfies AudiobookEntry
      ];
    });

  return items.slice(0, limit);
}

function buildFallbackItems(limit: number): AudiobookEntry[] {
  return fallbackAudiobooks.slice(0, limit).map((item) => ({
    ...item,
    source: "fallback"
  }));
}

export async function getLatestAudiobooks(limit = 6): Promise<AudiobookFeedResult> {
  try {
    const channelId = await resolveChannelId();
    const xml = await fetchText(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
      1800
    );
    const items = parseYoutubeFeed(xml, limit);

    if (items.length === 0) {
      throw new Error("YouTube feed returned no entries.");
    }

    return {
      items,
      source: "youtube",
      syncedAt: new Date().toISOString()
    };
  } catch {
    return {
      items: buildFallbackItems(limit),
      source: "fallback",
      syncedAt: new Date().toISOString()
    };
  }
}
