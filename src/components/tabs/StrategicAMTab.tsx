"use client";
import { useStore } from "@/lib/store";
import AutoTextarea from "@/components/shared/AutoTextarea";
import StatusSelect from "@/components/shared/StatusSelect";
import PerfTable from "@/components/shared/PerfTable";
import TabHeader from "@/components/TabHeader";
import { Badge, Card } from "@/components/ui";
import { LONG_OPS } from "@/lib/constants";
import { opsStatusBadge } from "@/lib/opsStatus";

export default function StrategicAMTab() {
  const { str_am, setStrAM, setStrAMPerf } = useStore();
  const status = opsStatusBadge(str_am.status);

  return (
    <>
      <TabHeader tab="strategic_am" />
      <div className="stagger flex flex-col gap-4">
        <Card title="Executive summary">
          <AutoTextarea
            value={str_am.exec}
            onChange={(v) => setStrAM({ exec: v })}
            placeholder="- Route T-3 closed at [xx.x%] (Target [xx.x%]) – key drivers: […]."
            minRows={3}
          />
        </Card>

        <Card title="Operational status" action={status && <Badge color={status.color} dot>{status.label}</Badge>}>
          <StatusSelect value={str_am.status} options={LONG_OPS} onChange={(v) => setStrAM({ status: v })} />
        </Card>

        <Card title="Performance snapshot" padded={false}>
          <PerfTable
            metrics={str_am.perf}
            locked
            onUpdate={(i, p) => setStrAMPerf(i, p)}
          />
        </Card>

        <Card title="Performance trends">
          <AutoTextarea
            value={str_am.trends}
            onChange={(v) => setStrAM({ trends: v })}
            placeholder="- Down-why, drivers, recovery levers."
            minRows={3}
          />
        </Card>

        <Card title="Key service interventions & contingency plans">
          <AutoTextarea
            value={str_am.interv}
            onChange={(v) => setStrAM({ interv: v })}
            placeholder={"- Fault secured at…\n- SRF/turnbacks…\n- Freight adjustments…"}
            minRows={3}
          />
        </Card>

        <Card title="Opportunities to improve & build resilience for the p.m. peak">
          <AutoTextarea
            value={str_am.opps}
            onChange={(v) => setStrAM({ opps: v })}
            placeholder="- Items to be rectified pre p.m. peak / crew coverage / weather prep…"
            minRows={3}
          />
        </Card>

        <Card title="Forward view">
          <AutoTextarea
            value={str_am.forward}
            onChange={(v) => setStrAM({ forward: v })}
            placeholder="Concise expectation for p.m. peak performance."
            minRows={2}
          />
        </Card>
      </div>
    </>
  );
}
