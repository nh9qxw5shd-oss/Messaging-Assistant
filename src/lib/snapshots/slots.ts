import type { SnapshotMetric, TargetMetric } from "../types";
import { rag } from "../ragLogic";

// Slot pinning (which slot a build or sent mark belongs to) lives in
// ./messageSlot.ts: each message is logged against its own slot.

// ─── Metric parsing ───────────────────────────────────────────────────────────

function toNumber(v: number | string): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

const RAG_WORDS: Record<string, SnapshotMetric["rag"]> = {
  "🟢": "green",
  "🟠": "amber",
  "🔴": "red",
};

/**
 * Parse a perf array into snapshot data points. Names are kept verbatim so
 * they match ma_targets.name exactly. The SoS perf array carries the extra
 * "Current Period Variance" row, so 0530 snapshots capture the period
 * variance value as a parsed data point alongside the target metrics.
 */
export function parseSnapshotMetrics(perf: TargetMetric[]): SnapshotMetric[] {
  return perf
    .filter((m) => (m.name ?? "").trim() !== "")
    .map((m) => ({
      name: m.name,
      value: toNumber(m.value),
      target: toNumber(m.target),
      amber: toNumber(m.amber),
      dir: m.dir,
      rag: RAG_WORDS[rag(m)] ?? "none",
      notes: m.notes && m.notes.trim() !== "" ? m.notes : null,
    }));
}
