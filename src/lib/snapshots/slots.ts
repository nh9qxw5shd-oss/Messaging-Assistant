import type { SnapshotSlot, SnapshotSlotPin, SnapshotMetric, TargetMetric } from "../types";
import { rag } from "../ragLogic";

// ─── Slot definitions ─────────────────────────────────────────────────────────

export const SNAPSHOT_TIMEZONE = "Europe/London";

export const SNAPSHOT_SLOTS: SnapshotSlot[] = ["0530", "0900", "1500", "2200"];

// Slot times as minutes-since-midnight, Europe/London local time.
const SLOT_MINUTES: Record<SnapshotSlot, number> = {
  "0530": 5 * 60 + 30,
  "0900": 9 * 60,
  "1500": 15 * 60,
  "2200": 22 * 60,
};

// ─── London wall clock ────────────────────────────────────────────────────────

interface LondonClock {
  dateISO: string; // YYYY-MM-DD in Europe/London
  minutes: number; // minutes since local midnight
}

// hourCycle "h23" so midnight is 00, never 24 (DST is handled by Intl).
const LONDON_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: SNAPSHOT_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function londonClock(now: Date): LondonClock {
  const parts = LONDON_FMT.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return {
    dateISO: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

export function addDays(dateISO: string, delta: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

// ─── Slot pinning ─────────────────────────────────────────────────────────────

/**
 * Pin a Build press to the next approaching slot (Europe/London).
 * - A build during a slot's exact minute (e.g. 09:00:xx) still belongs to that
 *   slot; from the next minute it pins to the following slot.
 * - After 22:00 the build rolls to tomorrow's 0530.
 * - 0530 metrics describe the previous day (yesterday's end-of-day standing),
 *   so metricsForDate = snapshotDate − 1 day for that slot only.
 */
export function resolveSnapshotSlot(now: Date = new Date()): SnapshotSlotPin {
  const clock = londonClock(now);

  let snapshotDate = clock.dateISO;
  let slot = SNAPSHOT_SLOTS.find((s) => clock.minutes <= SLOT_MINUTES[s]);
  if (!slot) {
    slot = "0530";
    snapshotDate = addDays(snapshotDate, 1);
  }

  return {
    snapshotDate,
    slot,
    metricsForDate: slot === "0530" ? addDays(snapshotDate, -1) : snapshotDate,
  };
}

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
