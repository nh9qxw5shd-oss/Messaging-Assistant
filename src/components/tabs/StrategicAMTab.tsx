"use client";
import { useStore } from "@/lib/store";
import AutoTextarea from "@/components/shared/AutoTextarea";
import StatusSelect from "@/components/shared/StatusSelect";
import PerfTable from "@/components/shared/PerfTable";
import { LONG_OPS } from "@/lib/constants";

const h4Cls = "font-sans font-semibold text-ink/80 mb-2";
const sectionCls = "flex flex-col gap-3";

export default function StrategicAMTab() {
  const { str_am, setStrAM, setStrAMPerf } = useStore();

  return (
    <div className="flex flex-col gap-5">
      <div className={sectionCls}>
        <h4 className={h4Cls}>Executive Summary</h4>
        <AutoTextarea
          value={str_am.exec}
          onChange={(v) => setStrAM({ exec: v })}
          placeholder="- Route T-3 closed at [xx.x%] (Target [xx.x%]) – key drivers: […]."
          minRows={3}
        />
      </div>

      <div className={sectionCls}>
        <h4 className={h4Cls}>Operational Status</h4>
        <StatusSelect value={str_am.status} options={LONG_OPS} onChange={(v) => setStrAM({ status: v })} />
      </div>

      <div>
        <h4 className={h4Cls}>Performance Snapshot</h4>
        <PerfTable
          metrics={str_am.perf}
          locked
          onUpdate={(i, p) => setStrAMPerf(i, p)}
        />
      </div>

      <div className={sectionCls}>
        <h4 className={h4Cls}>Performance Trends</h4>
        <AutoTextarea
          value={str_am.trends}
          onChange={(v) => setStrAM({ trends: v })}
          placeholder="- Down-why, drivers, recovery levers."
          minRows={3}
        />
      </div>

      <div className={sectionCls}>
        <h4 className={h4Cls}>Key Service Interventions & Contingency Plans</h4>
        <AutoTextarea
          value={str_am.interv}
          onChange={(v) => setStrAM({ interv: v })}
          placeholder={"- Fault secured at…\n- SRF/turnbacks…\n- Freight adjustments…"}
          minRows={3}
        />
      </div>

      <div className={sectionCls}>
        <h4 className={h4Cls}>Opportunities to Improve & Build Resilience for the P.M. Peak</h4>
        <AutoTextarea
          value={str_am.opps}
          onChange={(v) => setStrAM({ opps: v })}
          placeholder="- Items to be rectified pre p.m. peak / crew coverage / weather prep…"
          minRows={3}
        />
      </div>

      <div className={sectionCls}>
        <h4 className={h4Cls}>Forward View</h4>
        <AutoTextarea
          value={str_am.forward}
          onChange={(v) => setStrAM({ forward: v })}
          placeholder="Concise expectation for p.m. peak performance."
          minRows={2}
        />
      </div>
    </div>
  );
}
