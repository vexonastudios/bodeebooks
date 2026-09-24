const CHECK_INTERVAL = 5 * 60 * 1000;

export async function fetchParentRelease(signal?: AbortSignal): Promise<string> {
  const response = await fetch("/guard/dashboard/release/", {
    cache: "no-store", credentials: "omit", redirect: "error",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error("Release check unavailable");
  const data = await response.json();
  if (typeof data.release !== "string" || !/^[a-zA-Z0-9._-]{1,200}$/.test(data.release)) {
    throw new Error("Invalid release response");
  }
  return data.release;
}

export function watchParentRelease(loadedRelease: string, onUpdate: (release: string) => void) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active: AbortController | undefined;
  let lastCheck = 0;
  async function check() {
    clearTimeout(timer);
    if (stopped || document.hidden || !navigator.onLine || active) return;
    const request = new AbortController();
    active = request;
    lastCheck = Date.now();
    try {
      const release = await fetchParentRelease(request.signal);
      if (!stopped && !request.signal.aborted) onUpdate(release === loadedRelease ? "" : release);
    } catch { /* Stay on the working page when offline or the check fails. */ }
    finally {
      if (active === request) active = undefined;
      if (!stopped && !document.hidden && navigator.onLine) timer = setTimeout(check, CHECK_INTERVAL);
    }
  }
  function visibility() {
    if (document.hidden) { clearTimeout(timer); active?.abort(); }
    else void check();
  }
  function focus() { if (Date.now() - lastCheck >= 60_000) void check(); }
  function online() { void check(); }
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("focus", focus);
  window.addEventListener("online", online);
  void check();
  return () => {
    stopped = true; clearTimeout(timer); active?.abort();
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("focus", focus);
    window.removeEventListener("online", online);
  };
}
