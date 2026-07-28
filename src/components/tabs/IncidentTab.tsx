"use client";
import { useEffect } from "react";
import { useIncidentStore } from "@/lib/incident/store";
import {
  STATUS_EMOJI,
  PHASE_LABELS,
  PHASE_ORDER,
  STRATEGIC_PRIORITY_GROUPS,
  INCIDENT_BANNERS,
} from "@/lib/incident/constants";
import type { IncidentState, OffRoute } from "@/lib/incident/types";
import {
  Section,
  Field,
  Chip,
  OperatorPicker,
  StrandedEditor,
  ResponseEditor,
  CommandEditor,
  inp,
  sel,
} from "@/components/incident/editors";
import AutoTextarea from "@/components/shared/AutoTextarea";
import clsx from "clsx";

// ─── Incident rail ────────────────────────────────────────────────────────────

function IncidentRail() {
  const { incidents, activeId, setActive, createIncident, reopenIncident, deleteIncident } =
    useIncidentStore();
  const open = incidents.filter((i) => i.phase !== "closed");
  const closed = incidents.filter((i) => i.phase === "closed");

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {open.map((i) => (
        <button
          key={i.id}
          onClick={() => setActive(i.id)}
          className={clsx(
            "px-3 py-1.5 rounded text-sm border transition-colors max-w-[260px] truncate",
            i.id === activeId
              ? "bg-accent/15 border-accent text-accent"
              : "bg-panel2 border-grid text-muted hover:border-accent/50 hover:text-ink"
          )}
        >
          {STATUS_EMOJI[i.status]} {i.title.trim() || "New incident"}
        </button>
      ))}
      <button
        onClick={createIncident}
        className="px-3 py-1.5 rounded text-sm border border-dashed border-grid text-muted hover:text-ink hover:border-accent/50 transition-colors"
      >
        + New incident
      </button>
      {closed.length > 0 && (
        <div className="flex items-center gap-1.5 pl-2 ml-1 border-l border-grid/60">
          <span className="text-xs font-mono uppercase tracking-widest text-muted/50">Closed</span>
          {closed.map((i) => (
            <span
              key={i.id}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-grid/60 text-muted/70 max-w-[200px]"
            >
              <span className="truncate">{i.title.trim() || "Untitled"}</span>
              <button
                onClick={() => reopenIncident(i.id)}
                title="Reopen"
                className="hover:text-accent"
              >
                ↻
              </button>
              <button
                onClick={() => {
                  if (window.confirm("Delete this incident and its timeline?")) deleteIncident(i.id);
                }}
                title="Delete"
                className="hover:text-warn"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Phase stepper ────────────────────────────────────────────────────────────

function PhaseStepper({ inc }: { inc: IncidentState }) {
  const { setPhase } = useIncidentStore();
  // Stages that have had a message copied out show green, marking progress.
  const sentPhases = new Set(inc.sent.map((m) => m.phase));
  return (
    <div className="flex flex-wrap items-center gap-1">
      {PHASE_ORDER.map((p, idx) => {
        const active = inc.phase === p;
        const done = sentPhases.has(p);
        return (
          <div key={p} className="flex items-center gap-1">
            {idx > 0 && <span className="text-muted/30">→</span>}
            <button
              onClick={() => setPhase(p)}
              className={clsx(
                "px-3 py-1.5 rounded text-sm font-mono border transition-colors",
                active && "bg-accent/15 border-accent text-accent",
                !active && done && "bg-good/15 border-good text-good hover:border-good",
                !active && !done &&
                  "bg-panel2 border-grid text-muted hover:text-ink hover:border-accent/50"
              )}
            >
              {done ? "✓ " : ""}
              {PHASE_LABELS[p]}
              {p === "update" && inc.updateCount > 0 ? ` (${inc.updateCount} sent)` : ""}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Identity section ─────────────────────────────────────────────────────────

function IdentitySection({ inc }: { inc: IncidentState }) {
  const { patch, closeIncident } = useIncidentStore();
  return (
    <Section title="Incident">
      <Field label="Title — type of failure / event – location">
        <input
          className={inp}
          value={inc.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="e.g. Car on the Line Orston"
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Field label="Severity (banner)">
          <div className="grid grid-cols-2 gap-1.5">
            {(["red", "black"] as const).map((s) => (
              <button
                key={s}
                onClick={() => patch({ severity: s })}
                className={clsx(
                  "py-2 rounded text-sm font-mono border transition-colors capitalize",
                  inc.severity === s
                    ? s === "black"
                      ? "bg-ink/10 border-ink text-ink"
                      : "bg-warn/10 border-warn text-warn"
                    : "bg-panel2 border-grid text-muted hover:text-ink"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Location">
          <select
            className={sel}
            value={inc.offRoute}
            onChange={(e) => patch({ offRoute: e.target.value as OffRoute })}
          >
            <option value="">East Midlands Route</option>
            <option value="major">Off-route — Major Incident Alert</option>
            <option value="kent">Off-route — Kent</option>
            <option value="sussex">Off-route — Sussex</option>
            <option value="york">Off-route — York</option>
            <option value="rugby">Off-route — Rugby</option>
          </select>
        </Field>
      </div>
      <Field label="Banner override">
        <select
          className={sel}
          value={inc.bannerOverride}
          onChange={(e) => patch({ bannerOverride: e.target.value })}
        >
          <option value="">Automatic (from phase)</option>
          <option value="none">No banner</option>
          {INCIDENT_BANNERS.map((b) => (
            <option key={b.id} value={b.id}>{b.label}</option>
          ))}
        </select>
      </Field>
      <div className="flex gap-2 items-center">
        <span className="font-mono uppercase tracking-widest text-muted text-xs">Register</span>
        {(["full", "brief"] as const).map((r) => (
          <Chip key={r} selected={inc.register === r} onClick={() => patch({ register: r })}>
            {r === "full" ? "Full template" : "Brief"}
          </Chip>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => {
            if (window.confirm("Close this incident? It moves to the closed list.")) closeIncident();
          }}
          className="px-3 py-1.5 rounded text-sm font-semibold bg-bad text-white border border-bad hover:opacity-85 transition-opacity"
        >
          Close incident
        </button>
      </div>
    </Section>
  );
}

// ─── Phase-specific form sections ─────────────────────────────────────────────

function DsfFields({ inc }: { inc: IncidentState }) {
  const { patch } = useIncidentStore();
  const setDsf = (k: keyof IncidentState["dsf"], v: string) =>
    patch({ dsf: { ...inc.dsf, [k]: v } });
  return (
    <div className="grid grid-cols-3 gap-2">
      <Field label="DSF trains">
        <input className={inp} value={inc.dsf.trains} onChange={(e) => setDsf("trains", e.target.value)} placeholder="23" />
      </Field>
      <Field label="DSF minutes">
        <input className={inp} value={inc.dsf.minutes} onChange={(e) => setDsf("minutes", e.target.value)} placeholder="170" />
      </Field>
      <Field label="Cancellations">
        <input className={inp} value={inc.dsf.cancellations} onChange={(e) => setDsf("cancellations", e.target.value)} placeholder="3 part cancellations" />
      </Field>
    </div>
  );
}

function PhaseForm({ inc }: { inc: IncidentState }) {
  const { patch } = useIncidentStore();
  const brief = inc.register === "brief";

  const narrative = (label: string, placeholder: string) => (
    <Section title={label}>
      <AutoTextarea
        value={inc.draftNarrative}
        onChange={(v) => patch({ draftNarrative: v })}
        placeholder={placeholder}
        minRows={4}
      />
    </Section>
  );

  switch (inc.phase) {
    case "holding":
      return (
        <>
          {narrative("What's been reported", "Report received from … Details being established.")}
          {!brief && (
            <>
              <Section title="Operators impacted"><OperatorPicker inc={inc} /></Section>
              <Section title="Stranded trains"><StrandedEditor inc={inc} /></Section>
            </>
          )}
        </>
      );

    case "initial":
      if (brief) return narrative("Narrative", "One to four sentences — what, where, effect.");
      return (
        <>
          <Section title="Headline">
            <AutoTextarea
              value={inc.headline}
              onChange={(v) => patch({ headline: v })}
              placeholder="What happened, reported by whom, when, effect on the railway."
              minRows={3}
            />
          </Section>
          <Section title="Operators impacted"><OperatorPicker inc={inc} /></Section>
          <Section title="Stranded trains"><StrandedEditor inc={inc} /></Section>
          <Section title="Train service">
            <AutoTextarea value={inc.trainService} onChange={(v) => patch({ trainService: v })} placeholder="How services are running around the failure." minRows={2} />
          </Section>
          <Section title="Customer impact">
            <AutoTextarea value={inc.customerImpact} onChange={(v) => patch({ customerImpact: v })} placeholder="CSL declaration, ticket acceptance, road transport." minRows={2} />
          </Section>
          <Section title="Response"><ResponseEditor inc={inc} /></Section>
          <Section title="Command structure"><CommandEditor inc={inc} /></Section>
          <Section title="Prioritised plan">
            <AutoTextarea value={inc.priorityPlan} onChange={(v) => patch({ priorityPlan: v })} placeholder={"1. Response staff to site\n2. …"} minRows={3} />
          </Section>
          <Section title="Milestone plan">
            <AutoTextarea value={inc.milestonePlan} onChange={(v) => patch({ milestonePlan: v })} placeholder="To be established once assessment complete." minRows={2} />
          </Section>
        </>
      );

    case "update":
      return (
        <>
          {narrative(`Update ${inc.updateCount + 1} — what's changed`, "Only the delta — everything else carries forward from the last message.")}
          {!brief && (
            <>
              <Section title="Strategic priorities">
                <div className="flex flex-wrap gap-1.5">
                  {STRATEGIC_PRIORITY_GROUPS.map((g) => (
                    <Chip
                      key={g.id}
                      selected={inc.strategicPriorities.includes(g.id)}
                      onClick={() =>
                        patch({
                          strategicPriorities: inc.strategicPriorities.includes(g.id)
                            ? inc.strategicPriorities.filter((x) => x !== g.id)
                            : [...inc.strategicPriorities, g.id],
                        })
                      }
                      title={g.text}
                    >
                      {g.label}
                    </Chip>
                  ))}
                </div>
              </Section>
              <Section title="Delay status"><DsfFields inc={inc} /></Section>
              <Section title="Operators impacted"><OperatorPicker inc={inc} /></Section>
              <Section title="Stranded trains"><StrandedEditor inc={inc} /></Section>
              <Section title="Train service">
                <AutoTextarea value={inc.trainService} onChange={(v) => patch({ trainService: v })} minRows={2} placeholder="" />
              </Section>
              <Section title="Customer impact">
                <AutoTextarea value={inc.customerImpact} onChange={(v) => patch({ customerImpact: v })} minRows={2} placeholder="" />
              </Section>
              <Section title="Response"><ResponseEditor inc={inc} /></Section>
              <Section title="Command structure"><CommandEditor inc={inc} /></Section>
              <Section title="Prioritised plan">
                <AutoTextarea value={inc.priorityPlan} onChange={(v) => patch({ priorityPlan: v })} minRows={2} placeholder="" />
              </Section>
              <Section title="Milestone plan">
                <AutoTextarea value={inc.milestonePlan} onChange={(v) => patch({ milestonePlan: v })} minRows={2} placeholder="" />
              </Section>
            </>
          )}
        </>
      );

    case "nwr":
      return (
        <>
          <Section title="Normal working resumed">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Time (XXXX → XX:XX)">
                <input
                  className={inp}
                  value={inc.nwr.time}
                  onChange={(e) => patch({ nwr: { ...inc.nwr, time: e.target.value } })}
                  placeholder="21:05"
                />
              </Field>
            </div>
            <AutoTextarea
              value={inc.nwr.detail}
              onChange={(v) => patch({ nwr: { ...inc.nwr, detail: v } })}
              placeholder="Cause found, handback detail, follow-up inspections."
              minRows={3}
            />
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={inc.nwr.contingencyWithdrawn}
                onChange={(e) => patch({ nwr: { ...inc.nwr, contingencyWithdrawn: e.target.checked } })}
                className="accent-accent w-3.5 h-3.5"
              />
              Contingency plan withdrawn
            </label>
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={inc.nwr.recoveryToFollow}
                onChange={(e) => patch({ nwr: { ...inc.nwr, recoveryToFollow: e.target.checked } })}
                className="accent-accent w-3.5 h-3.5"
              />
              Service recovery update to follow post ITSR huddle
            </label>
          </Section>
          <Section title="Delay status"><DsfFields inc={inc} /></Section>
        </>
      );

    case "recovery": {
      const setRec = (k: keyof IncidentState["recovery"], v: string) =>
        patch({ recovery: { ...inc.recovery, [k]: v } });
      return (
        <>
          <Section title="Delay status"><DsfFields inc={inc} /></Section>
          <Section title="Immediate plan going forward">
            <AutoTextarea value={inc.recovery.immediatePlan} onChange={(v) => setRec("immediatePlan", v)} minRows={3} placeholder="Priority now morning start-up, moving units accordingly…" />
          </Section>
          <Section title="Service group recovery target">
            <AutoTextarea value={inc.recovery.targets} onChange={(v) => setRec("targets", v)} minRows={3} placeholder={"EMR Inter City – recovery by 14:00\nCrossCountry – train by train"} />
          </Section>
          <Section title="Post incident service recovery">
            <AutoTextarea value={inc.recovery.postIncident} onChange={(v) => setRec("postIncident", v)} minRows={2} placeholder="Stock/crew displacement, next-day impact." />
          </Section>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Next review (HH:MM)">
              <input className={inp} value={inc.recovery.nextReview} onChange={(e) => setRec("nextReview", e.target.value)} placeholder="16:30" />
            </Field>
          </div>
          <Section title="Additional note">
            <AutoTextarea value={inc.recovery.note} onChange={(v) => setRec("note", v)} minRows={2} placeholder="" />
          </Section>
        </>
      );
    }

    default:
      return null;
  }
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export default function IncidentTab() {
  const { hydrate, hydrated, incidents, activeId, createIncident } = useIncidentStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const inc = incidents.find((i) => i.id === activeId) ?? null;

  if (!hydrated) return null;

  return (
    <div className="flex flex-col gap-4" style={{ minHeight: "calc(100vh - 130px)" }}>
      <IncidentRail />

      {!inc && (
        <div className="flex flex-col items-start gap-3 pt-8">
          <p className="text-muted">
            No incidents on the go. Start one and send a holding message within seconds —
            everything you enter carries forward through the whole messaging cycle.
          </p>
          <button
            onClick={createIncident}
            className="px-4 py-2.5 rounded font-semibold bg-accent text-white border border-accent/80 hover:bg-accent-dim transition-colors"
          >
            + New incident
          </button>
        </div>
      )}

      {inc && inc.phase === "closed" && (
        <p className="text-muted pt-4">
          This incident is closed — reopen it from the rail above to send further messages.
        </p>
      )}

      {inc && inc.phase !== "closed" && (
        <>
          <PhaseStepper inc={inc} />
          {/* Preview + copy live in the left rail, like every other tab. */}
          <div className="flex flex-col gap-4 w-full max-w-3xl">
            <IdentitySection inc={inc} />
            <PhaseForm inc={inc} />
          </div>
        </>
      )}
    </div>
  );
}
