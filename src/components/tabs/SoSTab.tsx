"use client";
import { useStore } from "@/lib/store";
import AutoTextarea from "@/components/shared/AutoTextarea";
import StatusSelect from "@/components/shared/StatusSelect";
import PerfTable from "@/components/shared/PerfTable";
import EngineeringHubSection, { type FillMsg } from "@/components/shared/EngineeringHubSection";
import TabHeader from "@/components/TabHeader";
import { Badge, Card, Field } from "@/components/ui";
import { opsStatusBadge } from "@/lib/opsStatus";
import { DEFAULT_SOS, LONG_OPS, SHORT_OPS } from "@/lib/constants";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, CloudSun, Gauge } from "lucide-react";
import { buildSosWeather, describeIssue, fetchLatestRouteForecast } from "@/lib/weather/sosWeather";
import { buildSosEsr, describeRun, fetchLatestEsrRun } from "@/lib/esr/sosEsr";
import { buildEngineeringForSlot, describeEngineeringFill, sosDateISO } from "@/lib/engineering/engineeringHub";

// Remembers which DLog2 snapshot last auto-filled the ESR fields and what it
// wrote, so a new day's snapshot preloads automatically but an operator's
// hand edits to the current one are never overwritten.
const LS_ESR_AUTOFILL_KEY = "ma_sos_esr_autofill";

type Esr = { imp: string; amd: string; wdn: string; pr: string; total: string };

// Planned Removal is excluded: it stays manual unless NRSDB supplies ETRs, so
// typing in it must not block the next day's preload.
function sameEsr(a: Esr, b: Esr): boolean {
  return a.imp === b.imp && a.amd === b.amd && a.wdn === b.wdn && a.total === b.total;
}

