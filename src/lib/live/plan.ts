// What to do with one section when the database's copy is read. Pure.

import { mergeById, mergeRecord, sameValue } from "./merge.ts";

export const SESSION_SECTIONS = ["meta", "sos", "str_am", "str_pm", "tac", "safety_msg"] as const;
export const SECTIONS = [...SESSION_SECTIONS, "incidents"] as const;
export type SessionSection = (typeof SESSION_SECTIONS)[number];
export type Section = (typeof SECTIONS)[number];

/** The last version this copy and the database agreed on. rev 0: never written. */
export interface Known { rev: number; base: unknown }
export interface Row { rev: number; state: unknown }

export interface Plan {
  known: Known;
  /** New value for this copy, when it changes. */
  apply?: unknown;
  /** Write this copy's (merged) value back. */
  push: boolean;
  /** Fields both sides changed; the other side's version is lost unless kept as a backup. */
  conflicts: string[];
}

export function planSync(section: Section, known: Known | undefined, local: unknown, row: Row | null): Plan {
  // Not in the database yet: this copy seeds it.
  if (!row) return { known: { rev: 0, base: known?.base }, push: true, conflicts: [] };
  // A read sent before our last write can arrive after it: older than what we agreed, ignore it.
  if (known && row.rev < known.rev) return { known, push: false, conflicts: [] };
  // Nothing written elsewhere since we agreed: send ours if it changed.
  if (known && known.rev === row.rev) return { known, push: !sameValue(local, known.base), conflicts: [] };
  // First read on this browser: the shared copy wins.
  if (!known || known.rev === 0 && known.base === undefined) {
    return { known: { rev: row.rev, base: row.state }, apply: sameValue(local, row.state) ? undefined : row.state, push: false, conflicts: [] };
  }
  const m = section === "incidents"
    ? mergeById(known.base as { id: string }[], local as { id: string }[], row.state as { id: string }[])
    : mergeRecord(known.base, local, row.state);
  return {
    known: { rev: row.rev, base: row.state },
    apply: sameValue(m.value, local) ? undefined : m.value,
    push: !sameValue(m.value, row.state),
    conflicts: m.conflicts,
  };
}
