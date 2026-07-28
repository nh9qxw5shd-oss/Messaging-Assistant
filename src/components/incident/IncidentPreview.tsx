"use client";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useIncidentStore } from "@/lib/incident/store";
import { renderIncident, buildIncidentHtml } from "@/lib/incident/render";
import { resolveBanner, PHASE_LABELS } from "@/lib/incident/constants";
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

/** Lives in the left rail (composer slot) while the incident tab is active. */
export default function IncidentPreview() {
  const { showToast } = useStore();
  const { hydrate, incidents, activeId, logSent } = useIncidentStore();
  const [showTimeline, setShowTimeline] = useState(true);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const inc = incidents.find((i) => i.id === activeId) ?? null;
  const rendered = useMemo(() => (inc ? renderIncident(inc) : ""), [inc]);
  const banner = inc ? resolveBanner(inc) : null;

  if (!inc || inc.phase === "closed") {
    return (
      <div className="flex flex-col gap-2">
        <span className="font-mono uppercase tracking-widest text-muted">
          Incident preview
        </span>
        <p className="text-muted">
          {inc
            ? "This incident is closed — reopen it to build messages."
            : "Start or select an incident and its message builds here."}
        </p>
      </div>
    );
  }

  async function copy(withBanner: boolean, textOverride?: string) {
    if (!inc) return;
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
    <div className="flex flex-col gap-3 min-w-0">
      <span className="font-mono uppercase tracking-widest text-muted">
        Preview · {PHASE_LABELS[inc.phase]}
        {inc.phase === "update" ? ` ${inc.updateCount + 1}` : ""}
      </span>

      {/* Banner preview — flex-none so the timeline can't crush it */}
      {banner && (
        <div className="rounded overflow-hidden border border-grid/60 flex-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={banner.path} alt={banner.label} className="w-full h-auto block" />
        </div>
      )}

      {/* Message preview */}
      <pre
        className={clsx(
          "flex-none rounded border p-3 font-mono text-sm whitespace-pre-wrap break-words leading-relaxed",
          "bg-panel2 border-grid text-ink min-h-[160px]"
        )}
      >
        {rendered || (
          <span className="text-muted/40 italic">Fill the form to build the message…</span>
        )}
      </pre>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => copy(false)}
          className={clsx(
            "flex-1 px-4 py-2.5 rounded font-semibold font-sans",
            "bg-accent text-white border border-accent/80",
            "hover:bg-accent-dim transition-colors duration-150",
            "shadow-orange-glow-sm"
          )}
        >
          Copy text
        </button>
        <button
          onClick={() => copy(true)}
          disabled={!banner}
          className={clsx(
            "px-4 py-2.5 rounded font-semibold font-sans",
            "bg-panel2 text-ink border border-grid",
            "hover:border-accent/50 transition-colors duration-150",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          + Banner
        </button>
      </div>

      <div className="text-sm text-muted/60">{hint}</div>

      {/* Timeline */}
      <div className="border-t border-grid/40 pt-2">
        <button
          onClick={() => setShowTimeline((v) => !v)}
          className="font-mono uppercase tracking-widest text-muted hover:text-ink transition-colors"
        >
          {showTimeline ? "▾" : "▸"} Sent timeline ({inc.sent.length})
        </button>
        {showTimeline && (
          <div className="flex flex-col gap-2 mt-2">
            {inc.sent.length === 0 && (
              <div className="text-muted/50 italic">Nothing sent yet.</div>
            )}
            {[...inc.sent].reverse().map((m, i) => (
              <div key={inc.sent.length - i} className="rounded border border-grid/60 bg-panel2 p-2.5">
                <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                  <span className="font-mono text-sm text-muted">
                    {fmtTime(m.ts)} · {PHASE_LABELS[m.phase]}
                    {m.updateNo ? ` ${m.updateNo}` : ""}
                  </span>
                  <button
                    onClick={() => copy(false, m.text)}
                    className="font-mono text-sm text-accent hover:underline"
                  >
                    Re-copy
                  </button>
                </div>
                <pre className="font-mono text-sm whitespace-pre-wrap break-words text-muted">
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
