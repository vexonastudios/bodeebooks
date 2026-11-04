import type { InstallerChannel } from "../../../shared/guard-installer-release-hint";

type Options = {
  channel: InstallerChannel; version: string | null; onChange: () => void;
  window: Pick<Window, "addEventListener" | "removeEventListener" | "setTimeout" | "clearTimeout">;
  document: Pick<Document, "hidden" | "addEventListener" | "removeEventListener">;
  fetchImpl?: typeof fetch; now?: () => number;
};

export function watchInstallerRelease({ channel, version, onChange, window: win, document: doc,
  fetchImpl = fetch, now = Date.now }: Options) {
  let stopped = false, away = false, failures = 0, lastAttempt = -Infinity;
  let timer: number | undefined, flight: AbortController | null = null;
  const visible = () => !stopped && !away && !doc.hidden;
  function clearTimer() { if (timer !== undefined) win.clearTimeout(timer); timer = undefined; }
  function suspend() { clearTimer(); flight?.abort(); flight = null; lastAttempt = -Infinity; }
  function schedule(delay: number) { clearTimer(); if (visible()) timer = win.setTimeout(check, delay); }
  async function check() {
    if (!visible() || flight) return;
    // Focus and visibility events often arrive together. Coalesce those checks.
    const remaining = 15000 - (now() - lastAttempt);
    if (remaining > 0) { schedule(remaining); return; }
    clearTimer(); lastAttempt = now();
    const controller = new AbortController(); flight = controller;
    const deadline = win.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetchImpl("/guard/download/release/?channel=" + channel, {
        cache: "no-store", credentials: "omit", redirect: "error", signal: controller.signal
      });
      if (!response.ok) throw Error("Release check unavailable");
      const result = await response.json();
      if (result.channel !== channel || typeof result.version !== "string"
        || !/^(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,4})$/.test(result.version)) throw Error("Invalid release check");
      if (controller.signal.aborted || flight !== controller || !visible()) return;
      failures = 0;
      // Refresh the authorized server component only when its version differs.
      // A slow catalog can converge on the next check without a reload loop.
      if (result.version !== version) onChange();
    } catch { if (!controller.signal.aborted || flight === controller) failures++; }
    finally {
      win.clearTimeout(deadline);
      if (flight === controller) {
        flight = null;
        schedule(Math.min(300000, 60000 * 2 ** Math.min(failures, 3)));
      }
    }
  }
  const hide = () => { away = true; suspend(); };
  const show = () => { away = false; void check(); };
  const visibility = () => { if (doc.hidden) suspend(); else void check(); };
  doc.addEventListener("visibilitychange", visibility);
  win.addEventListener("pagehide", hide);
  win.addEventListener("pageshow", show);
  win.addEventListener("focus", check);
  win.addEventListener("online", check);
  void check();
  return () => {
    stopped = true; suspend();
    doc.removeEventListener("visibilitychange", visibility);
    win.removeEventListener("pagehide", hide);
    win.removeEventListener("pageshow", show);
    win.removeEventListener("focus", check);
    win.removeEventListener("online", check);
  };
}
