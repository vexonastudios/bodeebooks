import { put, list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://bodeebooks.com",
  "https://www.bodeebooks.com",
  "https://fit.bodeebooks.com",
  "https://games.bodeebooks.com",
];

function corsHeaders(origin: string | null) {
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// Helper: get today's date string in YYYY-MM-DD format (UTC)
function todayKey() {
  return new Date().toISOString().split("T")[0];
}

// Helper: get date key for a specific timestamp
function dateKey(isoString: string) {
  return isoString.split("T")[0];
}

type GameStats = {
  sessions: number;
  totalMs: number;
  avgMs: number;
};

type SiteStats = {
  pageViews: number;
  sessions: number;
};

type DailyAggregate = {
  date: string;
  totalPageViews: number;
  totalGameSessions: number;
  totalPlayTimeMs: number;
  uniqueVisitors: string[];
  games: Record<string, GameStats>;
  sites: Record<string, SiteStats>;
  devices: Record<string, number>;
  recentEvents: Array<{
    event: string;
    site: string;
    game: string;
    timestamp: string;
    device: string;
    duration?: number;
  }>;
};

function emptyAggregate(date: string): DailyAggregate {
  return {
    date,
    totalPageViews: 0,
    totalGameSessions: 0,
    totalPlayTimeMs: 0,
    uniqueVisitors: [],
    games: {},
    sites: {},
    devices: {},
    recentEvents: [],
  };
}

async function loadDailyBlob(date: string): Promise<{ data: DailyAggregate; exists: boolean }> {
  const prefix = `analytics/${date}.json`;
  const { blobs } = await list({ prefix });
  
  if (blobs.length > 0) {
    try {
      const res = await fetch(blobs[0].url);
      const data = await res.json();
      
      // Fallback for older schemas or missing properties
      data.uniqueVisitors = data.uniqueVisitors || [];
      data.games = data.games || {};
      data.sites = data.sites || {};
      data.devices = data.devices || {};
      data.recentEvents = data.recentEvents || [];
      data.totalPageViews = data.totalPageViews || 0;
      data.totalGameSessions = data.totalGameSessions || 0;
      data.totalPlayTimeMs = data.totalPlayTimeMs || 0;

      return { data, exists: true };
    } catch {
      return { data: emptyAggregate(date), exists: false };
    }
  }
  
  return { data: emptyAggregate(date), exists: false };
}

async function saveDailyBlob(date: string, data: DailyAggregate) {
  const blobName = `analytics/${date}.json`;
  await put(blobName, JSON.stringify(data, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

// ── OPTIONS (CORS preflight) ──────────────────────────────────────────────
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

// ── POST — Receive analytics events ──────────────────────────────────────
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  try {
    const body = await req.json();
    const events: Array<{
      event: string;
      site: string;
      game: string;
      duration?: number;
      device?: string;
      visitorId?: string;
      timestamp?: string;
    }> = Array.isArray(body) ? body : [body];

    if (events.length === 0) {
      return NextResponse.json({ ok: true }, { status: 200, headers });
    }

    // Group events by date
    const byDate: Record<string, typeof events> = {};
    for (const evt of events) {
      const d = evt.timestamp ? dateKey(evt.timestamp) : todayKey();
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(evt);
    }

    // Process each date's events
    for (const [date, dateEvents] of Object.entries(byDate)) {
      const { data } = await loadDailyBlob(date);

      for (const evt of dateEvents) {
        const eventType = evt.event || "unknown";
        const site = evt.site || "unknown";
        const game = evt.game || "unknown";
        const device = evt.device || "unknown";
        const visitorId = evt.visitorId || "anon";
        const timestamp = evt.timestamp || new Date().toISOString();

        // Track unique visitors
        if (visitorId && !data.uniqueVisitors.includes(visitorId)) {
          data.uniqueVisitors.push(visitorId);
        }

        // Track devices
        data.devices[device] = (data.devices[device] || 0) + 1;

        // Track by site
        if (!data.sites[site]) {
          data.sites[site] = { pageViews: 0, sessions: 0 };
        }

        // Process by event type
        if (eventType === "page_view") {
          data.totalPageViews++;
          data.sites[site].pageViews++;
        } else if (eventType === "game_start") {
          data.totalGameSessions++;
          data.sites[site].sessions++;
          if (!data.games[game]) {
            data.games[game] = { sessions: 0, totalMs: 0, avgMs: 0 };
          }
          data.games[game].sessions++;
        } else if (eventType === "game_end" || eventType === "heartbeat") {
          const duration = evt.duration || 0;
          if (duration > 0) {
            data.totalPlayTimeMs += duration;
            if (!data.games[game]) {
              data.games[game] = { sessions: 0, totalMs: 0, avgMs: 0 };
            }
            data.games[game].totalMs += duration;
            if (data.games[game].sessions > 0) {
              data.games[game].avgMs = Math.round(
                data.games[game].totalMs / data.games[game].sessions
              );
            }
          }
        }

        // Add to recent events (keep last 50)
        data.recentEvents.unshift({
          event: eventType,
          site,
          game,
          timestamp,
          device,
          duration: evt.duration,
        });
        if (data.recentEvents.length > 50) {
          data.recentEvents = data.recentEvents.slice(0, 50);
        }
      }

      await saveDailyBlob(date, data);
    }

    return NextResponse.json({ ok: true }, { status: 200, headers });
  } catch (err) {
    console.error("[analytics POST]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500, headers }
    );
  }
}

// ── GET — Query analytics (admin only) ───────────────────────────────────
export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  // Check admin token
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  const adminPassword = process.env.ADMIN_PASSWORD || "";

  if (!adminPassword || token !== adminPassword) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401, headers }
    );
  }

  try {
    const url = req.nextUrl;
    const range = url.searchParams.get("range") || "7"; // days
    const daysBack = Math.min(parseInt(range, 10) || 7, 365);

    // Generate date keys for the range
    const dates: string[] = [];
    const now = new Date();
    for (let i = 0; i < daysBack; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }

    // Load all blobs for the date range
    const { blobs } = await list({ prefix: "analytics/" });
    
    const dateSet = new Set(dates);
    const relevantBlobs = blobs.filter((b) => {
      const blobDate = b.pathname.replace("analytics/", "").replace(".json", "");
      return dateSet.has(blobDate);
    });

    const dailyData: DailyAggregate[] = await Promise.all(
      relevantBlobs.map(async (blob) => {
        try {
          const res = await fetch(blob.url);
          return await res.json();
        } catch {
          return null;
        }
      })
    ).then((results) => results.filter(Boolean) as DailyAggregate[]);

    // Also fill in empty days
    const loadedDates = new Set(dailyData.map((d) => d.date));
    for (const date of dates) {
      if (!loadedDates.has(date)) {
        dailyData.push(emptyAggregate(date));
      }
    }

    // Sort by date descending
    dailyData.sort((a, b) => b.date.localeCompare(a.date));

    // Compute totals across the range
    const allVisitors = new Set<string>();
    let totalPageViews = 0;
    let totalGameSessions = 0;
    let totalPlayTimeMs = 0;
    const allGames: Record<string, GameStats> = {};
    const allSites: Record<string, SiteStats> = {};
    const allDevices: Record<string, number> = {};
    const allRecentEvents: DailyAggregate["recentEvents"] = [];

    for (const day of dailyData) {
      totalPageViews += day.totalPageViews;
      totalGameSessions += day.totalGameSessions;
      totalPlayTimeMs += day.totalPlayTimeMs;

      for (const v of day.uniqueVisitors) allVisitors.add(v);

      for (const [game, stats] of Object.entries(day.games)) {
        if (!allGames[game]) allGames[game] = { sessions: 0, totalMs: 0, avgMs: 0 };
        allGames[game].sessions += stats.sessions;
        allGames[game].totalMs += stats.totalMs;
      }

      for (const [site, stats] of Object.entries(day.sites)) {
        if (!allSites[site]) allSites[site] = { pageViews: 0, sessions: 0 };
        allSites[site].pageViews += stats.pageViews;
        allSites[site].sessions += stats.sessions;
      }

      for (const [device, count] of Object.entries(day.devices)) {
        allDevices[device] = (allDevices[device] || 0) + count;
      }

      allRecentEvents.push(...day.recentEvents);
    }

    // Compute avg for allGames
    for (const game of Object.values(allGames)) {
      if (game.sessions > 0) {
        game.avgMs = Math.round(game.totalMs / game.sessions);
      }
    }

    // Sort recent events by timestamp
    allRecentEvents.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json(
      {
        range: daysBack,
        summary: {
          totalPageViews,
          totalGameSessions,
          totalPlayTimeMs,
          uniqueVisitors: allVisitors.size,
        },
        daily: dailyData.map((d) => ({
          date: d.date,
          pageViews: d.totalPageViews,
          sessions: d.totalGameSessions,
          playTimeMs: d.totalPlayTimeMs,
          visitors: d.uniqueVisitors.length,
        })),
        games: Object.entries(allGames)
          .map(([name, stats]) => ({ name, ...stats }))
          .sort((a, b) => b.sessions - a.sessions),
        sites: allSites,
        devices: allDevices,
        recentEvents: allRecentEvents.slice(0, 30),
      },
      { status: 200, headers }
    );
  } catch (err) {
    console.error("[analytics GET]", err);
    return NextResponse.json(
      { error: "Failed to load analytics." },
      { status: 500, headers }
    );
  }
}