function readAutofill(): { snapshotDate: string; esr: Esr } | null {
  try {
    const raw = localStorage.getItem(LS_ESR_AUTOFILL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeAutofill(snapshotDate: string, esr: Esr): void {
  try { localStorage.setItem(LS_ESR_AUTOFILL_KEY, JSON.stringify({ snapshotDate, esr })); } catch { /* silent */ }
}

// Remembers the engineering text last auto-filled from the Engineering Hub,
// so the next preload can tell a fresh Hub update from an operator's hand edit.
const LS_ENG_AUTOFILL_KEY = "ma_sos_eng_autofill";

function readEngAutofill(): string | null {
  try { return localStorage.getItem(LS_ENG_AUTOFILL_KEY); } catch { return null; }
}

function writeEngAutofill(text: string): void {
  try { localStorage.setItem(LS_ENG_AUTOFILL_KEY, text); } catch { /* silent */ }
}

const TONE: Record<"ok" | "warn" | "err", string> = { ok: "var(--good)", warn: "var(--moderate)", err: "var(--poor)" };

function FillStatus({ msg }: { msg: { tone: "ok" | "warn" | "err"; text: string } }) {
  return <span style={{ color: TONE[msg.tone] }}>{msg.text}</span>;
}

export default function SoSTab() {
  const {
    sos, setSoS, setSoSToc, setSoSNr, setSoSOncall, setSoSEsr, setSoSPerf,
    seasonalTemplates,
  } = useStore();

  const [showTemplates, setShowTemplates] = useState(false);
  const sosTemplates = seasonalTemplates.filter((t) => t.tab === "sos");

  // Weather from the NR Route 7 Day Forecast (ingested by DLog2 into the
  // shared Supabase project). One click fills the three weather fields in
  // the message's established format; the text stays editable.
  const [wxBusy, setWxBusy] = useState(false);
  const [wxMsg, setWxMsg] = useState<{ tone: "ok" | "warn" | "err"; text: string } | null>(null);

  async function fillWeatherFromForecast() {
    setWxBusy(true);
    setWxMsg(null);
    try {
      const fc = await fetchLatestRouteForecast();
      if (!fc) {
        setWxMsg({ tone: "warn", text: "No Route 7 Day Forecast in the shared store yet — drop today's PDF into DLog2 first." });
        return;
      }
      const built = buildSosWeather(fc);
      setSoS({ weather: built.weather, maxtemps: built.maxtemps, forecast: built.forecast });
      const note = built.notes.length ? ` · ${built.notes.join(" ")}` : "";
      setWxMsg({
        tone: built.notes.length ? "warn" : "ok",
        text: `Filled from the Route 7 Day Forecast ${describeIssue(fc)} for ${built.forDate}${note}`,
      });
    } catch (e) {
      setWxMsg({ tone: "err", text: e instanceof Error ? e.message : "Could not read the forecast" });
    } finally {
      setWxBusy(false);
    }
  }

  // ESRs from DLog2's NRSDB snapshots (shared Supabase project). Preloaded
  // when the tab opens if a newer snapshot exists and the fields hold either
  // the defaults or the previous autofill; the button re-reads on demand.
  const [esrBusy, setEsrBusy] = useState(false);
  const [esrMsg, setEsrMsg] = useState<{ tone: "ok" | "warn" | "err"; text: string } | null>(null);

  async function fillEsrFromDlog(auto = false) {
    setEsrBusy(true);
    if (!auto) setEsrMsg(null);
    try {
      const run = await fetchLatestEsrRun();
      if (!run) {
        if (!auto) setEsrMsg({ tone: "warn", text: "No ESR snapshot in DLog2 yet — build today's log first." });
        return;
      }
      const current = useStore.getState().sos.esr;
      const prev = readAutofill();
      if (auto) {
        const untouched = sameEsr(current, DEFAULT_SOS.esr) || (prev !== null && sameEsr(current, prev.esr));
        if (prev?.snapshotDate === run.snapshotDate && sameEsr(current, prev.esr)) return;
        if (!untouched) {
          setEsrMsg({ tone: "warn", text: `DLog2 ESR snapshot ${run.snapshotDate} available — fields were edited by hand, so not overwritten. Use "Fill from DLog2" to load it.` });
          return;
        }
      }
      const built = buildSosEsr(run);
      const filled: Esr = { ...current, ...built.esr };
      setSoSEsrAll(filled);
      writeAutofill(run.snapshotDate, filled);
      setEsrMsg({
        tone: built.notes.length ? "warn" : "ok",
        text: `Filled from DLog2 ESR snapshot ${run.snapshotDate} (${describeRun(run)})${built.notes.length ? ` · ${built.notes.join(" ")}` : ""}`,
      });
    } catch (e) {
      setEsrMsg({ tone: "err", text: e instanceof Error ? e.message : "Could not read the DLog2 ESR snapshot" });
    } finally {
      setEsrBusy(false);
    }
  }

  const esrAutoRan = useRef(false);
  useEffect(() => {
    if (esrAutoRan.current) return;
    esrAutoRan.current = true;
    fillEsrFromDlog(true);
    // Run once on mount only; later fills are manual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setSoSEsrAll(esr: Esr) {
    (Object.keys(esr) as (keyof Esr)[]).forEach((k) => setSoSEsr(k, esr[k]));
  }

  // Critical engineering from the Engineering Hub (shared Supabase project),
  // for the 05:30 slot of the SoS date. Preloaded when the tab opens and when
  // switched to auto, but only over a blank field or the previous auto text —
  // never over a hand edit. Refresh always reloads. Manual mode never reads.
  const [engBusy, setEngBusy] = useState(false);
  const [engMsg, setEngMsg] = useState<FillMsg>(null);

  const fillEngFromHub = useCallback(async (auto = false) => {
    setEngBusy(true);
    if (!auto) setEngMsg(null);
    try {
      const r = await buildEngineeringForSlot("0530", sosDateISO());
      // Read the store after the await: on first load this runs before hydrate.
      const { eng: current, engMode } = useStore.getState().sos;
      if (auto) {
        if (engMode !== "auto") return;
        const untouched = current.trim() === "" || current === readEngAutofill();
        if (!untouched) {
          if (current !== r.text) {
            setEngMsg({ tone: "warn", text: `Engineering Hub text available — the field was edited by hand, so not overwritten. Use Refresh to load it.` });
          }
          return;
        }
      }
      setSoS({ eng: r.text });
      writeEngAutofill(r.text);
      setEngMsg({ tone: "ok", text: describeEngineeringFill(r) });
    } catch (e) {
      setEngMsg({ tone: "err", text: e instanceof Error ? e.message : "Could not read the Engineering Hub" });
    } finally {
      setEngBusy(false);
    }
  }, [setSoS]);

  useEffect(() => {
    if (sos.engMode !== "auto") return;
    fillEngFromHub(true);
  }, [sos.engMode, fillEngFromHub]);

  const status = opsStatusBadge(sos.status);

  return (
    <>
      <TabHeader tab="sos" />
      <div className="stagger flex flex-col gap-4">
        <Card title="Greeting">
          <AutoTextarea value={sos.intro} onChange={(v) => setSoS({ intro: v })} />
        </Card>

        <Card title="Operational status" action={status && <Badge color={status.color} dot>{status.label}</Badge>}>
          <StatusSelect value={sos.status} options={LONG_OPS} onChange={(v) => setSoS({ status: v })} />
        </Card>

        <Card title="Overnight safety incidents">
          <AutoTextarea value={sos.safety} onChange={(v) => setSoS({ safety: v })} placeholder="Nil" />
        </Card>

        <Card title="Yesterday's route performance" padded={false}>
          <PerfTable
            metrics={sos.perf}
            locked
            onUpdate={(i, p) => setSoSPerf(i, p)}
          />
        </Card>

        <Card title="TOC service and fleet start up">
          <div className="grid gap-3 sm:grid-cols-3">
            {(["sos_toc_gtr", "sos_toc_emr", "sos_toc_xc"] as const).map((key, i) => {
              const labels = ["GTR", "EMR", "Cross Country"];
              return (
                <Field key={key} label={labels[i]}>
                  <StatusSelect value={sos.toc[key]} options={SHORT_OPS} onChange={(v) => setSoSToc(key, v)} />
                </Field>
              );
            })}
          </div>
        </Card>

        <Card title="Network Rail infrastructure">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(["sos_tl", "sos_south", "sos_north", "sos_lincs"] as const).map((key, i) => {
              const labels = ["TL Core", "South", "North", "Lincolnshire"];
              return (
                <Field key={key} label={labels[i]}>
                  <StatusSelect value={sos.nr[key]} options={SHORT_OPS} onChange={(v) => setSoSNr(key, v)} />
                </Field>
              );
            })}
          </div>
        </Card>

        <Card title="On call" subtitle="Names only. Output wording is fixed." padded={false}>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Until <span className="font-mono">08:00</span></th>
                  <th>From <span className="font-mono">08:00</span></th>
                </tr>
              </thead>
              <tbody>
                {([
                  ["Executive",   "exec_until",  "exec_from"],
                  ["Operations",  "ops_until",   "ops_from"],
                  ["Maintenance", "maint_until", "maint_from"],
                ] as const).map(([label, until, from]) => (
                  <tr key={label}>
                    <td className="!align-middle font-semibold">{label}</td>
                    <td className="min-w-[9rem]">
                      <input type="text" value={sos.oncall[until]} onChange={(e) => setSoSOncall(until, e.target.value)} placeholder="Name" aria-label={`${label} until 08:00`} className="input !py-1" />
                    </td>
                    <td className="min-w-[9rem]">
                      <input type="text" value={sos.oncall[from]} onChange={(e) => setSoSOncall(from, e.target.value)} placeholder="Name" aria-label={`${label} from 08:00`} className="input !py-1" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Incidents ongoing/concluded since last update">
          <AutoTextarea value={sos.incidents} onChange={(v) => setSoS({ incidents: v })} />
        </Card>

        <Card
          title="Emergency speed restrictions"
          subtitle={esrMsg && <FillStatus msg={esrMsg} />}
          action={
            <button
              type="button"
              onClick={() => fillEsrFromDlog(false)}
              disabled={esrBusy}
              title="Fill the ESR fields from today's DLog2 NRSDB snapshot (imposed / amended / withdrawn vs the previous snapshot)"
              className="btn btn-ghost btn-sm"
            >
              {esrBusy ? <span className="spinner" /> : <Gauge size={13} />} {esrBusy ? "Reading DLog2…" : "Fill from DLog2"}
            </button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {(["imp", "amd", "wdn", "pr"] as const).map((k) => {
              const labels = { imp: "Imposed", amd: "Amended", wdn: "Withdrawn", pr: "Planned Removal" };
              return (
                <Field key={k} label={labels[k]}>
                  <AutoTextarea value={sos.esr[k]} onChange={(v) => setSoSEsr(k, v)} placeholder="Nil" minRows={1} />
                </Field>
              );
            })}
            <Field label="Total" className="sm:col-span-2">
              <input type="text" value={sos.esr.total} onChange={(e) => setSoSEsr("total", e.target.value)} placeholder="e.g. 24 ESRs in force" className="input" />
            </Field>
          </div>
        </Card>

        <Card
          title="Weather"
          subtitle={wxMsg && <FillStatus msg={wxMsg} />}
          action={
            <button
              type="button"
              onClick={fillWeatherFromForecast}
              disabled={wxBusy}
              title="Fill the three weather fields from today's NR Route 7 Day Forecast (four areas), as ingested by DLog2"
              className="btn btn-ghost btn-sm"
            >
              {wxBusy ? <span className="spinner" /> : <CloudSun size={13} />} {wxBusy ? "Reading forecast…" : "Fill from Route Forecast"}
            </button>
          }
        >
          <div className="flex flex-col gap-3">
            <Field label="Weather forecast summary">
              <AutoTextarea value={sos.weather} onChange={(v) => setSoS({ weather: v })} />
            </Field>
            <Field label="Max temperatures">
              <input type="text" value={sos.maxtemps} onChange={(e) => setSoS({ maxtemps: e.target.value })} placeholder="Lincolnshire - Max 21.0 Min 14.5 / EM North - Max 20.0 Min 12.5 / EM South - Max 20.0 Min 14.0 / London - Luton - Max 20.0 Min 14.0" className="input" />
            </Field>
            <Field label="Forecast — 24 hours">
              <AutoTextarea value={sos.forecast} onChange={(v) => setSoS({ forecast: v })} />
            </Field>
          </div>
        </Card>

        <EngineeringHubSection
          title="Engineering and Critical Works"
          mode={sos.engMode}
          onModeChange={(m) => setSoS({ engMode: m })}
          text={sos.eng}
          onTextChange={(v) => setSoS({ eng: v })}
          busy={engBusy}
          msg={engMsg}
          onRefresh={() => fillEngFromHub(false)}
        />

        <Card
          title="Optional seasonal slot"
          action={
            sosTemplates.length > 0 && (
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                aria-expanded={showTemplates}
                className="btn btn-ghost btn-sm"
              >
                Load template <ChevronDown size={13} style={{ transform: showTemplates ? "rotate(180deg)" : "none" }} />
              </button>
            )
          }
        >
          {showTemplates && sosTemplates.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {sosTemplates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setSoS({ seasonal_opt: t.content }); setShowTemplates(false); }}
                  className="chip"
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
        </Card>
      </div>
    </>
  );
}
