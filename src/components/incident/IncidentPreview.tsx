"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useIncidentStore } from "@/lib/incident/store";
import { renderIncident, buildIncidentHtml } from "@/lib/incident/render";
import { resolveBanner, PHASE_LABELS } from "@/lib/incident/constants";
import type { IncidentState } from "@/lib/incident/types";
import clsx from "clsx";

function fmtTime(ts: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

export default function IncidentPreview({ inc }: { inc: IncidentState }) {
  const { showToast } = useStore();
  const { logSent } = useIncidentStore();
  const [showTimeline, setShowTimeline] = useState(false);

  const rendered = useMemo(() => renderIncident(inc), [inc]);
  const banner = resolveBanner(inc);

  async function copy(withBanner: boolean, textOverride?: string) {
    const text = textOverride ?? rendered;
    if (!text.trim()) return;
    try {
      if (withBanner && navigator.clipboard && window.ClipboardItem) {
        const html = buildIncidentHtml(inc, text);
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([text], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      showToast("Copied");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      showToast("Copied");
    }
    // Copying out is "sending" — log it and advance the cycle (re-copies of
    // identical text are ignored by the store).
    if (!textOverride) {
      logSent({
        ts: Date.now(),
        phase: inc.phase,
        updateNo: inc.phase === "update" ? inc.updateCount + 1 : null,
        register: inc.register,
        banner: banner?.id ?? null,
        text,
      });
    }
  }

  const hint =
    inc.phase === "update"
      ? `Copying logs this as Update ${inc.updateCount + 1} and clears the narrative for the next one.`
      : inc.phase === "initial"
      ? "Copying logs the initial alert and moves the incident into the update cycle."
      : "Copying logs the message to the incident timeline.";

  return (
    <div className="flex-1 flex flex-col gap-3 min-w-0 sticky top-0 self-start max-h-[calc(100vh-140px)] overflow-y-auto">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-widest text-muted">
          Live preview · {PHASE_LABELS[inc.phase]}
          {inc.phase === "update" ? ` ${inc.updateCount + 1}` : ""}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => copy(false)}
            className="px-3 py-1.5 rounded text-sm font-mono border border-accent/50 text-accent hover:bg-accent/10 transition-colors"
          >
            Copy text
          </button>
          <button
            onClick={() => copy(true)}
            disabled={!banner}
            className={clsx(
              "px-3 py-1.5 rounded text-sm font-mono border transition-colors",
              banner
                ? "border-accent/50 text-accent hover:bg-accent/10"
                : "border-grid text-muted/40 cursor-not-allowed"
            )}
          >
            Copy with banner
          </button>
        </div>
      </div>

      {/* Banner preview */}
      {banner && (
        <div className="rounded overflow-hidden border border-grid/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={banner.path} alt={banner.label} className="w-full h-auto block" />
        </div>
      )}

      {/* Message preview */}
      <pre
        className={clsx(
          "flex-1 rounded border p-4 text-sm font-mono whitespace-pre-wrap break-words leading-relaxed",
          "bg-panel2 border-grid text-ink overflow-y-auto min-h-[200px]"
        )}
      >
        {rendered || (
          <span className="text-muted/40 italic">Fill the form to build the message…</span>
        )}
      </pre>

      <div className="text-xs font-mono text-muted/50">{hint}</div>

      {/* Timeline */}
      <div className="border-t border-grid/40 pt-2">
        <button
          onClick={() => setShowTimeline((v) => !v)}
          className="text-xs font-mono uppercase tracking-widest text-muted hover:text-ink transition-colors"
        >
          {showTimeline ? "▾" : "▸"} Sent timeline ({inc.sent.length})
        </button>
        {showTimeline && (
          <div className="flex flex-col gap-2 mt-2 max-h-[30vh] overflow-y-auto">
            {inc.sent.length === 0 && (
              <div className="text-sm text-muted/50 italic">Nothing sent yet.</div>
            )}
            {[...inc.sent].reverse().map((m, i) => (
              <div key={inc.sent.length - i} className="rounded border border-grid/60 bg-panel2 p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-muted">
                    {fmtTime(m.ts)} · {PHASE_LABELS[m.phase]}
                    {m.updateNo ? ` ${m.updateNo}` : ""} · {m.register}
                  </span>
                  <button
                    onClick={() => copy(false, m.text)}
                    className="text-xs font-mono text-accent hover:underline"
                  >
                    Re-copy
                  </button>
                </div>
                <pre className="text-xs font-mono whitespace-pre-wrap break-words text-muted max-h-24 overflow-y-auto">
                  {m.text}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
