"use client";
import { useStore } from "@/lib/store";
import AutoTextarea from "@/components/shared/AutoTextarea";
import StatusSelect from "@/components/shared/StatusSelect";
import PerfTable from "@/components/shared/PerfTable";
import { DEFAULT_SOS, LONG_OPS, SHORT_OPS } from "@/lib/constants";
import type { SeasonalTemplate } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { buildSosWeather, describeIssue, fetchLatestRouteForecast } from "@/lib/weather/sosWeather";
import { buildSosEsr, describeRun, fetchLatestEsrRun } from "@/lib/esr/sosEsr";

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
  }, []);

  function setSoSEsrAll(esr: Esr) {
    (Object.keys(esr) as (keyof Esr)[]).forEach((k) => setSoSEsr(k, esr[k]));
  }

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
      <div className={sectionCls}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionHeading>Emergency Speed Restrictions</SectionHeading>
          <button
            type="button"
            onClick={() => fillEsrFromDlog(false)}
            disabled={esrBusy}
            title="Fill the ESR fields from today's DLog2 NRSDB snapshot (imposed / amended / withdrawn vs the previous snapshot)"
            className="mb-2 rounded border border-grid bg-panel2 px-3 py-1 font-mono text-xs uppercase tracking-widest text-ink/80 hover:border-accent hover:text-ink disabled:opacity-50"
          >
            {esrBusy ? "Reading DLog2…" : "Fill from DLog2"}
          </button>
        </div>
        {esrMsg && (
          <p
            className={clsx(
              "-mt-1 text-xs",
              esrMsg.tone === "ok" && "text-emerald-400",
              esrMsg.tone === "warn" && "text-amber-400",
              esrMsg.tone === "err" && "text-red-400",
            )}
          >
            {esrMsg.text}
          </p>
        )}
        {(["imp", "amd", "wdn", "pr"] as const).map((k) => {
          const labels = { imp: "Imposed", amd: "Amended", wdn: "Withdrawn", pr: "Planned Removal" };
          return (
            <div key={k}>
              <label className={labelCls}>{labels[k]}</label>
              <AutoTextarea value={sos.esr[k]} onChange={(v) => setSoSEsr(k, v)} placeholder="Nil" minRows={1} />
            </div>
          );
        })}
        <div>
          <label className={labelCls}>Total</label>
          <input type="text" value={sos.esr.total} onChange={(e) => setSoSEsr("total", e.target.value)} placeholder="e.g. 24 ESRs in force" className={inputCls} />
        </div>
      </div>

      {/* Weather */}
      <div className={sectionCls}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionHeading>Weather Forecast Summary</SectionHeading>
          <button
            type="button"
            onClick={fillWeatherFromForecast}
            disabled={wxBusy}
            title="Fill the three weather fields from today's NR Route 7 Day Forecast (four areas), as ingested by DLog2"
            className="mb-2 rounded border border-grid bg-panel2 px-3 py-1 font-mono text-xs uppercase tracking-widest text-ink/80 hover:border-accent hover:text-ink disabled:opacity-50"
          >
            {wxBusy ? "Reading forecast…" : "Fill from Route Forecast"}
          </button>
        </div>
        {wxMsg && (
          <p
            className={clsx(
              "-mt-1 text-xs",
              wxMsg.tone === "ok" && "text-emerald-400",
              wxMsg.tone === "warn" && "text-amber-400",
              wxMsg.tone === "err" && "text-red-400",
            )}
          >
            {wxMsg.text}
          </p>
        )}
        <AutoTextarea value={sos.weather} onChange={(v) => setSoS({ weather: v })} />
      </div>

      <div className={sectionCls}>
        <SectionHeading>Max Temperatures</SectionHeading>
        <input type="text" value={sos.maxtemps} onChange={(e) => setSoS({ maxtemps: e.target.value })} placeholder="Lincolnshire - Max 21.0 Min 14.5 / EM North - Max 20.0 Min 12.5 / EM South - Max 20.0 Min 14.0 / London - Luton - Max 20.0 Min 14.0" className={inputCls} />
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
