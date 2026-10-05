"use client";
import { useStore } from "@/lib/store";
import { refreshLivePerf } from "@/lib/rdm/livePerfClient";
import { Pause, Play, RefreshCw } from "lucide-react";
import { StatusDot } from "@/components/ui";

// Status bar for the NWR live performance feed: state dot, last-updated time,
// and pause/refresh controls. Values land in the perf table automatically —
// this bar exists so a stale or broken feed is never mistaken for live data.

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
}

export default function LivePerfStatus() {
  const { livePerf, toggleLivePerf } = useStore();
  const { enabled, status, lastUpdated, message } = livePerf;

  const color = !enabled
    ? "var(--text-faint)"
    : status === "error"
      ? "var(--poor)"
      : status === "ok"
        ? "var(--good)"
        : "var(--moderate)";

  let text: string;
  if (!enabled) {
    text = "Live feed paused — values are manual";
  } else if (status === "error") {
    text = `Live feed error: ${message ?? "unknown"}`;
  } else if (status === "ok" && lastUpdated) {
    text = `Live from NWR · updated ${fmtTime(lastUpdated)}${message ? ` · ${message}` : ""}`;
  } else {
    text = "Live feed connecting…";
  }

  return (
    <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
      <span
        className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
        style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
        title={text}
      >
        <StatusDot color={color} pulse={enabled && status === "ok"} />
        <span className="truncate">{text}</span>
      </span>
      {enabled && (
        <button type="button" onClick={() => refreshLivePerf()} className="btn btn-ghost btn-sm" title="Fetch the latest figures now">
          <RefreshCw size={13} /> Refresh
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          toggleLivePerf();
          // Resuming should show fresh data immediately, not wait for a tick.
          if (!enabled) refreshLivePerf();
        }}
        className="btn btn-ghost btn-sm"
        title={enabled ? "Stop auto-filling values" : "Resume auto-filling values"}
      >
        {enabled ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Resume</>}
      </button>
    </div>
  );
}
