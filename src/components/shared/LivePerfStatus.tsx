"use client";
import { useStore } from "@/lib/store";
import { refreshLivePerf } from "@/lib/rdm/livePerfClient";
import clsx from "clsx";

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

  const dotCls = !enabled
    ? "bg-muted"
    : status === "error"
      ? "bg-bad"
      : status === "ok"
        ? "bg-good animate-pulse"
        : "bg-warn";

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
    <div className="flex items-center gap-2 mb-2 text-muted font-mono uppercase tracking-widest">
      <span className={clsx("h-2 w-2 rounded-full shrink-0", dotCls)} />
      <span className="truncate" title={text}>{text}</span>
      <span className="flex-1" />
      {enabled && (
        <button
          onClick={() => refreshLivePerf()}
          className="text-accent hover:text-accent/80 transition-colors shrink-0"
          title="Fetch the latest figures now"
        >
          Refresh
        </button>
      )}
      <button
        onClick={() => {
          toggleLivePerf();
          // Resuming should show fresh data immediately, not wait for a tick.
          if (!enabled) refreshLivePerf();
        }}
        className="text-accent hover:text-accent/80 transition-colors shrink-0"
        title={enabled ? "Stop auto-filling values" : "Resume auto-filling values"}
      >
        {enabled ? "Pause" : "Resume"}
      </button>
    </div>
  );
}
