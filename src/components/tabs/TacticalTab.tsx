"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
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

import TabHeader from "@/components/TabHeader";
import { Badge, Card, Field, StatusDot } from "@/components/ui";
import { opsStatusBadge } from "@/lib/opsStatus";

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

  const auto = tac.slotMode === "auto";
  const status = opsStatusBadge(tac.status);

  return (
    <>
      <TabHeader
        tab="tactical"
        badge={<Badge color="var(--accent)" dot>{SLOT_LABEL[tac.slot]} · {auto ? "auto" : "manual"}</Badge>}
        subtitle="The slot follows the London clock. Pick one to override; Auto hands it back."
        actions={
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Tactical message slot">
            {TACTICAL_SLOTS.map((s) => (
              <button key={s} type="button" className="chip font-mono" aria-pressed={tac.slot === s} onClick={() => setTacSlot(s, "manual")}>
                {SLOT_LABEL[s]}
              </button>
            ))}
            <button
              type="button"
              className="chip"
              aria-pressed={auto}
              onClick={() => { if (!auto) setTacSlot(defaultTacticalSlot(), "auto"); }}
              title={auto ? "Following the London clock; pick a slot to override" : "Follow the London clock again"}
            >
              <StatusDot color={auto ? "var(--good)" : "var(--text-faint)"} /> Auto
            </button>
          </div>
        }
      />

      <div className="stagger flex flex-col gap-4">
        <Card title="Greeting">
          <AutoTextarea value={tac.intro} onChange={(v) => setTac({ intro: v })} />
        </Card>

        <Card title="Control command team">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="SNDM">
              <input type="text" value={tac.sndm} onChange={(e) => setTac({ sndm: e.target.value })} placeholder="Name" className="input" />
            </Field>
            <Field label="RCM">
              <input type="text" value={tac.rcm} onChange={(e) => setTac({ rcm: e.target.value })} placeholder="Name" className="input" />
            </Field>
          </div>
        </Card>

        <Card title="Operational status" action={status && <Badge color={status.color} dot>{status.label}</Badge>}>
          <StatusSelect value={tac.status} options={LONG_OPS} onChange={(v) => setTac({ status: v })} />
          <Field label="Safety incidents / accidents" className="mt-3">
            <AutoTextarea value={tac.safety} onChange={(v) => setTac({ safety: v })} placeholder="Nil" />
          </Field>
        </Card>

        <Card title="Route performance" padded={false} action={<LivePerfStatus />}>
          <PerfTable
            metrics={tac.perf}
            locked
            onUpdate={(i, p) => setTacPerf(i, p)}
          />
        </Card>

        <Card title="Incidents" subtitle="Ongoing or concluded since the last update">
          <AutoTextarea value={tac.incidents} onChange={(v) => setTac({ incidents: v })} />
        </Card>

        <Card title="Late running services" padded={false}>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="w-16">TOC</th>
                  <th className="min-w-[7rem]">🟪 20 min+</th>
                  <th className="min-w-[7rem]">🟥 10–20 min</th>
                  <th className="min-w-[12rem]">Interventions</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ["GTR", "gtr20", "gtr10", "gtrInt"],
                  ["EMR", "emr20", "emr10", "emrInt"],
                ] as const).map(([toc, k20, k10, kInt]) => (
                  <tr key={toc}>
                    <td className="!align-middle font-semibold text-dim">{toc}</td>
                    <td>
                      <input type="text" value={tac.late[k20]} onChange={(e) => setTacLate(k20, e.target.value)} className="input !py-1" />
                    </td>
                    <td>
                      <input type="text" value={tac.late[k10]} onChange={(e) => setTacLate(k10, e.target.value)} className="input !py-1" />
                    </td>
                    <td>
                      <AutoTextarea value={tac.late[kInt]} onChange={(v) => setTacLate(kInt, v)} placeholder="Actions taken / mitigation" minRows={1} className="!py-1" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <EngineeringHubSection
          title={tac.slot === "2200" ? "Critical engineering – overnight" : "Critical engineering"}
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

        <Card
          title="Seasonal slot"
          subtitle="Optional; the heading is hidden in the output"
          action={tacTemplates.length > 0 && (
            <button type="button" onClick={() => setShowTemplates(!showTemplates)} className="btn btn-ghost btn-sm" aria-expanded={showTemplates}>
              Load template <ChevronDown size={13} style={{ transform: showTemplates ? "rotate(180deg)" : "none", transition: "transform var(--dur) var(--ease)" }} />
            </button>
          )}
        >
          {showTemplates && tacTemplates.length > 0 && (
            <div className="fade-in mb-3 flex flex-wrap gap-1.5">
              {tacTemplates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setTac({ seasonal: t.content }); setShowTemplates(false); }}
                  className="chip"
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
        </Card>
      </div>
    </>
  );
}
