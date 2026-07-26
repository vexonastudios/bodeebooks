/* ============================================================
   BODEE ANALYTICS — Lightweight Usage Tracker
   Include on games.bodeebooks.com and fit.bodeebooks.com
   
   Tracks: page views, game starts/ends, session duration, 
   device type, anonymous visitor IDs.
   
   ~2KB minified. Zero dependencies. Uses sendBeacon for reliability.
   ============================================================ */

(function () {
  if (window.__bodeeAnalytics) return;
  window.__bodeeAnalytics = true;

  var ENDPOINT = "https://www.bodeebooks.com/api/analytics/";
  var HEARTBEAT_MS = 180000; // 3 minutes
  var BATCH_INTERVAL_MS = 30000; // Flush batch every 30 seconds

  // ── Detect site and game ──────────────────────────────────────────────
  var hostname = window.location.hostname;
  var site = hostname; // e.g., "games.bodeebooks.com"
  var pathname = window.location.pathname.replace(/^\//, "").replace(/\.html$/, "");

  // Game name detection from page title or pathname
  function detectGame() {
    // Try getting it from the page title (most game pages set descriptive titles)
    var title = document.title || "";
    // Strip common suffixes
    title = title
      .replace(/\s*[\|–—]\s*Bodee.*$/i, "")
      .replace(/\s*[\|–—]\s*Family Game Hub.*$/i, "")
      .replace(/\s*[\|–—]\s*BodeeFit.*$/i, "")
      .trim();

    if (title && title.length < 60) return title;

    // Fallback: use pathname
    if (pathname) {
      return pathname
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

    // Generate a simple hash from available entropy
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
    var ua = navigator.userAgent.toLowerCase();
    if (
      /mobile|android|iphone|ipad|ipod|blackberry|opera mini|iemobile/.test(ua)
    ) {
      return "mobile";
    }
    if (/tablet|ipad/.test(ua)) return "tablet";
    return "desktop";
  }

  // ── State ─────────────────────────────────────────────────────────────
  var visitorId = getVisitorId();
  var device = detectDevice();
  var sessionStartTime = Date.now();
  var gameName = "";
  var eventQueue = [];
  var heartbeatTimer = null;
  var batchTimer = null;
  var isActive = true;
  var lastHeartbeatMs = 0;

  // ── Queue and send events ─────────────────────────────────────────────
  function queueEvent(event, extra) {
    var evt = {
      event: event,
      site: site,
      game: gameName || detectGame(),
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

  // ── Initialize ────────────────────────────────────────────────────────
  function init() {
    gameName = detectGame();

    // Page view
    queueEvent("page_view");

    // Game start (immediate — user navigated to this page)
    queueEvent("game_start");

    // Start heartbeat and batch sending
    startHeartbeat();
    startBatchTimer();

    // Track visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // On page unload, send final game_end with total duration
    window.addEventListener("beforeunload", function () {
      var totalDuration = Date.now() - sessionStartTime;
      queueEvent("game_end", { duration: totalDuration });
      flushQueue();
    });

    // Also send on pagehide (for mobile browsers)
    window.addEventListener("pagehide", function () {
      var totalDuration = Date.now() - sessionStartTime;
      queueEvent("game_end", { duration: totalDuration });
      flushQueue();
    });

    // Flush initial page_view + game_start
    setTimeout(flushQueue, 1000);
  }

  // Wait for DOM if needed
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
