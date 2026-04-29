"use client";
import { useStore } from "@/lib/store";
import AutoTextarea from "@/components/shared/AutoTextarea";
import StatusSelect from "@/components/shared/StatusSelect";
import PerfTable from "@/components/shared/PerfTable";
import { LONG_OPS, SHORT_OPS } from "@/lib/constants";
import type { SeasonalTemplate } from "@/lib/types";
import { useState } from "react";
import clsx from "clsx";

const inputCls = "w-full rounded bg-panel2 border border-grid px-3 py-2 text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors placeholder:text-muted/60";
const labelCls = "block font-mono uppercase tracking-widest text-muted mb-1.5";
const h4Cls    = "font-sans font-semibold text-ink/80 mb-2";
const sectionCls = "flex flex-col gap-3";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h4 className={h4Cls}>{children}</h4>;
}

export default function SoSTab() {
  const {
    sos, setSoS, setSoSToc, setSoSNr, setSoSOncall, setSoSEsr, setSoSPerf,
    seasonalTemplates,
  } = useStore();

  const [showTemplates, setShowTemplates] = useState(false);
  const sosTemplates = seasonalTemplates.filter((t) => t.tab === "sos");

  return (
    <div className="flex flex-col gap-5">
      {/* Greeting */}
      <div className={sectionCls}>
        <SectionHeading>Greeting / Intro</SectionHeading>
        <AutoTextarea value={sos.intro} onChange={(v) => setSoS({ intro: v })} />
      </div>

      {/* Operational Status */}
      <div className={sectionCls}>
        <SectionHeading>Operational Status</SectionHeading>
        <StatusSelect value={sos.status} options={LONG_OPS} onChange={(v) => setSoS({ status: v })} />
      </div>

      {/* Safety */}
      <div className={sectionCls}>
        <SectionHeading>Overnight Safety Incidents</SectionHeading>
        <AutoTextarea value={sos.safety} onChange={(v) => setSoS({ safety: v })} placeholder="Nil" />
      </div>

      {/* Yesterday's Performance */}
      <div>
        <SectionHeading>Yesterday's Route Performance</SectionHeading>
        <PerfTable
          metrics={sos.perf}
          locked
          onUpdate={(i, p) => setSoSPerf(i, p)}
        />
      </div>

      {/* TOC Status */}
      <div>
        <SectionHeading>TOC Service and Fleet Start Up</SectionHeading>
        <div className="flex flex-col gap-2">
          {(["sos_toc_gtr", "sos_toc_emr", "sos_toc_xc"] as const).map((key, i) => {
            const labels = ["GTR", "EMR", "Cross Country"];
            return (
              <div key={key} className="grid grid-cols-[80px_1fr] items-center gap-2">
                <span className="text-muted">{labels[i]}</span>
                <StatusSelect value={sos.toc[key]} options={SHORT_OPS} onChange={(v) => setSoSToc(key, v)} />
              </div>
            );
          })}
        </div>
      </div>

      {/* NR Infrastructure */}
      <div>
        <SectionHeading>Network Rail Infrastructure</SectionHeading>
        <div className="flex flex-col gap-2">
          {(["sos_tl", "sos_south", "sos_north", "sos_lincs"] as const).map((key, i) => {
            const labels = ["TL Core", "South", "North", "Lincolnshire"];
            return (
              <div key={key} className="grid grid-cols-[100px_1fr] items-center gap-2">
                <span className="text-muted">{labels[i]}</span>
                <StatusSelect value={sos.nr[key]} options={SHORT_OPS} onChange={(v) => setSoSNr(key, v)} />
              </div>
            );
          })}
        </div>
      </div>

      {/* On Call */}
      <div>
        <SectionHeading>On Call</SectionHeading>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left font-mono uppercase tracking-widest text-muted pb-2 px-2">Team</th>
                <th className="text-left font-mono uppercase tracking-widest text-muted pb-2 px-2">Until 08:00</th>
                <th className="text-left font-mono uppercase tracking-widest text-muted pb-2 px-2">From 08:00</th>
              </tr>
            </thead>
            <tbody>
              {([
                ["Executive",   "exec_until",  "exec_from"],
                ["Operations",  "ops_until",   "ops_from"],
                ["Maintenance", "maint_until", "maint_from"],
              ] as const).map(([label, until, from]) => (
                <tr key={label}>
                  <td className="px-2 py-1.5 text-muted">{label}</td>
                  <td className="px-2 py-1.5">
                    <input type="text" value={sos.oncall[until]} onChange={(e) => setSoSOncall(until, e.target.value)} placeholder="Name" className={inputCls} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="text" value={sos.oncall[from]} onChange={(e) => setSoSOncall(from, e.target.value)} placeholder="Name" className={inputCls} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted mt-1">Names only. Output wording is fixed.</p>
      </div>

      {/* Incidents */}
      <div className={sectionCls}>
        <SectionHeading>Incidents ongoing/concluded since last update</SectionHeading>
        <AutoTextarea value={sos.incidents} onChange={(v) => setSoS({ incidents: v })} />
      </div>

      {/* ESR */}
      <div>
        <SectionHeading>Emergency Speed Restrictions</SectionHeading>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {(["imp", "amd", "wdn"] as const).map((k) => {
            const labels = { imp: "Imposed", amd: "Amended", wdn: "Withdrawn" };
            return (
              <div key={k}>
                <label className={labelCls}>{labels[k]}</label>
                <input type="text" value={sos.esr[k]} onChange={(e) => setSoSEsr(k, e.target.value)} placeholder="Nil" className={inputCls} />
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Planned Removal</label>
            <input type="text" value={sos.esr.pr} onChange={(e) => setSoSEsr("pr", e.target.value)} placeholder="Nil" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Total</label>
            <input type="text" value={sos.esr.total} onChange={(e) => setSoSEsr("total", e.target.value)} placeholder="e.g. 24 total ESRs in force" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Weather */}
      <div className={sectionCls}>
        <SectionHeading>Weather Forecast Summary</SectionHeading>
        <AutoTextarea value={sos.weather} onChange={(v) => setSoS({ weather: v })} />
      </div>

      <div className={sectionCls}>
        <SectionHeading>Max Temperatures</SectionHeading>
        <input type="text" value={sos.maxtemps} onChange={(e) => setSoS({ maxtemps: e.target.value })} placeholder="East Midlands: Max 18.0°c / Min 8.0°c; London North: Max 18.5°c / Min 12.0°c" className={inputCls} />
      </div>

      <div className={sectionCls}>
        <SectionHeading>Forecast — 24 hours</SectionHeading>
        <AutoTextarea value={sos.forecast} onChange={(v) => setSoS({ forecast: v })} />
      </div>

      {/* Engineering */}
      <div className={sectionCls}>
        <SectionHeading>Engineering and Critical Works</SectionHeading>
        <AutoTextarea value={sos.eng} onChange={(v) => setSoS({ eng: v })} />
      </div>

      {/* Seasonal slot */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-sans font-semibold text-ink/80">Optional Seasonal Slot</h4>
          {sosTemplates.length > 0 && (
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="font-mono uppercase tracking-widest text-accent hover:text-accent/80 transition-colors"
            >
              Load template ↓
            </button>
          )}
        </div>
        {showTemplates && sosTemplates.length > 0 && (
          <div className="rounded border border-grid bg-panel2 p-2 flex flex-col gap-1 mb-2">
            {sosTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => { setSoS({ seasonal_opt: t.content }); setShowTemplates(false); }}
                className="text-left text-ink hover:text-accent px-2 py-1 rounded hover:bg-panel transition-colors"
              >
                {t.season}
              </button>
            ))}
          </div>
        )}
        <AutoTextarea
          value={sos.seasonal_opt}
          onChange={(v) => setSoS({ seasonal_opt: v })}
          placeholder="Optional free text — heading is hidden in output if empty"
        />
      </div>
    </div>
  );
}
