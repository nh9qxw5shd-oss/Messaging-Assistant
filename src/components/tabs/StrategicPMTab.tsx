"use client";
import { useStore } from "@/lib/store";
import AutoTextarea from "@/components/shared/AutoTextarea";
import StatusSelect from "@/components/shared/StatusSelect";
import PerfTable from "@/components/shared/PerfTable";
import TabHeader from "@/components/TabHeader";
import { Badge, Card, Field } from "@/components/ui";
import { LONG_OPS } from "@/lib/constants";
import { opsStatusBadge } from "@/lib/opsStatus";

export default function StrategicPMTab() {
  const { str_pm, setStrPM, setStrPMPerf } = useStore();
  const status = opsStatusBadge(str_pm.status);

  return (
    <>
      <TabHeader tab="strategic_pm" />
      <div className="stagger flex flex-col gap-4">
        <Card title="Executive summary">
          <AutoTextarea
            value={str_pm.exec}
            onChange={(v) => setStrPM({ exec: v })}
            placeholder="- Route T-3 closed at [xx.x%] (Target [xx.x%]) – key drivers: […]."
            minRows={3}
          />
        </Card>

        <Card title="Operational status" action={status && <Badge color={status.color} dot>{status.label}</Badge>}>
          <StatusSelect value={str_pm.status} options={LONG_OPS} onChange={(v) => setStrPM({ status: v })} />
        </Card>

        <Card title="Performance snapshot" padded={false}>
          <PerfTable
            metrics={str_pm.perf}
            locked
            onUpdate={(i, p) => setStrPMPerf(i, p)}
          />
        </Card>

        <Card title="Performance trends">
          <AutoTextarea
            value={str_pm.trends}
            onChange={(v) => setStrPM({ trends: v })}
            placeholder="- Down-why, drivers, recovery levers."
            minRows={3}
          />
        </Card>

        <Card title="Key service interventions taken & contingency plans">
          <AutoTextarea
            value={str_pm.interv}
            onChange={(v) => setStrPM({ interv: v })}
            placeholder={"- Fault secured at…\n- SRF/turnbacks…\n- Freight adjustments…"}
            minRows={3}
          />
        </Card>

        <Card title="Forward risks — tomorrow's start of service">
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ["risk_infra",    "Infrastructure",  "e.g. No outstanding defects"],
              ["risk_fleet",    "Fleet",           "e.g. Spare units held for a.m. peak"],
              ["risk_crew",     "Crew",            "e.g. Rostering confirmed"],
              ["risk_weather",  "Weather",         "e.g. Overnight conditions stable"],
            ] as const).map(([key, label, ph]) => (
              <Field key={key} label={label}>
                <input
                  type="text"
                  value={str_pm[key]}
                  onChange={(e) => setStrPM({ [key]: e.target.value })}
                  placeholder={ph}
                  className="input"
                />
              </Field>
            ))}
          </div>
        </Card>

        <Card title="Outlook">
          <AutoTextarea
            value={str_pm.outlook}
            onChange={(v) => setStrPM({ outlook: v })}
            placeholder="Concise statement of overall performance and tomorrow's start of service."
            minRows={2}
          />
        </Card>
      </div>
    </>
  );
}
