"use client";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useIncidentStore } from "@/lib/incident/store";
import { renderIncident, buildIncidentHtml } from "@/lib/incident/render";
import { resolveBanner, PHASE_LABELS } from "@/lib/incident/constants";
import { ChevronDown, ChevronRight, ClipboardCopy, ImagePlus, Siren } from "lucide-react";
import { Card, EmptyState } from "@/components/ui";

function fmtTime(ts: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

/** Lives in the right-hand panel (composer slot) while the incident tab is active. */
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
      <Card title="Message" subtitle="Incident preview">
        <EmptyState
          icon={Siren}
          title={inc ? "Incident closed" : "No incident selected"}
          hint={
            inc
              ? "This incident is closed — reopen it to build messages."
              : "Start or select an incident and its message builds here."
          }
        />
      </Card>
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

  const stage = `${PHASE_LABELS[inc.phase]}${inc.phase === "update" ? ` ${inc.updateCount + 1}` : ""}`;

  return (
    <>
      <Card title="Message" subtitle={`Incident · ${stage}`} padded={false}>
        {/* Banner preview */}
        {banner && (
          <div className="border-b border-edge bg-sunken px-4 py-3">
            <div className="overflow-hidden rounded-lg border border-edge">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={banner.path} alt={banner.label} className="block h-auto w-full" />
            </div>
          </div>
        )}

        {/* Message preview */}
        <pre className="min-h-[220px] whitespace-pre-wrap break-words px-4 py-3 font-sans text-[13.5px] leading-relaxed text-ink">
          {rendered || <span className="italic text-faint">Fill the form to build the message…</span>}
        </pre>

        {/* Actions */}
        <div className="border-t border-edge p-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => copy(false)} className="btn btn-primary flex-1">
              <ClipboardCopy size={15} /> Copy text
            </button>
            <button
              type="button"
              onClick={() => copy(true)}
              disabled={!banner}
              className="btn"
              title="Copy with the banner image for Teams"
            >
              <ImagePlus size={15} /> Banner
            </button>
          </div>
          <p className="mt-2 text-xs text-dim">{hint}</p>
        </div>
      </Card>

      {/* Timeline */}
      <Card
        title="Sent timeline"
        subtitle={`${inc.sent.length} sent`}
        padded={false}
        action={
          <button
            type="button"
            onClick={() => setShowTimeline((v) => !v)}
            className="btn btn-ghost btn-sm"
            aria-expanded={showTimeline}
          >
            {showTimeline ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {showTimeline ? "Hide" : "Show"}
          </button>
        }
      >
        {showTimeline && (
          <div className="flex flex-col gap-2 p-3">
            {inc.sent.length === 0 && <p className="px-1 py-2 text-sm italic text-faint">Nothing sent yet.</p>}
            {[...inc.sent].reverse().map((m, i) => (
              <div key={inc.sent.length - i} className="rounded-lg border border-edge bg-sunken p-2.5">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-dim">
                    <span className="font-mono">{fmtTime(m.ts)}</span> · {PHASE_LABELS[m.phase]}
                    {m.updateNo ? ` ${m.updateNo}` : ""}
                  </span>
                  <button type="button" onClick={() => copy(false, m.text)} className="btn btn-ghost btn-sm">
                    <ClipboardCopy size={13} /> Re-copy
                  </button>
                </div>
                <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-dim">{m.text}</pre>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
