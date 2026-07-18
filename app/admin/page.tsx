"use client";

import { useState, useEffect, useCallback } from "react";

type FeedbackItem = {
  source: string;
  type: string;
  name: string;
  email: string;
  message: string;
  submittedAt: string;
  appVersion: string;
  receivedAt: string;
  _blobUrl: string;
  _blobName: string;
};

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

function typeColor(type: string) {
  const t = type.toLowerCase();
  if (t.includes("bug")) return "#ef4444";
  if (t.includes("feature")) return "#6366f1";
  if (t.includes("content")) return "#f59e0b";
  if (t.includes("general")) return "#22c55e";
  return "#64748b";
}

function filterBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "7px 16px",
    background: active ? "#6366f1" : "#1e2535",
    border: `1px solid ${active ? "#6366f1" : "#2d3748"}`,
    borderRadius: "20px",
    color: active ? "#fff" : "#94a3b8",
    fontSize: "13px",
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
    background: typeColor(type) + "22",
    color: typeColor(type),
    border: `1px solid ${typeColor(type)}44`,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#0f1117", padding: "0" },
  loginWrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0f1117 0%, #1a1f2e 100%)",
  },
  loginCard: {
    background: "#1e2535",
    border: "1px solid #2d3748",
    borderRadius: "16px",
    padding: "40px 48px",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
  },
  logo: { fontSize: "28px", fontWeight: 800, color: "#fff", marginBottom: "4px" },
  logoSub: { fontSize: "13px", color: "#64748b", marginBottom: "32px" },
  label: { display: "block", fontSize: "13px", fontWeight: 600, color: "#94a3b8", marginBottom: "8px", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  input: {
    width: "100%",
    padding: "12px 16px",
    background: "#0f1117",
    border: "1px solid #2d3748",
    borderRadius: "10px",
    color: "#e2e8f0",
    fontSize: "15px",
    outline: "none",
    marginBottom: "20px",
  },
  btn: {
    width: "100%",
    padding: "13px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    border: "none",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },
  errMsg: { color: "#ef4444", fontSize: "13px", marginTop: "12px", textAlign: "center" as const },
  topbar: {
    background: "#1e2535",
    borderBottom: "1px solid #2d3748",
    padding: "0 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: "60px",
  },
  topbarLogo: { fontSize: "16px", fontWeight: 800, color: "#fff" },
  topbarSub: { fontSize: "12px", color: "#64748b", marginLeft: "8px" },
  logoutBtn: {
    padding: "7px 16px",
    background: "transparent",
    border: "1px solid #2d3748",
    borderRadius: "8px",
    color: "#94a3b8",
    fontSize: "13px",
    cursor: "pointer",
  },
  content: { padding: "32px", maxWidth: "1100px", margin: "0 auto" },
  statsRow: { display: "flex", gap: "16px", marginBottom: "32px", flexWrap: "wrap" as const },
  statCard: {
    background: "#1e2535",
    border: "1px solid #2d3748",
    borderRadius: "12px",
    padding: "20px 24px",
    flex: "1",
    minWidth: "140px",
  },
  statNum: { fontSize: "32px", fontWeight: 800, color: "#fff" },
  statLabel: { fontSize: "12px", color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  filterRow: { display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" as const },
  cardList: { display: "flex", flexDirection: "column" as const, gap: "12px" },
  card: {
    background: "#1e2535",
    border: "1px solid #2d3748",
    borderRadius: "12px",
    padding: "20px 24px",
    transition: "border-color 0.15s",
  },
  cardHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px", gap: "12px", flexWrap: "wrap" as const },
  cardMeta: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" as const },
  sourceBadge: {
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    background: "#0f1117",
    color: "#64748b",
    border: "1px solid #2d3748",
  },
  cardDate: { fontSize: "12px", color: "#475569", whiteSpace: "nowrap" as const },
  cardPerson: { fontSize: "13px", color: "#94a3b8", marginBottom: "10px" },
  cardMsg: { fontSize: "15px", color: "#e2e8f0", lineHeight: 1.6, whiteSpace: "pre-wrap" as const },
  replyBtn: {
    marginTop: "14px",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 14px",
    background: "transparent",
    border: "1px solid #2d3748",
    borderRadius: "8px",
    color: "#6366f1",
    fontSize: "13px",
    cursor: "pointer",
    textDecoration: "none",
  },
  emptyState: { textAlign: "center" as const, color: "#475569", padding: "60px 0", fontSize: "15px" },
  loadingWrap: { display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" },
  spinner: { width: "36px", height: "36px", border: "3px solid #2d3748", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
};

export default function AdminPage() {
  const [token, setToken] = useState<string>("");
  const [inputPw, setInputPw] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");

  // On mount, check localStorage for saved token
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setToken(saved);
      setIsLoggedIn(true);
    }
  }, []);

  const fetchFeedback = useCallback(async (t: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.status === 401) {
        setIsLoggedIn(false);
        localStorage.removeItem(STORAGE_KEY);
        setLoginError("Session expired. Please log in again.");
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

  // Fetch when logged in
  useEffect(() => {
    if (isLoggedIn && token) {
      fetchFeedback(token);
    }
  }, [isLoggedIn, token, fetchFeedback]);

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
      const data = await res.json();
      localStorage.setItem(STORAGE_KEY, inputPw.trim());
      setToken(inputPw.trim());
      setItems(data.items || []);
      setIsLoggedIn(true);
    } else {
      setLoginError("Incorrect password.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken("");
    setIsLoggedIn(false);
    setItems([]);
    setInputPw("");
  };

  const sources = ["All", ...Array.from(new Set(items.map((i) => i.source)))];
  const filtered = filter === "All" ? items : items.filter((i) => i.source === filter);

  const typeCount = (type: string) =>
    items.filter((i) => i.type?.toLowerCase().includes(type)).length;

  // ── Login Screen ──────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={styles.loginWrap}>
          <div style={styles.loginCard}>
            <div style={styles.logo}>🛡️ Bodee Admin</div>
            <div style={styles.logoSub}>Feedback Management System</div>
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
                required
              />
              <button type="submit" style={styles.btn} disabled={loading}>
                {loading ? "Checking…" : "Sign In →"}
              </button>
            </form>
            {loginError && <p style={styles.errMsg}>{loginError}</p>}
          </div>
        </div>
      </>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .feedback-card:hover { border-color: #6366f1 !important; }
        .reply-btn:hover { background: #1e1e3f !important; border-color: #6366f1 !important; }
        .logout-btn:hover { background: #2d3748 !important; color: #e2e8f0 !important; }
      `}</style>
      <div style={styles.page}>
        {/* Top bar */}
        <div style={styles.topbar}>
          <div>
            <span style={styles.topbarLogo}>🛡️ Bodee Admin</span>
            <span style={styles.topbarSub}>— Feedback Hub</span>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={() => fetchFeedback(token)}
              style={{ ...styles.logoutBtn, color: "#6366f1", borderColor: "#6366f1" }}
              className="logout-btn"
            >
              ↻ Refresh
            </button>
            <button onClick={handleLogout} style={styles.logoutBtn} className="logout-btn">
              Sign Out
            </button>
          </div>
        </div>

        <div style={styles.content}>
          {/* Stats row */}
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <div style={styles.statNum}>{items.length}</div>
              <div style={styles.statLabel}>Total Feedback</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNum, color: "#ef4444" }}>{typeCount("bug")}</div>
              <div style={styles.statLabel}>Bug Reports</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNum, color: "#6366f1" }}>{typeCount("feature")}</div>
              <div style={styles.statLabel}>Feature Requests</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNum, color: "#22c55e" }}>{typeCount("general")}</div>
              <div style={styles.statLabel}>General</div>
            </div>
          </div>

          {/* Source filter */}
          {sources.length > 1 && (
            <div style={styles.filterRow}>
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
          )}

          {/* Error */}
          {error && (
            <div style={{ background: "#2a1a1a", border: "1px solid #ef444444", borderRadius: "10px", padding: "14px 20px", color: "#ef4444", marginBottom: "20px" }}>
              ⚠️ {error}
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
              {filtered.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>📬</div>
                  No feedback yet. When users submit feedback it will appear here.
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const mailtoSubject = encodeURIComponent(`Re: Your feedback on ${item.source}`);
                  const mailtoBody = encodeURIComponent(
                    `Hi ${item.name},\n\nThank you for your feedback!\n\n---\nYour original message:\n"${item.message}"\n\n---\n\n`
                  );
                  const mailtoHref = item.email
                    ? `mailto:${item.email}?subject=${mailtoSubject}&body=${mailtoBody}`
                    : null;

                  return (
                    <div key={idx} style={styles.card} className="feedback-card">
                      <div style={styles.cardHeader}>
                        <div style={styles.cardMeta}>
                          <span style={typePillStyle(item.type)}>{item.type}</span>
                          <span style={styles.sourceBadge}>{item.source}</span>
                          {item.appVersion && item.appVersion !== "unknown" && (
                            <span style={{ ...styles.sourceBadge, color: "#475569" }}>v{item.appVersion}</span>
                          )}
                        </div>
                        <span style={styles.cardDate}>
                          {formatDate(item.submittedAt || item.receivedAt)}
                        </span>
                      </div>

                      <div style={styles.cardPerson}>
                        <strong style={{ color: "#e2e8f0" }}>{item.name}</strong>
                        {item.email && (
                          <> · <span style={{ color: "#6366f1" }}>{item.email}</span></>
                        )}
                      </div>

                      <div style={styles.cardMsg}>{item.message}</div>

                      {mailtoHref && (
                        <a href={mailtoHref} style={styles.replyBtn} className="reply-btn">
                          ✉️ Reply via Email
                        </a>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
