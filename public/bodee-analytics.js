/* ============================================================
   BODEE ANALYTICS — Lightweight Usage Tracker
   Include on games.bodeebooks.com, fit.bodeebooks.com,
   and www.bodeebooks.com.
   
   Tracks: page views, session starts/ends, session duration, 
   device type, anonymous visitor IDs.
   
   ~2KB minified. Zero dependencies. Uses sendBeacon for reliability.
   ============================================================ */

(function () {
  if (window.__bodeeAnalytics) return;
  window.__bodeeAnalytics = true;

  var ENDPOINT = "https://www.bodeebooks.com/api/analytics/";
  var HEARTBEAT_MS = 180000; // 3 minutes
  var BATCH_INTERVAL_MS = 30000; // Flush batch every 30 seconds

  // ── Bot/crawler detection ───────────────────────────────────────────
  var ua = navigator.userAgent || "";
  if (/bot|crawl|spider|slurp|bingbot|googlebot|yandex|baidu|duckduck|ia_archiver|facebookexternalhit|twitterbot|linkedinbot|semrush|ahref|mj12bot|dotbot|petalbot|bytespider/i.test(ua)) {
    return; // Don't track bots
  }

  // ── Detect site and page context ──────────────────────────────────
  var hostname = window.location.hostname;
  var site = hostname;
  var pathname = window.location.pathname.replace(/\/$/, ""); // strip trailing slash

  // Skip tracking on admin and API pages
  if (pathname.startsWith("/admin") || pathname.startsWith("/api")) {
    return;
  }

  // Determine site type for context-aware event naming
  var siteType = "games"; // default
  if (hostname === "www.bodeebooks.com" || hostname === "bodeebooks.com") {
    siteType = "audiobooks";
  } else if (hostname.includes("fit")) {
    siteType = "fit";
  }

  // Determine if this page warrants a session-start event
  // (not just a page_view)
  function shouldFireSessionStart() {
    if (siteType === "audiobooks") {
      // Only fire listen_start on actual audiobook pages
      return pathname.startsWith("/listen/");
    }
    // Games and fit pages always get a session start
    return true;
  }

  function startEventName() {
    if (siteType === "audiobooks") return "listen_start";
    if (siteType === "fit") return "workout_start";
    return "game_start";
  }

  function endEventName() {
    if (siteType === "audiobooks") return "listen_end";
    if (siteType === "fit") return "workout_end";
    return "game_end";
  }

  var rawPath = pathname.replace(/^\//, "").replace(/\.html$/, "");

  // Content name detection from page title or pathname
  function detectContentName() {
    var title = document.title || "";
    // Strip common suffixes
    title = title
      .replace(/\s*[\|–—]\s*Bodee.*$/i, "")
      .replace(/\s*[\|–—]\s*Family Game Hub.*$/i, "")
      .replace(/\s*[\|–—]\s*BodeeFit.*$/i, "")
      .trim();

    if (title && title.length < 60) return title;

    // Fallback: use pathname
    if (rawPath) {
      return rawPath
        .split("/")
        .pop()
        .replace(/-/g, " ")
        .replace(/\b\w/g, function (l) {
          return l.toUpperCase();
        });
    }

    return site.includes("fit") ? "BodeeFit" : "Hub";
  }

  // ── Anonymous Visitor ID ──────────────────────────────────────────────
  function getVisitorId() {
    var key = "_ba_vid";
    var vid = "";
    try {
      vid = localStorage.getItem(key) || "";
    } catch (e) {
      /* no localStorage */
    }
    if (vid) return vid;

    var raw =
      navigator.userAgent +
      screen.width +
      "x" +
      screen.height +
      navigator.language +
      new Date().getTimezoneOffset() +
      Math.random().toString(36).slice(2);
    var hash = 0;
    for (var i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
    }
    vid = "v_" + Math.abs(hash).toString(36) + "_" + Date.now().toString(36);

    try {
      localStorage.setItem(key, vid);
    } catch (e) {
      /* no localStorage */
    }
    return vid;
  }

  // ── Device detection ──────────────────────────────────────────────────
  function detectDevice() {
    var uaLower = ua.toLowerCase();
    if (/mobile|android|iphone|ipad|ipod|blackberry|opera mini|iemobile/.test(uaLower)) {
      return "mobile";
    }
    if (/tablet|ipad/.test(uaLower)) return "tablet";
    return "desktop";
  }

  // ── State ─────────────────────────────────────────────────────────────
  var visitorId = getVisitorId();
  var device = detectDevice();
  var sessionStartTime = Date.now();
  var contentName = "";
  var eventQueue = [];
  var heartbeatTimer = null;
  var batchTimer = null;
  var isActive = true;
  var lastHeartbeatMs = 0;
  var hasEnded = false; // Prevent double end-event firing
  var isSessionPage = false; // Whether this page fires session events

  // ── Queue and send events ─────────────────────────────────────────────
  function queueEvent(event, extra) {
    var evt = {
      event: event,
      site: site,
      game: contentName || detectContentName(),
      device: device,
      visitorId: visitorId,
      timestamp: new Date().toISOString(),
    };
    if (extra) {
      for (var k in extra) {
        if (extra.hasOwnProperty(k)) evt[k] = extra[k];
      }
    }
    eventQueue.push(evt);
  }

  function flushQueue() {
    if (eventQueue.length === 0) return;

    var batch = eventQueue.splice(0, eventQueue.length);
    var payload = JSON.stringify(batch);

    // Use sendBeacon for reliability (works during page unload)
    if (navigator.sendBeacon) {
      var blob = new Blob([payload], { type: "application/json" });
      var sent = navigator.sendBeacon(ENDPOINT, blob);
      if (sent) return;
    }

    // Fallback: fire-and-forget fetch
    try {
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(function () {});
    } catch (e) {
      /* silently fail */
    }
  }

  // ── Heartbeat ─────────────────────────────────────────────────────────
  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(function () {
      if (!isActive) return;
      var elapsed = Date.now() - sessionStartTime - lastHeartbeatMs;
      lastHeartbeatMs = Date.now() - sessionStartTime;
      queueEvent("heartbeat", { duration: elapsed });
    }, HEARTBEAT_MS);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  // ── Batch timer ───────────────────────────────────────────────────────
  function startBatchTimer() {
    batchTimer = setInterval(flushQueue, BATCH_INTERVAL_MS);
  }

  // ── Visibility tracking ───────────────────────────────────────────────
  function handleVisibilityChange() {
    if (document.hidden) {
      isActive = false;
    } else {
      isActive = true;
    }
  }

  // ── End session (called once) ─────────────────────────────────────────
  function endSession() {
    if (hasEnded) return;
    hasEnded = true;

    if (isSessionPage) {
      // Only send the remaining duration since the last heartbeat
      // to avoid double-counting (heartbeats already sent their chunks)
      var remainingDuration = Date.now() - sessionStartTime - lastHeartbeatMs;
      queueEvent(endEventName(), { duration: remainingDuration });
    }
    stopHeartbeat();
    flushQueue();
  }

  // ── Initialize ────────────────────────────────────────────────────────
  function init() {
    contentName = detectContentName();
    isSessionPage = shouldFireSessionStart();

    // Always track page view
    queueEvent("page_view");

    // Only fire session start on content pages
    if (isSessionPage) {
      queueEvent(startEventName());
      startHeartbeat();
    }

    // Start batch sending
    startBatchTimer();

    // Track visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // On page unload, send final end event with total duration (once only)
    window.addEventListener("beforeunload", endSession);
    window.addEventListener("pagehide", endSession);

    // Flush initial events
    setTimeout(flushQueue, 1000);
  }

  // Wait for DOM if needed
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
