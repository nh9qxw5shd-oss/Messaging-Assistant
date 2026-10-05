"use client";
import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { useIncidentStore } from "@/lib/incident/store";
import {
  OPERATORS,
  RESPONSE_KINDS,
  COMMAND_ROLE_PRESETS,
  uid,
} from "@/lib/incident/constants";
import type { IncidentState } from "@/lib/incident/types";
import { Card } from "@/components/ui";
import clsx from "clsx";

// ─── Kit class aliases (kept for existing imports) ────────────────────────────

export const lbl = "lbl";
/** Input styling for fixed-width row inputs (add a width utility). */
export const inpBase = "input";
export const inp = "input";
export const sel = "input cursor-pointer";

/** One house-style card per logical form section. */
export function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card title={title} subtitle={subtitle} action={action}>
      <div className="flex flex-col gap-3">{children}</div>
    </Card>
  );
}

// A div rather than a <label> so fields holding buttons (segmented controls)
// do not forward label clicks to their first button.
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="lbl">{label}</span>
      {children}
    </div>
  );
}

export function Chip({
  selected,
  onClick,
  children,
  title,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button type="button" onClick={onClick} title={title} className="chip" aria-pressed={selected}>
      {children}
    </button>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClick} aria-label="Remove" title="Remove">
      <X size={14} />
    </button>
  );
}

// ─── Operators impacted ───────────────────────────────────────────────────────

