"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useStore } from "@/lib/store";
import AutoTextarea from "@/components/shared/AutoTextarea";
import StatusSelect from "@/components/shared/StatusSelect";
import PerfTable from "@/components/shared/PerfTable";
import LivePerfStatus from "@/components/shared/LivePerfStatus";
import EngineeringHubSection, { type FillMsg } from "@/components/shared/EngineeringHubSection";
import { LONG_OPS, TACTICAL_SLOTS } from "@/lib/constants";
import type { TacticalSlot } from "@/lib/types";
import { defaultTacticalSlot } from "@/lib/engineering/criticalMessage";
import { SLOT_LABEL, buildEngineeringForSlot, describeEngineeringFill, tacticalDateISO } from "@/lib/engineering/engineeringHub";

const labelCls = "block font-mono uppercase tracking-widest text-muted mb-1.5";
const inputCls = "w-full rounded bg-panel2 border border-grid px-3 py-2 text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors placeholder:text-muted/60";
const sectionCls = "flex flex-col gap-3";

export default function TacticalTab() {
  const {
    tac, setTac, setTacSlot, setTacPerf, setTacLate,
    seasonalTemplates,
  } = useStore();

  const [showTemplates, setShowTemplates] = useState(false);
  const tacTemplates = seasonalTemplates.filter((t) => t.tab === "tactical");

  // ─── Slot auto-selection ──────────────────────────────────────────────────
  // While on auto the tab follows the London clock: 09:00 until 09:00, then
  // 15:00, then 22:00 (and stays on 22:00 after it — the next message is the
  // 05:30 SoS). Re-evaluated on open and every minute.
  useEffect(() => {
    if (tac.slotMode !== "auto") return;
    const tick = () => {
      const next = defaultTacticalSlot();
      if (next !== useStore.getState().tac.slot) setTacSlot(next);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [tac.slotMode, setTacSlot]);

  // ─── Critical engineering from the Engineering Hub ────────────────────────
  // Fetched for the slot's date (today, London) on open, on a slot change and
  // on Refresh while on auto. A failed read keeps whatever text is there.
  const [engBusy, setEngBusy] = useState(false);
  const [engMsg, setEngMsg] = useState<FillMsg>(null);
  const engReq = useRef(0);

  const refreshEng = useCallback(async (slot: TacticalSlot) => {
    const req = ++engReq.current;
    setEngBusy(true);
    try {
      const r = await buildEngineeringForSlot(slot, tacticalDateISO());
      // A newer request, or a switch to manual while reading, wins.
      if (req !== engReq.current || useStore.getState().tac.engMode !== "auto") return;
      setTac({ eng: r.text });
      setEngMsg({ tone: "ok", text: describeEngineeringFill(r) });
    } catch (e) {
      if (req !== engReq.current) return;
      setEngMsg({ tone: "err", text: e instanceof Error ? e.message : "Could not read the Engineering Hub" });
    } finally {
      if (req === engReq.current) setEngBusy(false);
    }
  }, [setTac]);

  useEffect(() => {
    if (tac.engMode !== "auto") return;
    refreshEng(tac.slot);
  }, [tac.engMode, tac.slot, refreshEng]);

  return (
    <div className="flex flex-col gap-5">
      {/* Message slot */}
      <div className={sectionCls}>
        <h4 className="font-sans font-semibold text-ink/80 mb-2">Message Slot</h4>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex overflow-hidden rounded border border-grid" role="group" aria-label="Tactical message slot">
            {TACTICAL_SLOTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTacSlot(s, "manual")}
                aria-pressed={tac.slot === s}
                className={clsx(
                  "px-4 py-1.5 font-mono text-sm tracking-widest transition-colors",
                  tac.slot === s ? "bg-accent text-white" : "bg-panel2 text-muted hover:text-ink",
                )}
              >
                {SLOT_LABEL[s]}
              </button>
            ))}
          </div>
          {tac.slotMode === "auto" ? (
            <span className="font-mono text-xs uppercase tracking-widest text-emerald-400" title="Follows the London clock; pick a slot to override">
              auto
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setTacSlot(defaultTacticalSlot(), "auto")}
              title="Follow the London clock again"
              className="rounded border border-grid bg-panel2 px-3 py-1 font-mono text-xs uppercase tracking-widest text-ink/80 hover:border-accent hover:text-ink"
            >
              Auto
            </button>
          )}
        </div>
      </div>

      {/* Greeting */}
      <div className={sectionCls}>
        <h4 className="font-sans font-semibold text-ink/80 mb-2">Greeting / Intro</h4>
        <AutoTextarea value={tac.intro} onChange={(v) => setTac({ intro: v })} />
      </div>

      {/* Control Command Team */}
      <div>
        <h4 className="font-sans font-semibold text-ink/80 mb-2">Control Command Team</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>SNDM</label>
            <input type="text" value={tac.sndm} onChange={(e) => setTac({ sndm: e.target.value })} placeholder="Name" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>RCM</label>
            <input type="text" value={tac.rcm} onChange={(e) => setTac({ rcm: e.target.value })} placeholder="Name" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Operational Status */}
      <div className={sectionCls}>
        <h4 className="font-sans font-semibold text-ink/80 mb-2">Operational Status</h4>
        <StatusSelect value={tac.status} options={LONG_OPS} onChange={(v) => setTac({ status: v })} />
      </div>

      {/* Safety */}
      <div className={sectionCls}>
        <h4 className="font-sans font-semibold text-ink/80 mb-2">Safety Incidents/Accidents</h4>
        <AutoTextarea value={tac.safety} onChange={(v) => setTac({ safety: v })} placeholder="Nil" />
      </div>

      {/* Performance */}
      <div>
        <h4 className="font-sans font-semibold text-ink/80 mb-2">Route Performance</h4>
        <LivePerfStatus />
        <PerfTable
          metrics={tac.perf}
          locked
          onUpdate={(i, p) => setTacPerf(i, p)}
        />
      </div>

      {/* Incidents */}
      <div className={sectionCls}>
        <h4 className="font-sans font-semibold text-ink/80 mb-2">Incidents ongoing/concluded since last update</h4>
        <AutoTextarea value={tac.incidents} onChange={(v) => setTac({ incidents: v })} />
      </div>

      {/* Late running */}
      <div>
        <h4 className="font-sans font-semibold text-ink/80 mb-2">Late Running Services</h4>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left font-mono uppercase tracking-widest text-muted pb-2 px-2 w-16">TOC</th>
                <th className="text-left font-mono uppercase tracking-widest text-muted pb-2 px-2">🟪 20min+</th>
                <th className="text-left font-mono uppercase tracking-widest text-muted pb-2 px-2">🟥 10–20min</th>
                <th className="text-left font-mono uppercase tracking-widest text-muted pb-2 px-2">Interventions</th>
              </tr>
            </thead>
            <tbody>
              {([
                ["GTR", "gtr20", "gtr10", "gtrInt"],
                ["EMR", "emr20", "emr10", "emrInt"],
              ] as const).map(([toc, k20, k10, kInt]) => (
                <tr key={toc}>
                  <td className="px-2 py-1.5 text-muted font-semibold">{toc}</td>
                  <td className="px-2 py-1.5">
                    <input type="text" value={tac.late[k20]} onChange={(e) => setTacLate(k20, e.target.value)} className={inputCls} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="text" value={tac.late[k10]} onChange={(e) => setTacLate(k10, e.target.value)} className={inputCls} />
                  </td>
                  <td className="px-2 py-1.5">
                    <AutoTextarea value={tac.late[kInt]} onChange={(v) => setTacLate(kInt, v)} placeholder="Actions taken / mitigation" minRows={1} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Critical engineering */}
      <EngineeringHubSection
        title="Critical Engineering"
        mode={tac.engMode}
        onModeChange={(m) => setTac({ engMode: m })}
        text={tac.eng}
        onTextChange={(v) => setTac({ eng: v })}
        readOnlyWhenAuto
        busy={engBusy}
        msg={engMsg}
        onRefresh={() => refreshEng(tac.slot)}
        placeholder={tac.engMode === "auto" ? "Reading the Engineering Hub…" : "Critical engineering — leave blank to omit the section"}
      />

      {/* Seasonal slot */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-sans font-semibold text-ink/80">Seasonal Slot</h4>
          {tacTemplates.length > 0 && (
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="font-mono uppercase tracking-widest text-accent hover:text-accent/80 transition-colors"
            >
              Load template ↓
            </button>
          )}
        </div>
        {showTemplates && tacTemplates.length > 0 && (
          <div className="rounded border border-grid bg-panel2 p-2 flex flex-col gap-1 mb-2">
            {tacTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTac({ seasonal: t.content }); setShowTemplates(false); }}
                className="text-left text-ink hover:text-accent px-2 py-1 rounded hover:bg-panel transition-colors"
              >
                {t.season}
              </button>
            ))}
          </div>
        )}
        <AutoTextarea
          value={tac.seasonal}
          onChange={(v) => setTac({ seasonal: v })}
          placeholder="Optional free text — heading hidden in output"
        />
      </div>
    </div>
  );
}
