"use client";
import { useStore } from "@/lib/store";
import AutoTextarea from "@/components/shared/AutoTextarea";
import StatusSelect from "@/components/shared/StatusSelect";
import PerfTable from "@/components/shared/PerfTable";
import { LONG_OPS } from "@/lib/constants";

const labelCls = "block font-mono uppercase tracking-widest text-muted mb-1.5";
const h4Cls = "font-sans font-semibold text-ink/80 mb-2";
const inputCls = "w-full rounded bg-panel2 border border-grid px-3 py-2 text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors placeholder:text-muted/60";
const sectionCls = "flex flex-col gap-3";

export default function StrategicPMTab() {
  const { str_pm, setStrPM, setStrPMPerf } = useStore();

  return (
    <div className="flex flex-col gap-5">
      <div className={sectionCls}>
        <h4 className={h4Cls}>Executive Summary</h4>
        <AutoTextarea
          value={str_pm.exec}
          onChange={(v) => setStrPM({ exec: v })}
          placeholder="- Route T-3 closed at [xx.x%] (Target [xx.x%]) – key drivers: […]."
          minRows={3}
        />
      </div>

      <div className={sectionCls}>
        <h4 className={h4Cls}>Operational Status</h4>
        <StatusSelect value={str_pm.status} options={LONG_OPS} onChange={(v) => setStrPM({ status: v })} />
      </div>

      <div>
        <h4 className={h4Cls}>Performance Snapshot</h4>
        <PerfTable
          metrics={str_pm.perf}
          locked
          onUpdate={(i, p) => setStrPMPerf(i, p)}
        />
      </div>

      <div className={sectionCls}>
        <h4 className={h4Cls}>Performance Trends</h4>
        <AutoTextarea
          value={str_pm.trends}
          onChange={(v) => setStrPM({ trends: v })}
          placeholder="- Down-why, drivers, recovery levers."
          minRows={3}
        />
      </div>

      <div className={sectionCls}>
        <h4 className={h4Cls}>Key Service Interventions Taken & Contingency Plans</h4>
        <AutoTextarea
          value={str_pm.interv}
          onChange={(v) => setStrPM({ interv: v })}
          placeholder={"- Fault secured at…\n- SRF/turnbacks…\n- Freight adjustments…"}
          minRows={3}
        />
      </div>

      <div>
        <h4 className={h4Cls}>Forward Risks — Tomorrow's Start of Service</h4>
        <div className="grid grid-cols-2 gap-3">
          {([
            ["risk_infra",    "Infrastructure",  "e.g. No outstanding defects"],
            ["risk_fleet",    "Fleet",           "e.g. Spare units held for a.m. peak"],
            ["risk_crew",     "Crew",            "e.g. Rostering confirmed"],
            ["risk_weather",  "Weather",         "e.g. Overnight conditions stable"],
          ] as const).map(([key, label, ph]) => (
            <div key={key}>
              <label className={labelCls}>{label}</label>
              <input
                type="text"
                value={str_pm[key]}
                onChange={(e) => setStrPM({ [key]: e.target.value })}
                placeholder={ph}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </div>

      <div className={sectionCls}>
        <h4 className={h4Cls}>Outlook</h4>
        <AutoTextarea
          value={str_pm.outlook}
          onChange={(v) => setStrPM({ outlook: v })}
          placeholder="Concise statement of overall performance and tomorrow's start of service."
          minRows={2}
        />
      </div>
    </div>
  );
}
