"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import AutoTextarea from "@/components/shared/AutoTextarea";
import StatusSelect from "@/components/shared/StatusSelect";
import PerfTable from "@/components/shared/PerfTable";
import { LONG_OPS } from "@/lib/constants";

const labelCls = "block font-mono uppercase tracking-widest text-muted mb-1.5";
const inputCls = "w-full rounded bg-panel2 border border-grid px-3 py-2 text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors placeholder:text-muted/60";
const sectionCls = "flex flex-col gap-3";

export default function TacticalTab() {
  const {
    tac, setTac, setTacPerf, setTacLate,
    seasonalTemplates,
  } = useStore();

  const [showTemplates, setShowTemplates] = useState(false);
  const tacTemplates = seasonalTemplates.filter((t) => t.tab === "tactical");

  return (
    <div className="flex flex-col gap-5">
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
