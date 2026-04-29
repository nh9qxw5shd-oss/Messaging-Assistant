"use client";
import { useStore } from "@/lib/store";
import AutoTextarea from "@/components/shared/AutoTextarea";
import { SAFETY_TYPES, SAFETY_SUBTYPES, SAFETY_STATUS } from "@/lib/constants";
import type { SafetyTypeId } from "@/lib/types";
import clsx from "clsx";

const labelCls = "block font-mono uppercase tracking-widest text-muted mb-1.5";
const inputCls = "w-full rounded bg-panel2 border border-grid px-3 py-2 text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors placeholder:text-muted/60";
const selectCls = "w-full rounded bg-panel2 border border-grid px-3 py-2 text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors cursor-pointer";
const sectionCls = "flex flex-col gap-3";

export default function SafetyTab() {
  const { safety_msg, setSafety, setSafetyAction, clearSafety } = useStore();
  const sf = safety_msg;

  const subtypes = SAFETY_SUBTYPES[sf.type] ?? ["Other"];

  function handleTypeChange(typeId: string) {
    const newType = typeId as SafetyTypeId;
    const firstSubtype = SAFETY_SUBTYPES[newType]?.[0] ?? "Other";
    setSafety({ type: newType, subtype: firstSubtype });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Type + Subtype */}
      <div className="grid grid-cols-2 gap-3">
        <div className={sectionCls}>
          <label className={labelCls}>Incident Type</label>
          <select value={sf.type} onChange={(e) => handleTypeChange(e.target.value)} className={selectCls}>
            {SAFETY_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className={sectionCls}>
          <label className={labelCls}>Subtype</label>
          <select value={sf.subtype} onChange={(e) => setSafety({ subtype: e.target.value })} className={selectCls}>
            {subtypes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Location + Time */}
      <div className="grid grid-cols-2 gap-3">
        <div className={sectionCls}>
          <label className={labelCls}>Location</label>
          <input type="text" value={sf.location} onChange={(e) => setSafety({ location: e.target.value })} placeholder="Corby Station / WH162 / milepost…" className={inputCls} />
        </div>
        <div className={sectionCls}>
          <label className={labelCls}>Time (optional)</label>
          <input type="text" value={sf.time} onChange={(e) => setSafety({ time: e.target.value })} placeholder="10:19" className={inputCls} />
        </div>
      </div>

      {/* Asset + People */}
      <div className="grid grid-cols-2 gap-3">
        <div className={sectionCls}>
          <label className={labelCls}>Train / Asset / Worksite</label>
          <input type="text" value={sf.asset} onChange={(e) => setSafety({ asset: e.target.value })} placeholder="1K59 / LR444 / item 33…" className={inputCls} />
        </div>
        <div className={sectionCls}>
          <label className={labelCls}>People involved (optional)</label>
          <input type="text" value={sf.people} onChange={(e) => setSafety({ people: e.target.value })} placeholder="Driver ok / 2 x IC3 / Contractor…" className={inputCls} />
        </div>
      </div>

      {/* B — What happened */}
      <div className={sectionCls}>
        <label className={labelCls}>B. What happened (facts only)</label>
        <AutoTextarea
          value={sf.what}
          onChange={(v) => setSafety({ what: v })}
          placeholder="Keep it factual. No flavour."
          minRows={3}
        />
      </div>

      {/* C — Immediate actions */}
      <div>
        <label className={labelCls}>C. Immediate actions</label>
        <div className="grid grid-cols-2 gap-2">
          {([
            ["ebr",    "Emergency brake / TPWS intervention"],
            ["mom",    "MOM attending / on route"],
            ["btp",    "BTP advised / attending"],
            ["screen", "Screening arranged / stood down"],
            ["care",   "Care plan initiated"],
            ["ffcctv", "FFCCTV / comms review requested"],
          ] as const).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-2 text-ink cursor-pointer group select-none"
            >
              <input
                type="checkbox"
                checked={!!sf.actions[key]}
                onChange={(e) => setSafetyAction(key, e.target.checked)}
                className="accent-accent w-4 h-4 rounded"
              />
              <span className="group-hover:text-accent transition-colors">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Status + Owner */}
      <div className="grid grid-cols-2 gap-3">
        <div className={sectionCls}>
          <label className={labelCls}>Status</label>
          <select value={sf.status} onChange={(e) => setSafety({ status: e.target.value })} className={selectCls}>
            {SAFETY_STATUS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className={sectionCls}>
          <label className={labelCls}>Owner / Escalation (optional)</label>
          <input type="text" value={sf.owner} onChange={(e) => setSafety({ owner: e.target.value })} placeholder="LOM aware / Ops L2 / EMR DRM…" className={inputCls} />
        </div>
      </div>

      {/* Notes */}
      <div className={sectionCls}>
        <label className={labelCls}>Extra notes (optional)</label>
        <AutoTextarea
          value={sf.notes}
          onChange={(v) => setSafety({ notes: v })}
          placeholder="Anything else that matters (or future you will regret not adding)."
        />
      </div>

      {/* Clear */}
      <div className="pt-2 border-t border-grid/60">
        <button
          onClick={() => {
            if (window.confirm("Clear the safety form?")) clearSafety();
          }}
          className="px-4 py-2 rounded font-semibold bg-warn/10 text-warn border border-warn/30 hover:bg-warn/20 transition-colors"
        >
          Clear safety form
        </button>
        <p className="text-muted mt-2">Build generates the standardised A–D safety message — same output format every time.</p>
      </div>
    </div>
  );
}