export function OperatorPicker({ inc }: { inc: IncidentState }) {
  const { patch } = useIncidentStore();
  const [custom, setCustom] = useState("");

  const toggle = (g: string) =>
    patch({
      serviceGroups: inc.serviceGroups.includes(g)
        ? inc.serviceGroups.filter((x) => x !== g)
        : [...inc.serviceGroups, g],
    });

  const addCustom = () => {
    const g = custom.trim();
    if (g && !inc.serviceGroups.includes(g)) {
      patch({ serviceGroups: [...inc.serviceGroups, g] });
    }
    setCustom("");
  };

  const extras = inc.serviceGroups.filter((g) => !(OPERATORS as readonly string[]).includes(g));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {OPERATORS.map((g) => (
          <Chip key={g} selected={inc.serviceGroups.includes(g)} onClick={() => toggle(g)}>
            {g}
          </Chip>
        ))}
        {extras.map((g) => (
          <Chip key={g} selected onClick={() => toggle(g)} title="Click to remove">
            {g} <X size={12} />
          </Chip>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
          placeholder="Add other operator…"
          className="input min-w-0 flex-1"
        />
        <button type="button" onClick={addCustom} className="btn">
          <Plus size={14} /> Add
        </button>
      </div>
    </div>
  );
}

// ─── Stranded trains ──────────────────────────────────────────────────────────

export function StrandedEditor({ inc }: { inc: IncidentState }) {
  const { patch } = useIncidentStore();

  const update = (id: string, partial: Partial<IncidentState["stranded"][number]>) =>
    patch({ stranded: inc.stranded.map((t) => (t.id === id ? { ...t, ...partial } : t)) });

  // Ticking strikes the train through in the message with a "risk resolved"
  // note — the entry stays visible rather than disappearing.
  const struck = "line-through text-faint";

  return (
    <div className="flex flex-col gap-2">
      {inc.stranded.map((t) => (
        <div key={t.id} className="flex flex-wrap items-center gap-1.5">
          <input
            className={clsx("input w-20 flex-none font-mono", t.cleared && struck)}
            value={t.headcode}
            onChange={(e) => update(t.id, { headcode: e.target.value.toUpperCase() })}
            placeholder="2O22"
            maxLength={4}
          />
          <input
            className={clsx("input min-w-0 flex-1 sm:w-40 sm:flex-none", t.cleared && struck)}
            value={t.location}
            onChange={(e) => update(t.id, { location: e.target.value })}
            placeholder="Stood Bottesford Station"
          />
          <input
            className={clsx("input min-w-[140px] flex-1", t.cleared && struck)}
            value={t.plan}
            onChange={(e) => update(t.id, { plan: e.target.value })}
            placeholder="plan / status"
          />
          <Chip
            selected={t.cleared}
            onClick={() => update(t.id, { cleared: !t.cleared })}
            title="Mark risk resolved — strikes the train through in the message"
          >
            <Check size={13} />
          </Chip>
          <RemoveButton onClick={() => patch({ stranded: inc.stranded.filter((x) => x.id !== t.id) })} />
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          patch({
            stranded: [
              ...inc.stranded,
              { id: uid(), headcode: "", location: "", plan: "", cleared: false },
            ],
          })
        }
        className="btn btn-sm self-start"
      >
        <Plus size={13} /> Add train
      </button>
    </div>
  );
}

// ─── Response resources ───────────────────────────────────────────────────────

export function ResponseEditor({ inc }: { inc: IncidentState }) {
  const { patch } = useIncidentStore();

  const update = (id: string, partial: Partial<IncidentState["response"][number]>) =>
    patch({ response: inc.response.map((r) => (r.id === id ? { ...r, ...partial } : r)) });

  const add = (kind: string) =>
    patch({
      response: [
        ...inc.response,
        { id: uid(), kind, label: kind === "Other" ? "" : kind, eta: "", onSite: false },
      ],
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {RESPONSE_KINDS.map((k) => (
          <Chip key={k} selected={false} onClick={() => add(k)} title={`Add ${k}`}>
            <Plus size={12} /> {k}
          </Chip>
        ))}
      </div>
      {inc.response.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-1.5">
          <input
            className="input min-w-[160px] flex-1"
            value={r.label}
            onChange={(e) => update(r.id, { label: e.target.value })}
            placeholder={r.kind === "Other" ? "e.g. Richmond recovery" : `e.g. Nottingham ${r.kind}`}
          />
          <input
            className="input w-24 flex-none font-mono"
            value={r.eta}
            onChange={(e) => update(r.id, { eta: e.target.value })}
            placeholder="ETA"
            disabled={r.onSite}
          />
          <Chip
            selected={r.onSite}
            onClick={() => update(r.id, { onSite: !r.onSite })}
            title="Toggle on site"
          >
            On site
          </Chip>
          <RemoveButton onClick={() => patch({ response: inc.response.filter((x) => x.id !== r.id) })} />
        </div>
      ))}
    </div>
  );
}

// ─── Command structure ────────────────────────────────────────────────────────

export function CommandEditor({ inc }: { inc: IncidentState }) {
  const { patch } = useIncidentStore();

  const update = (id: string, partial: Partial<IncidentState["command"][number]>) =>
    patch({ command: inc.command.map((c) => (c.id === id ? { ...c, ...partial } : c)) });

  const add = (role: string) =>
    patch({ command: [...inc.command, { id: uid(), role, holder: "", mandatory: false }] });

  const usedPresets = inc.command.map((c) => c.role);

  return (
    <div className="flex flex-col gap-2">
      {inc.command.map((c) => (
        <div key={c.id} className="flex flex-wrap items-center gap-1.5">
          <input
            className={clsx("input w-full sm:w-56 sm:flex-none", c.mandatory && "text-dim")}
            value={c.role}
            onChange={(e) => update(c.id, { role: e.target.value })}
            readOnly={c.mandatory}
          />
          <input
            className="input min-w-[140px] flex-1"
            value={c.holder}
            onChange={(e) => update(c.id, { holder: e.target.value })}
            placeholder={c.mandatory ? "required" : "name / team"}
          />
          {!c.mandatory && (
            <RemoveButton onClick={() => patch({ command: inc.command.filter((x) => x.id !== c.id) })} />
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {COMMAND_ROLE_PRESETS.filter((r) => !usedPresets.includes(r)).map((r) => (
          <Chip key={r} selected={false} onClick={() => add(r)}>
            <Plus size={12} /> {r}
          </Chip>
        ))}
        <Chip selected={false} onClick={() => add("")}>
          <Plus size={12} /> Other role
        </Chip>
      </div>
    </div>
  );
}
