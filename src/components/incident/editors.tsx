"use client";
import { useState } from "react";
import { useIncidentStore } from "@/lib/incident/store";
import {
  OPERATORS,
  RESPONSE_KINDS,
  COMMAND_ROLE_PRESETS,
  uid,
} from "@/lib/incident/constants";
import type { IncidentState } from "@/lib/incident/types";
import clsx from "clsx";

// ─── Shared style tokens (matched to SafetyTab) ───────────────────────────────

export const lbl = "block font-mono uppercase tracking-widest text-muted mb-1.5";
/** Base input styling without a width — for fixed-width row inputs. */
export const inpBase =
  "rounded bg-panel2 border border-grid px-3 py-2 text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors placeholder:text-muted/60";
export const inp = `w-full ${inpBase}`;
export const sel =
  "w-full rounded bg-panel2 border border-grid px-3 py-2 text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors cursor-pointer";

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="font-mono uppercase tracking-widest text-muted/60 text-xs border-b border-grid/40 pb-1">
        {title}
      </div>
      {children}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={lbl}>{label}</label>
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
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={clsx(
        "px-3 py-1.5 rounded text-sm border transition-colors text-left",
        selected
          ? "bg-accent/15 border-accent text-accent"
          : "bg-panel2 border-grid text-muted hover:border-accent/50 hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}

const removeBtn =
  "px-2 rounded text-muted/60 hover:text-warn border border-transparent hover:border-warn/30 transition-colors";

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
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {OPERATORS.map((g) => (
          <Chip key={g} selected={inc.serviceGroups.includes(g)} onClick={() => toggle(g)}>
            {g}
          </Chip>
        ))}
        {extras.map((g) => (
          <Chip key={g} selected onClick={() => toggle(g)} title="Click to remove">
            {g} ✕
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
          className={inp}
        />
        <button
          type="button"
          onClick={addCustom}
          className="px-3 rounded border border-grid text-muted hover:text-ink hover:border-accent/50 transition-colors"
        >
          Add
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
  const struck = "line-through text-muted/60";

  return (
    <div className="flex flex-col gap-2">
      {inc.stranded.map((t) => (
        <div key={t.id} className="flex gap-1.5 items-center">
          <input
            className={clsx(inpBase, "w-20 flex-none font-mono", t.cleared && struck)}
            value={t.headcode}
            onChange={(e) => update(t.id, { headcode: e.target.value.toUpperCase() })}
            placeholder="2O22"
            maxLength={4}
          />
          <input
            className={clsx(inpBase, "w-40 flex-none", t.cleared && struck)}
            value={t.location}
            onChange={(e) => update(t.id, { location: e.target.value })}
            placeholder="Stood Bottesford Station"
          />
          <input
            className={clsx(inp, t.cleared && struck)}
            value={t.plan}
            onChange={(e) => update(t.id, { plan: e.target.value })}
            placeholder="plan / status"
          />
          <Chip
            selected={t.cleared}
            onClick={() => update(t.id, { cleared: !t.cleared })}
            title="Mark risk resolved — strikes the train through in the message"
          >
            ✓
          </Chip>
          <button
            type="button"
            className={removeBtn}
            onClick={() => patch({ stranded: inc.stranded.filter((x) => x.id !== t.id) })}
          >
            ✕
          </button>
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
        className="self-start px-3 py-1.5 rounded text-sm border border-grid text-muted hover:text-ink hover:border-accent/50 transition-colors"
      >
        + Add train
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
            + {k}
          </Chip>
        ))}
      </div>
      {inc.response.map((r) => (
        <div key={r.id} className="flex gap-1.5 items-center">
          <input
            className={inp}
            value={r.label}
            onChange={(e) => update(r.id, { label: e.target.value })}
            placeholder={r.kind === "Other" ? "e.g. Richmond recovery" : `e.g. Nottingham ${r.kind}`}
          />
          <input
            className={clsx(inpBase, "w-24 flex-none font-mono")}
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
          <button
            type="button"
            className={removeBtn}
            onClick={() => patch({ response: inc.response.filter((x) => x.id !== r.id) })}
          >
            ✕
          </button>
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
        <div key={c.id} className="flex gap-1.5 items-center">
          <input
            className={clsx(inpBase, "w-56 flex-none")}
            value={c.role}
            onChange={(e) => update(c.id, { role: e.target.value })}
            readOnly={c.mandatory}
          />
          <input
            className={inp}
            value={c.holder}
            onChange={(e) => update(c.id, { holder: e.target.value })}
            placeholder={c.mandatory ? "required" : "name / team"}
          />
          {!c.mandatory && (
            <button
              type="button"
              className={removeBtn}
              onClick={() => patch({ command: inc.command.filter((x) => x.id !== c.id) })}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-1.5">
        {COMMAND_ROLE_PRESETS.filter((r) => !usedPresets.includes(r)).map((r) => (
          <Chip key={r} selected={false} onClick={() => add(r)}>
            + {r}
          </Chip>
        ))}
        <Chip selected={false} onClick={() => add("")}>
          + Other role
        </Chip>
      </div>
    </div>
  );
}
