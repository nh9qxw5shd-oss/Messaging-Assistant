"use client";
import { useStore } from "../store";
import { POLL_INTERVAL_MS, type LivePerfResponse } from "./config";

// ─── Live performance polling controller ─────────────────────────────────────
//
// Singleton that polls /api/performance every POLL_INTERVAL_MS while the app
// is open and the user hasn't paused the feed. Polling is visibility-aware:
// a hidden tab skips its ticks and catches up as soon as it becomes visible
// again, so a laptop that was asleep shows fresh figures immediately.

let inFlight = false;

export async function refreshLivePerf(): Promise<void> {
  const { livePerf, setLivePerf, applyLivePerf } = useStore.getState();
  if (!livePerf.enabled || inFlight) return;

  inFlight = true;
  setLivePerf({ status: "loading" });
  try {
    const res = await fetch("/api/performance");
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? `HTTP ${res.status}`);
    }
    const data = (await res.json()) as LivePerfResponse;

    const got = data.metrics.filter((m) => m.value !== null);
    const missed = data.metrics.filter((m) => m.value === null);

    if (got.length === 0) {
      setLivePerf({
        status: "error",
        message: data.errors[0] ?? missed[0]?.error ?? "no metrics returned",
      });
      return;
    }

    applyLivePerf(got);
    setLivePerf({
      status: "ok",
      lastUpdated: Date.now(),
      message:
        missed.length > 0
          ? `unavailable: ${missed.map((m) => m.metric).join(", ")}`
          : null,
    });
  } catch (err) {
    setLivePerf({
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  } finally {
    inFlight = false;
  }
}

/** Start polling. Returns a cleanup function for the caller's useEffect. */
export function startLivePerf(): () => void {
  refreshLivePerf();

  const tick = () => {
    if (document.hidden) return;
    refreshLivePerf();
  };
  const interval = setInterval(tick, POLL_INTERVAL_MS);

  const onVisible = () => {
    if (document.hidden) return;
    const { livePerf } = useStore.getState();
    const stale =
      livePerf.lastUpdated === null ||
      Date.now() - livePerf.lastUpdated >= POLL_INTERVAL_MS;
    if (stale) refreshLivePerf();
  };
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
