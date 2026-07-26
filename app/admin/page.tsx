"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, RefreshCw, LogOut, Mail, Inbox, AlertCircle, CheckCircle, Download, Monitor, Smartphone, Globe, ChevronDown, BarChart3, MessageSquare, Activity, Clock, Users, Gamepad2, TrendingUp, Zap } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type FeedbackItem = {
  source: string;
  type: string;
  name: string;
  email: string;
  message: string;
  submittedAt: string;
  appVersion: string;
  userAgent?: string;
  receivedAt: string;
  _blobUrl: string;
  _blobName: string;
};

type GameStat = {
  name: string;
  sessions: number;
  totalMs: number;
  avgMs: number;
};

type AnalyticsData = {
  range: number;
  summary: {
    totalPageViews: number;
    totalGameSessions: number;
    totalPlayTimeMs: number;
    uniqueVisitors: number;
  };
  daily: Array<{
    date: string;
    pageViews: number;
    sessions: number;
    playTimeMs: number;
    visitors: number;
  }>;
  games: GameStat[];
  sites: Record<string, { pageViews: number; sessions: number }>;
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

// ═══════════════════════════════════════════════════════════════════════════
// Constants & Helpers
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = "bb_admin_token";

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatShortDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDuration(ms: number) {
  if (!ms || ms < 1000) return "0s";
  const totalSecs = Math.floor(ms / 1000);
  if (totalSecs < 60) return `${totalSecs}s`;
  const mins = Math.floor(totalSecs / 60);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDurationLong(ms: number) {
  if (!ms || ms < 1000) return "0 seconds";
  const totalSecs = Math.floor(ms / 1000);
  if (totalSecs < 60) return `${totalSecs} seconds`;
  const mins = Math.floor(totalSecs / 60);
  if (mins < 60) return `${mins} min${mins !== 1 ? "s" : ""}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h} hour${h !== 1 ? "s" : ""}`;
}

function parseUA(ua?: string) {
  if (!ua) return { os: "Unknown", browser: "Unknown", type: "desktop" };
  const str = ua.toLowerCase();
  let os = "Unknown";
  let type = "desktop";
  if (str.includes("windows")) os = "Windows";
  else if (str.includes("mac os")) os = "Mac";
  else if (str.includes("android")) { os = "Android"; type = "mobile"; }
  else if (str.includes("iphone") || str.includes("ipad")) { os = "iOS"; type = "mobile"; }
  
  let browser = "Unknown";
  if (str.includes("firefox")) browser = "Firefox";
  else if (str.includes("edg/")) browser = "Edge";
  else if (str.includes("chrome")) browser = "Chrome";
  else if (str.includes("safari")) browser = "Safari";
  
  return { os, browser, type };
}

function typeColor(type: string) {
  const t = type.toLowerCase();
  if (t.includes("bug")) return "#dc2626";
  if (t.includes("feature")) return "#4f46e5";
  if (t.includes("content")) return "#d97706";
  if (t.includes("general")) return "var(--green)";
  return "#64748b";
}

// Game colors for the chart
const GAME_COLORS = [
  "#369d6f", "#4f46e5", "#d97706", "#dc2626", "#0891b2",
  "#7c3aed", "#059669", "#ea580c", "#2563eb", "#be185d",
  "#65a30d", "#0d9488",
];

function gameColor(idx: number) {
  return GAME_COLORS[idx % GAME_COLORS.length];
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared Style Helpers
// ═══════════════════════════════════════════════════════════════════════════

function filterBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "7px 16px",
    background: active ? "var(--green)" : "var(--bg-card)",
    border: `1px solid ${active ? "var(--green)" : "var(--border)"}`,
    borderRadius: "20px",
    color: active ? "#fff" : "var(--text-secondary)",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s",
  };
}

function typePillStyle(type: string): React.CSSProperties {
  return {
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: 700,
    background: typeColor(type) + "1a",
    color: typeColor(type),
    border: `1px solid ${typeColor(type)}33`,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════

const styles: Record<string, React.CSSProperties> = {
  page: { 
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0, overflowY: "auto", zIndex: 99999,
    minHeight: "100vh", background: "var(--bg)", padding: "0", color: "var(--text-primary)", fontFamily: "var(--font-sans)"
  },
  loginWrap: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0, overflowY: "auto", zIndex: 99999,
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg)",
    color: "var(--text-primary)", fontFamily: "var(--font-sans)"
  },
  loginCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    padding: "40px 48px",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "var(--shadow-lg)",
  },
  logo: { fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "10px" },
  logoSub: { fontSize: "14px", color: "var(--text-muted)", marginBottom: "32px", marginLeft: "34px" },
  label: { display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  input: {
    width: "100%",
    padding: "12px 16px",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    color: "var(--text-primary)",
    fontSize: "15px",
    outline: "none",
    marginBottom: "20px",
    transition: "all 0.2s"
  },
  btn: {
    width: "100%",
    padding: "13px",
    background: "var(--green)",
    border: "none",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 0.2s"
  },
  errMsg: { color: "#ef4444", fontSize: "13px", marginTop: "12px", textAlign: "center" as const },
  topbar: {
    background: "var(--bg-card)",
    borderBottom: "1px solid var(--border)",
    padding: "0 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: "64px",
  },
  topbarLogo: { fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" },
  topbarSub: { fontSize: "13px", color: "var(--text-muted)", marginLeft: "8px", fontWeight: 400 },
  actionBtn: {
    padding: "8px 16px",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    color: "var(--text-secondary)",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.15s"
  },
  content: { padding: "32px", maxWidth: "1100px", margin: "0 auto" },
  statsRow: { display: "flex", gap: "16px", marginBottom: "32px", flexWrap: "wrap" as const },
  statCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "20px 24px",
    flex: "1",
    minWidth: "140px",
    boxShadow: "var(--shadow-sm)"
  },
  statNum: { fontSize: "32px", fontWeight: 800, color: "var(--text-primary)" },
  statLabel: { fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginTop: "4px" },
  filterRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap" as const, gap: "16px" },
  filterGroup: { display: "flex", gap: "10px", flexWrap: "wrap" as const },
  selectInput: {
    padding: "7px 12px",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    color: "var(--text-primary)",
    fontSize: "13px",
    outline: "none",
    cursor: "pointer",
  },
  cardList: { display: "flex", flexDirection: "column" as const, gap: "16px" },
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "24px",
    transition: "all 0.15s",
    boxShadow: "var(--shadow-sm)"
  },
  cardHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px", gap: "12px", flexWrap: "wrap" as const },
  cardMeta: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" as const },
  sourceBadge: {
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    background: "var(--bg-subtle)",
    color: "var(--text-secondary)",
    border: "1px solid var(--border)",
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: "4px"
  },
  cardDate: { fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap" as const },
  cardPerson: { fontSize: "14px", color: "var(--text-secondary)", marginBottom: "12px", fontWeight: 500 },
  cardMsg: { fontSize: "15px", color: "var(--text-primary)", lineHeight: 1.6, whiteSpace: "pre-wrap" as const },
  actionsRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px", flexWrap: "wrap" as const, gap: "12px" },
  replyWrapper: { display: "flex", alignItems: "center", gap: "8px" },
  replyBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    background: "var(--bg-subtle)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    color: "var(--green)",
    fontSize: "13px",
    cursor: "pointer",
    textDecoration: "none",
    fontWeight: 500,
    transition: "all 0.15s"
  },
  archiveBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: "8px",
    color: "var(--text-muted)",
    fontSize: "13px",
    cursor: "pointer",
    fontWeight: 500,
    transition: "all 0.15s"
  },
  emptyState: { textAlign: "center" as const, color: "var(--text-muted)", padding: "80px 0", fontSize: "15px", display: "flex", flexDirection: "column", alignItems: "center" },
  loadingWrap: { display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" },
  spinner: { width: "36px", height: "36px", border: "3px solid var(--border)", borderTopColor: "var(--green)", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
};

const QUICK_REPLIES = [
  { label: "General Reply", body: "Hi {name},\n\nThank you for your feedback!\n\n---\nYour original message:\n\"{message}\"\n\n---\n\n" },
  { label: "Bug Fixed", body: "Hi {name},\n\nThank you for reporting this issue. We've just pushed a fix and it should be working correctly now!\n\n---\nYour original message:\n\"{message}\"\n\n---\n\n" },
  { label: "Feature Noted", body: "Hi {name},\n\nThank you for the great suggestion! We've noted this feature request and will keep it in mind for future updates.\n\n---\nYour original message:\n\"{message}\"\n\n---\n\n" }
];

// ═══════════════════════════════════════════════════════════════════════════
// Analytics Tab Component
// ═══════════════════════════════════════════════════════════════════════════

function AnalyticsTab({ token }: { token: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState(7);

  const fetchAnalytics = useCallback(async (days: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/analytics?range=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load analytics");
      const json = await res.json();
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAnalytics(range);
  }, [range, fetchAnalytics]);

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "14px 20px", color: "#dc2626", display: "flex", alignItems: "center", gap: "8px" }}>
        <AlertCircle size={18} /> {error}
      </div>
    );
  }

  if (!data) return null;

  const { summary, daily, games, sites, devices, recentEvents } = data;
  
  // Sort daily by date ascending for the chart
  const chartDays = [...daily].sort((a, b) => a.date.localeCompare(b.date));
  const maxPageViews = Math.max(...chartDays.map(d => d.pageViews), 1);
  const maxSessions = Math.max(...chartDays.map(d => d.sessions), 1);
  
  // Device totals
  const totalDeviceHits = Object.values(devices).reduce((a, b) => a + b, 0) || 1;

  // Site entries
  const siteEntries = Object.entries(sites);

  return (
    <>
      {/* Date Range Picker */}
      <div style={styles.filterRow}>
        <div style={styles.filterGroup}>
          {[
            { label: "Today", days: 1 },
            { label: "7 Days", days: 7 },
            { label: "30 Days", days: 30 },
            { label: "90 Days", days: 90 },
          ].map(({ label, days }) => (
            <button
              key={days}
              style={filterBtnStyle(range === days)}
              onClick={() => setRange(days)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => fetchAnalytics(range)}
          style={{ ...styles.actionBtn, color: "var(--green)", borderColor: "var(--green)", background: "transparent" }}
          className="reply-btn"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--green-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={18} color="var(--green)" />
            </div>
          </div>
          <div style={styles.statNum}>{summary.totalPageViews.toLocaleString()}</div>
          <div style={styles.statLabel}>Page Views</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Gamepad2 size={18} color="#7c3aed" />
            </div>
          </div>
          <div style={{ ...styles.statNum, color: "#7c3aed" }}>{summary.totalGameSessions.toLocaleString()}</div>
          <div style={styles.statLabel}>Game Sessions</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clock size={18} color="#d97706" />
            </div>
          </div>
          <div style={{ ...styles.statNum, color: "#d97706" }}>{formatDuration(summary.totalPlayTimeMs)}</div>
          <div style={styles.statLabel}>Total Play Time</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={18} color="#2563eb" />
            </div>
          </div>
          <div style={{ ...styles.statNum, color: "#2563eb" }}>{summary.uniqueVisitors.toLocaleString()}</div>
          <div style={styles.statLabel}>Unique Visitors</div>
        </div>
      </div>

      {/* Trend Chart */}
      <div style={{ ...styles.card, marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Daily Activity</h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0" }}>Page views and game sessions over time</p>
          </div>
          <div style={{ display: "flex", gap: "16px", fontSize: "12px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "var(--green)", display: "inline-block" }} />
              Views
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#7c3aed", display: "inline-block" }} />
              Sessions
            </span>
          </div>
        </div>
        
        {chartDays.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: "14px" }}>
            No data for this period yet.
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "160px", padding: "0 0 28px" }}>
            {chartDays.map((day, i) => {
              const viewsH = Math.max((day.pageViews / maxPageViews) * 130, 2);
              const sessionsH = Math.max((day.sessions / maxSessions) * 130, 2);
              return (
                <div key={day.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "130px" }}>
                    <div
                      style={{
                        width: "100%",
                        maxWidth: "16px",
                        minWidth: "4px",
                        height: `${viewsH}px`,
                        background: "var(--green)",
                        borderRadius: "3px 3px 0 0",
                        transition: "height 0.3s ease",
                        opacity: 0.85,
                      }}
                      title={`${day.pageViews} views`}
                    />
                    <div
                      style={{
                        width: "100%",
                        maxWidth: "16px",
                        minWidth: "4px",
                        height: `${sessionsH}px`,
                        background: "#7c3aed",
                        borderRadius: "3px 3px 0 0",
                        transition: "height 0.3s ease",
                        opacity: 0.85,
                      }}
                      title={`${day.sessions} sessions`}
                    />
                  </div>
                  <span style={{
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    position: "absolute",
                    bottom: "-24px",
                    whiteSpace: "nowrap",
                    transform: chartDays.length > 14 ? "rotate(-45deg)" : "none",
                    transformOrigin: "top center",
                  }}>
                    {chartDays.length <= 14 ? formatShortDate(day.date) : (i % Math.ceil(chartDays.length / 10) === 0 ? formatShortDate(day.date) : "")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two Column: Games + Sites/Devices */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        {/* Game Popularity */}
        <div style={styles.card}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px" }}>
            <Gamepad2 size={16} style={{ verticalAlign: "-3px", marginRight: "6px" }} />
            Game Popularity
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>Ranked by session count</p>
          
          {games.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "14px", textAlign: "center", padding: "20px 0" }}>No game data yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {games.map((game, idx) => {
                const maxSess = games[0]?.sessions || 1;
                const barWidth = Math.max((game.sessions / maxSess) * 100, 5);
                return (
                  <div key={game.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{game.name}</span>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {game.sessions} session{game.sessions !== 1 ? "s" : ""} · avg {formatDuration(game.avgMs)}
                      </span>
                    </div>
                    <div style={{ height: "8px", background: "var(--bg-subtle)", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${barWidth}%`,
                        background: gameColor(idx),
                        borderRadius: "4px",
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sites + Devices */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Site Breakdown */}
          <div style={styles.card}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px" }}>
              <Globe size={16} style={{ verticalAlign: "-3px", marginRight: "6px" }} />
              Site Breakdown
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>Traffic by subdomain</p>
            
            {siteEntries.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "14px", textAlign: "center", padding: "12px 0" }}>No site data yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {siteEntries.map(([siteName, stats]) => (
                  <div key={siteName} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--bg-subtle)", borderRadius: "8px" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{siteName}</div>
                    </div>
                    <div style={{ display: "flex", gap: "16px" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--green)" }}>{stats.pageViews}</div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Views</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "16px", fontWeight: 700, color: "#7c3aed" }}>{stats.sessions}</div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Sessions</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Device Split */}
          <div style={styles.card}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px" }}>
              <Monitor size={16} style={{ verticalAlign: "-3px", marginRight: "6px" }} />
              Device Split
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>Desktop vs mobile</p>
            
            {Object.keys(devices).length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "14px", textAlign: "center", padding: "12px 0" }}>No device data yet.</p>
            ) : (
              <div>
                {/* Stacked bar */}
                <div style={{ height: "12px", borderRadius: "6px", overflow: "hidden", display: "flex", marginBottom: "12px" }}>
                  {Object.entries(devices).map(([device, count], idx) => (
                    <div key={device} style={{
                      width: `${(count / totalDeviceHits) * 100}%`,
                      background: idx === 0 ? "var(--green)" : idx === 1 ? "#7c3aed" : "#d97706",
                      transition: "width 0.5s ease",
                    }} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  {Object.entries(devices).map(([device, count], idx) => (
                    <div key={device} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
                      <span style={{
                        width: "10px", height: "10px", borderRadius: "50%",
                        background: idx === 0 ? "var(--green)" : idx === 1 ? "#7c3aed" : "#d97706",
                        display: "inline-block"
                      }} />
                      <span style={{ fontWeight: 500, textTransform: "capitalize" as const }}>{device}</span>
                      <span style={{ color: "var(--text-muted)" }}>
                        {count} ({Math.round((count / totalDeviceHits) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div style={styles.card}>
        <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px" }}>
          <Activity size={16} style={{ verticalAlign: "-3px", marginRight: "6px" }} />
          Recent Activity
        </h3>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>Latest tracked events</p>

        {recentEvents.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "14px", textAlign: "center", padding: "20px 0" }}>
            No events recorded yet. Events will appear here once the tracker is active on the games and fit sites.
          </p>
        ) : (
          <div style={{ maxHeight: "360px", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-muted)", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Event</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-muted)", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Game</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-muted)", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Site</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-muted)", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Device</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-muted)", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Duration</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", color: "var(--text-muted)", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((evt, idx) => {
                  const eventLabel = evt.event.replace(/_/g, " ");
                  const eventColor =
                    evt.event === "page_view" ? "var(--green)" :
                    evt.event === "game_start" ? "#4f46e5" :
                    evt.event === "game_end" ? "#dc2626" :
                    evt.event === "heartbeat" ? "#d97706" : "#64748b";
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border-light)" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: "4px",
                          padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600,
                          background: eventColor + "14", color: eventColor, textTransform: "capitalize",
                        }}>
                          {evt.event === "page_view" && <TrendingUp size={11} />}
                          {evt.event === "game_start" && <Zap size={11} />}
                          {evt.event === "game_end" && <Activity size={11} />}
                          {evt.event === "heartbeat" && <Clock size={11} />}
                          {eventLabel}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--text-primary)", fontWeight: 500 }}>{evt.game}</td>
                      <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{evt.site}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-muted)" }}>
                          {evt.device === "mobile" ? <Smartphone size={12} /> : <Monitor size={12} />}
                          {evt.device}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--text-muted)" }}>
                        {evt.duration ? formatDurationLong(evt.duration) : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{formatDate(evt.timestamp)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Feedback Tab Component (extracted from original)
// ═══════════════════════════════════════════════════════════════════════════

function FeedbackTab({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "type">("newest");
  const [archiving, setArchiving] = useState<string | null>(null);
  const [replyTemplates, setReplyTemplates] = useState<Record<string, number>>({});

  const fetchFeedback = useCallback(async (t: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.status === 401) {
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");
      setItems(data.items || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load feedback.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchFeedback(token);
  }, [token, fetchFeedback]);

  const handleArchive = async (item: FeedbackItem) => {
    if (!confirm("Mark this feedback as resolved and archive it?")) return;
    setArchiving(item._blobUrl);
    try {
      const res = await fetch("/api/feedback", {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ blobUrl: item._blobUrl, blobName: item._blobName, action: "archive" }),
      });
      if (!res.ok) throw new Error("Failed to archive");
      setItems(prev => prev.filter(i => i._blobUrl !== item._blobUrl));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setArchiving(null);
    }
  };

  const exportCSV = () => {
    const headers = ["Date", "Type", "Source", "App Version", "Name", "Email", "Message", "Device OS", "Browser"];
    const rows = sortedFiltered.map(item => {
      const ua = parseUA(item.userAgent);
      return [
        formatDate(item.submittedAt || item.receivedAt),
        item.type,
        item.source,
        item.appVersion || "unknown",
        item.name,
        item.email,
        `"${item.message.replace(/"/g, '""')}"`,
        ua.os,
        ua.browser
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `bodee-feedback-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sources = ["All", ...Array.from(new Set(items.map((i) => i.source)))];
  const filtered = filter === "All" ? items : items.filter((i) => i.source === filter);

  const sortedFiltered = [...filtered].sort((a, b) => {
    const timeA = new Date(a.submittedAt || a.receivedAt).getTime();
    const timeB = new Date(b.submittedAt || b.receivedAt).getTime();
    if (sortOrder === "newest") return timeB - timeA;
    if (sortOrder === "oldest") return timeA - timeB;
    if (sortOrder === "type") return a.type.localeCompare(b.type);
    return 0;
  });

  const typeCount = (type: string) =>
    items.filter((i) => i.type?.toLowerCase().includes(type)).length;

  return (
    <>
      {/* Stats row */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{items.length}</div>
          <div style={styles.statLabel}>Total Feedback</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statNum, color: typeColor("bug") }}>{typeCount("bug")}</div>
          <div style={styles.statLabel}>Bug Reports</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statNum, color: typeColor("feature") }}>{typeCount("feature")}</div>
          <div style={styles.statLabel}>Feature Requests</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statNum, color: typeColor("general") }}>{typeCount("general")}</div>
          <div style={styles.statLabel}>General</div>
        </div>
      </div>

      {/* Filter & Sort Row */}
      <div style={styles.filterRow}>
        <div style={styles.filterGroup}>
          {sources.map((s) => (
            <button
              key={s}
              style={filterBtnStyle(filter === s)}
              onClick={() => setFilter(s)}
            >
              {s} {s !== "All" ? `(${items.filter((i) => i.source === s).length})` : `(${items.length})`}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={exportCSV}
            style={{ ...styles.actionBtn, color: "var(--text-secondary)" }}
            className="action-btn"
          >
            <Download size={14} /> Export CSV
          </button>
          <span style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>Sort by:</span>
          <select 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value as any)}
            style={styles.selectInput}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="type">Type</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "14px 20px", color: "#dc2626", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Loading spinner */}
      {loading && (
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
        </div>
      )}

      {/* Feedback cards */}
      {!loading && (
        <div style={styles.cardList}>
          {sortedFiltered.length === 0 ? (
            <div style={styles.emptyState}>
              <Inbox size={48} strokeWidth={1.5} style={{ marginBottom: "16px", color: "var(--border)" }} />
              No feedback yet. When users submit feedback it will appear here.
            </div>
          ) : (
            sortedFiltered.map((item) => {
              const ua = parseUA(item.userAgent);
              
              const tplIdx = replyTemplates[item._blobUrl] || 0;
              const tpl = QUICK_REPLIES[tplIdx];
              const mailtoSubject = encodeURIComponent(`Re: Your feedback on ${item.source}`);
              const mailtoBody = encodeURIComponent(
                tpl.body.replace("{name}", item.name).replace("{message}", item.message)
              );
              const mailtoHref = item.email
                ? `mailto:${item.email}?subject=${mailtoSubject}&body=${mailtoBody}`
                : null;
              
              const isArchiving = archiving === item._blobUrl;

              return (
                <div key={item._blobUrl} style={styles.card} className="feedback-card">
                  <div style={styles.cardHeader}>
                    <div style={styles.cardMeta}>
                      <span style={typePillStyle(item.type)}>{item.type}</span>
                      <span style={styles.sourceBadge}>
                        {item.source}
                      </span>
                      {(item.appVersion && item.appVersion !== "unknown" || ua.os !== "Unknown") && (
                        <span style={{ ...styles.sourceBadge, color: "var(--text-muted)" }}>
                          {ua.type === "mobile" ? <Smartphone size={12} /> : <Monitor size={12} />}
                          {ua.os !== "Unknown" ? `${ua.os} ` : ""}
                          {ua.browser !== "Unknown" ? `(${ua.browser}) ` : ""}
                          {item.appVersion && item.appVersion !== "unknown" ? `v${item.appVersion}` : ""}
                        </span>
                      )}
                    </div>
                    <span style={styles.cardDate}>
                      {formatDate(item.submittedAt || item.receivedAt)}
                    </span>
                  </div>

                  <div style={styles.cardPerson}>
                    <strong style={{ color: "var(--text-primary)" }}>{item.name}</strong>
                    {item.email && (
                      <> · <span style={{ color: "var(--text-secondary)" }}>{item.email}</span></>
                    )}
                  </div>

                  <div style={styles.cardMsg}>{item.message}</div>

                  <div style={styles.actionsRow}>
                    <div style={styles.replyWrapper}>
                      {mailtoHref ? (
                        <>
                          <a href={mailtoHref} style={styles.replyBtn} className="reply-btn">
                            <Mail size={14} /> Reply via Email
                          </a>
                          <select 
                            style={{ ...styles.selectInput, padding: "8px", border: "1px solid var(--border)", background: "transparent" }}
                            value={tplIdx}
                            onChange={(e) => setReplyTemplates(prev => ({ ...prev, [item._blobUrl]: Number(e.target.value) }))}
                          >
                            {QUICK_REPLIES.map((r, i) => (
                              <option key={i} value={i}>{r.label}</option>
                            ))}
                          </select>
                        </>
                      ) : (
                        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>No email provided</span>
                      )}
                    </div>
                    
                    <button 
                      style={styles.archiveBtn} 
                      className="archive-btn"
                      onClick={() => handleArchive(item)}
                      disabled={isArchiving}
                    >
                      {isArchiving ? (
                        <div style={{ ...styles.spinner, width: "14px", height: "14px", borderWidth: "2px" }} />
                      ) : (
                        <CheckCircle size={16} />
                      )}
                      {isArchiving ? "Archiving..." : "Mark as Resolved"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Admin Page
// ═══════════════════════════════════════════════════════════════════════════

export default function AdminPage() {
  const [token, setToken] = useState<string>("");
  const [inputPw, setInputPw] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"analytics" | "feedback">("analytics");

  // On mount, check localStorage for saved token
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setToken(saved);
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPw.trim()) return;
    setLoading(true);
    setLoginError("");
    const res = await fetch("/api/feedback", {
      headers: { Authorization: `Bearer ${inputPw.trim()}` },
    });
    setLoading(false);
    if (res.ok) {
      localStorage.setItem(STORAGE_KEY, inputPw.trim());
      setToken(inputPw.trim());
      setIsLoggedIn(true);
    } else {
      setLoginError("Incorrect password.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken("");
    setIsLoggedIn(false);
    setInputPw("");
  };

  // ── Login Screen ──────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .login-btn:hover { background: var(--green-dark) !important; }
          .login-input:focus { border-color: var(--green) !important; box-shadow: 0 0 0 3px rgba(54, 157, 111, 0.1) !important; }
        `}</style>
        <div style={styles.loginWrap}>
          <div style={styles.loginCard}>
            <div style={styles.logo}>
              <Shield size={28} color="var(--green)" /> Bodee Admin
            </div>
            <div style={styles.logoSub}>Analytics & Feedback Dashboard</div>
            <form onSubmit={handleLogin}>
              <label style={styles.label} htmlFor="admin-pw">Admin Password</label>
              <input
                id="admin-pw"
                type="password"
                autoComplete="current-password"
                value={inputPw}
                onChange={(e) => setInputPw(e.target.value)}
                placeholder="Enter password…"
                style={styles.input}
                className="login-input"
                required
              />
              <button type="submit" style={styles.btn} className="login-btn" disabled={loading}>
                {loading ? "Checking…" : "Sign In"}
              </button>
            </form>
            {loginError && <p style={styles.errMsg}>{loginError}</p>}
          </div>
        </div>
      </>
    );
  }

  // ── Tab Styles ────────────────────────────────────────────────────────────
  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: isActive ? 700 : 500,
    color: isActive ? "var(--green)" : "var(--text-muted)",
    background: "none",
    border: "none",
    borderBottom: isActive ? "2px solid var(--green)" : "2px solid transparent",
    cursor: "pointer",
    transition: "all 0.15s",
    marginBottom: "-1px",
  });

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .feedback-card:hover { border-color: var(--green) !important; box-shadow: var(--shadow-md) !important; }
        .reply-btn:hover { background: var(--green-light) !important; border-color: var(--green) !important; }
        .archive-btn:hover { color: var(--text-primary) !important; }
        .action-btn:hover { background: var(--bg-subtle) !important; color: var(--text-primary) !important; }
        .tab-btn:hover { color: var(--text-primary) !important; }
        @media (max-width: 768px) {
          .analytics-grid-2col { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={styles.page}>
        {/* Top bar */}
        <div style={styles.topbar}>
          <div style={styles.topbarLogo}>
            <Shield size={20} color="var(--green)" /> Bodee Admin
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button onClick={handleLogout} style={styles.actionBtn} className="action-btn">
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--border)",
          padding: "0 32px",
          display: "flex",
          gap: "4px",
        }}>
          <button
            style={tabStyle(activeTab === "analytics")}
            onClick={() => setActiveTab("analytics")}
            className="tab-btn"
          >
            <BarChart3 size={16} /> Analytics
          </button>
          <button
            style={tabStyle(activeTab === "feedback")}
            onClick={() => setActiveTab("feedback")}
            className="tab-btn"
          >
            <MessageSquare size={16} /> Feedback
          </button>
        </div>

        <div style={styles.content}>
          {activeTab === "analytics" && <AnalyticsTab token={token} />}
          {activeTab === "feedback" && <FeedbackTab token={token} />}
        </div>
      </div>
    </>
  );
}
