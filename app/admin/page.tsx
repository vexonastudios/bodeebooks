"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, RefreshCw, LogOut, Mail, Inbox, AlertCircle } from "lucide-react";

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
  if (t.includes("bug")) return "#dc2626"; // red
  if (t.includes("feature")) return "#4f46e5"; // indigo
  if (t.includes("content")) return "#d97706"; // amber
  if (t.includes("general")) return "var(--green)"; // bodee green
  return "#64748b";
}

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
  logoutBtn: {
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
  filterRow: { display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" as const },
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
    fontWeight: 500
  },
  cardDate: { fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap" as const },
  cardPerson: { fontSize: "14px", color: "var(--text-secondary)", marginBottom: "12px", fontWeight: 500 },
  cardMsg: { fontSize: "15px", color: "var(--text-primary)", lineHeight: 1.6, whiteSpace: "pre-wrap" as const },
  replyBtn: {
    marginTop: "16px",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    color: "var(--green)",
    fontSize: "13px",
    cursor: "pointer",
    textDecoration: "none",
    fontWeight: 500,
    transition: "all 0.15s"
  },
  emptyState: { textAlign: "center" as const, color: "var(--text-muted)", padding: "80px 0", fontSize: "15px", display: "flex", flexDirection: "column", alignItems: "center" },
  loadingWrap: { display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" },
  spinner: { width: "36px", height: "36px", border: "3px solid var(--border)", borderTopColor: "var(--green)", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
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

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .feedback-card:hover { border-color: var(--green) !important; box-shadow: var(--shadow-md) !important; }
        .reply-btn:hover { background: var(--green-light) !important; border-color: var(--green) !important; }
        .logout-btn:hover { background: var(--bg-subtle) !important; color: var(--text-primary) !important; }
      `}</style>
      <div style={styles.page}>
        {/* Top bar */}
        <div style={styles.topbar}>
          <div style={styles.topbarLogo}>
            <Shield size={20} color="var(--green)" /> Bodee Admin
            <span style={styles.topbarSub}>— Feedback Hub</span>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              onClick={() => fetchFeedback(token)}
              style={{ ...styles.logoutBtn, color: "var(--green)", borderColor: "var(--green)", background: "transparent" }}
              className="reply-btn"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={handleLogout} style={styles.logoutBtn} className="logout-btn">
              <LogOut size={14} /> Sign Out
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
              {filtered.length === 0 ? (
                <div style={styles.emptyState}>
                  <Inbox size={48} strokeWidth={1.5} style={{ marginBottom: "16px", color: "var(--border)" }} />
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
                            <span style={{ ...styles.sourceBadge, color: "var(--text-muted)" }}>v{item.appVersion}</span>
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

                      {mailtoHref && (
                        <a href={mailtoHref} style={styles.replyBtn} className="reply-btn">
                          <Mail size={14} /> Reply via Email
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
