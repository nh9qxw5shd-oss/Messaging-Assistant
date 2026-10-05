"use client";
import { useEffect } from "react";
import { ChevronRight, Check, Plus, RotateCcw, Siren, Trash2 } from "lucide-react";
import { useIncidentStore } from "@/lib/incident/store";
import {
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
} from "@/components/incident/editors";
import AutoTextarea from "@/components/shared/AutoTextarea";
import TabHeader from "@/components/TabHeader";
import { Badge, Card, EmptyState } from "@/components/ui";
import { useDialog } from "@/components/uiFeedback";

// ─── Incident rail ────────────────────────────────────────────────────────────

function IncidentRail() {
  const { incidents, activeId, setActive, reopenIncident, deleteIncident } = useIncidentStore();
  const dialog = useDialog();
  const open = incidents.filter((i) => i.phase !== "closed");
  const closed = incidents.filter((i) => i.phase === "closed");

  if (incidents.length === 0) return null;

  return (
    <Card title="Incidents" subtitle={`${open.length} open${closed.length ? ` · ${closed.length} closed` : ""}`}>
      <div className="flex flex-col gap-3">
        {open.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {open.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => setActive(i.id)}
                className="chip max-w-[260px]"
                aria-pressed={i.id === activeId}
              >
                <span className="truncate">{i.title.trim() || "New incident"}</span>
              </button>
            ))}
          </div>
        )}
        {closed.length > 0 && (
          <div className={open.length > 0 ? "border-t border-edge pt-3" : ""}>
            <span className="lbl">Closed</span>
            <div className="flex flex-wrap gap-1.5">
              {closed.map((i) => (
                <span
                  key={i.id}
                  className="inline-flex max-w-[240px] items-center gap-0.5 rounded-full border border-edge py-0.5 pl-3 pr-1 text-xs text-dim"
                >
                  <span className="truncate">{i.title.trim() || "Untitled"}</span>
                  <button
                    type="button"
                    onClick={() => reopenIncident(i.id)}
                    title="Reopen"
                    aria-label="Reopen"
                    className="btn btn-ghost btn-icon btn-sm"
                  >
                    <RotateCcw size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await dialog.confirm({
                        title: "Delete this incident and its timeline?",
                        confirmLabel: "Delete",
                        danger: true,
                      });
                      if (ok) deleteIncident(i.id);
                    }}
                    title="Delete"
                    aria-label="Delete"
                    className="btn btn-ghost btn-icon btn-sm hover:!text-poor"
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Phase stepper ────────────────────────────────────────────────────────────

function PhaseStepper({ inc }: { inc: IncidentState }) {
  const { setPhase } = useIncidentStore();
  // Stages that have had a message copied out show green, marking progress.
  const sentPhases = new Set(inc.sent.map((m) => m.phase));
  return (
    <Card title="Message stage" subtitle="Stages with a message copied out are marked done.">
      <div className="flex flex-wrap items-center gap-1">
        {PHASE_ORDER.map((p, idx) => {
          const active = inc.phase === p;
          const done = sentPhases.has(p);
          return (
            <div key={p} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight size={13} className="text-faint" />}
              <button
                type="button"
                onClick={() => setPhase(p)}
                className="chip"
                aria-pressed={active}
                style={
                  !active && done
                    ? {
                        color: "var(--good)",
                        borderColor: "color-mix(in srgb, var(--good) 55%, transparent)",
                        background: "color-mix(in srgb, var(--good) 12%, transparent)",
                      }
                    : undefined
                }
              >
                {done && <Check size={12} />}
                {PHASE_LABELS[p]}
                {p === "update" && inc.updateCount > 0 ? ` (${inc.updateCount} sent)` : ""}
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Identity section ─────────────────────────────────────────────────────────

function IdentitySection({ inc }: { inc: IncidentState }) {
  const { patch, closeIncident } = useIncidentStore();
  const dialog = useDialog();
  return (
    <Section
      title="Incident"
      action={
        <button
          type="button"
          onClick={async () => {
            const ok = await dialog.confirm({
              title: "Close this incident? It moves to the closed list.",
              confirmLabel: "Close incident",
              danger: true,
            });
            if (ok) closeIncident();
          }}
          className="btn btn-danger btn-sm"
        >
          Close incident
        </button>
      }
    >
      <Field label="Title — type of failure / event – location">
        <input
          className="input"
          value={inc.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="e.g. Car on the Line Orston"
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Severity (banner)">
          <div className="flex flex-wrap gap-1.5">
            {(["red", "black"] as const).map((s) => {
              const on = inc.severity === s;
              const color = s === "black" ? "var(--text)" : "var(--poor)";
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => patch({ severity: s })}
                  className="chip min-w-20 justify-center capitalize"
                  aria-pressed={on}
                  style={
                    on
                      ? {
                          color,
                          borderColor: `color-mix(in srgb, ${color} 60%, transparent)`,
                          background: `color-mix(in srgb, ${color} 12%, transparent)`,
                        }
                      : undefined
                  }
                >
                  {s}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Location">
          <select
            className="input cursor-pointer"
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Banner override">
          <select
            className="input cursor-pointer"
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
        <Field label="Register">
          <div className="flex flex-wrap gap-1.5">
            {(["full", "brief"] as const).map((r) => (
              <Chip key={r} selected={inc.register === r} onClick={() => patch({ register: r })}>
                {r === "full" ? "Full template" : "Brief"}
              </Chip>
            ))}
          </div>
        </Field>
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
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="DSF trains">
        <input className="input font-mono" value={inc.dsf.trains} onChange={(e) => setDsf("trains", e.target.value)} placeholder="23" />
      </Field>
      <Field label="DSF minutes">
        <input className="input font-mono" value={inc.dsf.minutes} onChange={(e) => setDsf("minutes", e.target.value)} placeholder="170" />
      </Field>
      <Field label="Cancellations">
        <input className="input" value={inc.dsf.cancellations} onChange={(e) => setDsf("cancellations", e.target.value)} placeholder="3 part cancellations" />
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
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Time (XXXX → XX:XX)">
                <input
                  className="input font-mono"
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
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={inc.nwr.contingencyWithdrawn}
                onChange={(e) => patch({ nwr: { ...inc.nwr, contingencyWithdrawn: e.target.checked } })}
              />
              Contingency plan withdrawn
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={inc.nwr.recoveryToFollow}
                onChange={(e) => patch({ nwr: { ...inc.nwr, recoveryToFollow: e.target.checked } })}
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
          <Section title="Next review">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Next review (HH:MM)">
                <input className="input font-mono" value={inc.recovery.nextReview} onChange={(e) => setRec("nextReview", e.target.value)} placeholder="16:30" />
              </Field>
            </div>
          </Section>
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

  const openCount = incidents.filter((i) => i.phase !== "closed").length;

  return (
    <>
      <TabHeader
        tab="incident"
        badge={openCount > 0 ? <Badge color="var(--poor)" dot>{openCount} open</Badge> : undefined}
        actions={
          <button type="button" onClick={createIncident} className="btn btn-primary">
            <Plus size={15} /> New incident
          </button>
        }
      />
      <div className="stagger flex flex-col gap-4">
        <IncidentRail />

        {!inc && (
          <Card>
            <EmptyState
              icon={Siren}
              title="No incidents on the go"
              hint="Start one and send a holding message within seconds — everything you enter carries forward through the whole messaging cycle."
              action={
                <button type="button" onClick={createIncident} className="btn btn-primary">
                  <Plus size={15} /> New incident
                </button>
              }
            />
          </Card>
        )}

        {inc && inc.phase === "closed" && (
          <Card>
            <p className="text-sm text-dim">
              This incident is closed — reopen it from the rail above to send further messages.
            </p>
          </Card>
        )}

        {inc && inc.phase !== "closed" && (
          <>
            <PhaseStepper inc={inc} />
            {/* Preview + copy live in the right-hand panel, like every other tab. */}
            <IdentitySection inc={inc} />
            <PhaseForm inc={inc} />
          </>
        )}
      </div>
    </>
  );
}
