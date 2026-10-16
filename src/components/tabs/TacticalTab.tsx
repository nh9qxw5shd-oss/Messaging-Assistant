"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, SkipForward } from "lucide-react";
import { useStore } from "@/lib/store";
import AutoTextarea from "@/components/shared/AutoTextarea";
import StatusSelect from "@/components/shared/StatusSelect";
import PerfTable from "@/components/shared/PerfTable";
import LivePerfStatus from "@/components/shared/LivePerfStatus";
import EngineeringHubSection, { type FillMsg } from "@/components/shared/EngineeringHubSection";
import { LONG_OPS, TACTICAL_SLOTS } from "@/lib/constants";
import type { TacticalSlot } from "@/lib/types";
import { SLOT_LABEL, buildEngineeringForSlot, describeEngineeringFill } from "@/lib/engineering/engineeringHub";
import { activeTacticalSlot, slotKey, tacticalSlotDate } from "@/lib/snapshots/messageSlot";
import { doneKeys, useSentStore } from "@/lib/snapshots/sent";

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
  // While on auto the tab stays on the current message (09:00, 15:00, 22:00)
  // until it is marked as sent, moved on by hand, or an hour past its booked
  // time; after 22:00 it is tomorrow's 09:00. One logged on copy stays a few
  // minutes more, so it can be pasted again or corrected. Re-evaluated on open, every
  // minute and whenever a sent mark arrives (from this or another machine).
  const sent = useSentStore((s) => s.sent);
  const sentVia = useSentStore((s) => s.via);
  const movedOn = useSentStore((s) => s.movedOn);
  const moveOn = useSentStore((s) => s.moveOn);
  const doneSig = [...Object.keys(sent), ...movedOn].sort().join(",");
  useEffect(() => {
    if (tac.slotMode !== "auto") return;
    const tick = () => {
      const { slot } = activeTacticalSlot(new Date(), doneKeys(useSentStore.getState()));
      if (slot !== useStore.getState().tac.slot) setTacSlot(slot);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [tac.slotMode, setTacSlot, doneSig]);

  // ─── Critical engineering from the Engineering Hub ────────────────────────
  // Fetched for the slot's date (its nearest occurrence) on open, on a slot change and
  // on Refresh while on auto. A failed read keeps whatever text is there.
  const [engBusy, setEngBusy] = useState(false);
  const [engMsg, setEngMsg] = useState<FillMsg>(null);
  const engReq = useRef(0);

  const refreshEng = useCallback(async (slot: TacticalSlot) => {
    const req = ++engReq.current;
    setEngBusy(true);
    try {
      const r = await buildEngineeringForSlot(slot, tacticalSlotDate(slot));
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
        subtitle="Auto stays on each message until it is sent (copying it from 30 minutes before its time logs it) or an hour past its time. Pick one to override; Auto hands it back."
        actions={
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Tactical message slot">
            {TACTICAL_SLOTS.map((s) => {
              const key = slotKey(tacticalSlotDate(s), s);
              const sentAt = sent[key];
              return (
                <button
                  key={s}
                  type="button"
                  className="chip font-mono"
                  aria-pressed={tac.slot === s}
                  onClick={() => setTacSlot(s, "manual")}
                  title={sentAt ? `${sentVia[key] === "copy" ? "Logged as sent on copy" : "Marked as sent"} at ${new Date(sentAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}` : undefined}
                >
                  {sentAt && <Check size={13} style={{ color: "var(--good)" }} aria-label="sent" />}
                  {SLOT_LABEL[s]}
                </button>
              );
            })}
            <button
              type="button"
              className="chip"
              aria-pressed={auto}
              onClick={() => { if (!auto) setTacSlot(activeTacticalSlot(new Date(), doneKeys(useSentStore.getState())).slot, "auto"); }}
              title={auto ? "Following the current message; pick a slot to override" : "Follow the current message again"}
            >
              <StatusDot color={auto ? "var(--good)" : "var(--text-faint)"} /> Auto
            </button>
            {auto && (
              <button
                type="button"
                className="chip"
                onClick={() => moveOn(slotKey(tacticalSlotDate(tac.slot), tac.slot))}
                title="Move on to the next message without marking this one as sent"
              >
                <SkipForward size={13} /> Move on
              </button>
            )}
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
