// ─── 05:30 Start of Service — ESR block from DLog2's NRSDB snapshots ─────────
//
// When DLog2 builds the overnight log it pulls the route's imposed ESRs from
// NRSDB into the shared Supabase project:
//   esr_snapshots      — one row per imposed ESR per Europe/London capture date
//   esr_snapshot_runs  — one row per date × route: counts plus the diff against
//                        the previous snapshot date ({new, amended, removed},
//                        each entry a full ESR row in DLog2's camelCase shape)
// The log is built before 05:30, so today's run already holds the overnight
// imposed / amended / withdrawn picture. This module reads it and renders the
// five SoS ESR fields; the text stays editable before the message is built.
//
// Classification is DLog2's own (lib/esr/diff.ts): an ESR is keyed on its base
// reference ("EM 061.26") so a revision letter bump or a change of speed,
// line speed, location, reason or ETR is an amendment, not a removal + add.

import { supabase } from "../supabase";
import type { SoSState } from "../types";

export const ESR_ROUTE_CODE = "EM";

/** The subset of DLog2's EsrRow this module uses (diff JSON is camelCase). */
export interface EsrRowLite {
  baseRef: string;
  refnum: string;
  speedValue: string | null;
  speedUnit: string | null;
  elrCode: string | null;
  location: string | null;
  reason: string | null;
  etr: string | null;
  etrRaw: string | null;
}

export interface EsrFieldChange {
  field: string;
  label: string;
  old: string | null;
  new: string | null;
}

export interface EsrRunSummary {
  snapshotDate: string;
  capturedAt: string;
  baselineDate: string | null;
  esrCount: number;
  imposed: EsrRowLite[];
  amended: Array<{ row: EsrRowLite; changes: EsrFieldChange[] }>;
  withdrawn: EsrRowLite[];
  /** Every ESR in force on the snapshot date (for planned removals). */
  active: EsrRowLite[];
}

export function londonToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function liteFromJson(v: unknown): EsrRowLite | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const refnum = str(o.refnum);
  if (!refnum) return null;
  return {
    baseRef: str(o.baseRef) ?? refnum,
    refnum,
    speedValue: str(o.speedValue),
    speedUnit: str(o.speedUnit),
    elrCode: str(o.elrCode),
    location: str(o.location),
    reason: str(o.reason),
    etr: str(o.etr),
    etrRaw: str(o.etrRaw),
  };
}

/** Latest DLog2 ESR run for the route, or null when none is stored. */
export async function fetchLatestEsrRun(routeCode = ESR_ROUTE_CODE): Promise<EsrRunSummary | null> {
  if (!supabase) throw new Error("Supabase not configured — check .env.local");
  const { data: run, error } = await supabase
    .from("esr_snapshot_runs")
    .select("snapshot_date, captured_at, baseline_date, esr_count, diff")
    .eq("route_code", routeCode)
    .order("snapshot_date", { ascending: false })
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!run) return null;

  const { data: rows, error: rowErr } = await supabase
    .from("esr_snapshots")
    .select("base_ref, refnum, speed_value, speed_unit, elr_code, location, reason, etr, etr_raw")
    .eq("route_code", routeCode)
    .eq("snapshot_date", run.snapshot_date)
    .order("refnum");
  if (rowErr) throw rowErr;

  const diff = (run.diff && typeof run.diff === "object" ? run.diff : {}) as Record<string, unknown>;
  const list = (k: string): unknown[] => (Array.isArray(diff[k]) ? (diff[k] as unknown[]) : []);

  return {
    snapshotDate: run.snapshot_date,
    capturedAt: run.captured_at,
    baselineDate: run.baseline_date ?? null,
    esrCount: run.esr_count ?? (rows ?? []).length,
    imposed: list("new").map(liteFromJson).filter((r): r is EsrRowLite => !!r),
    amended: list("amended")
      .map((a) => {
        const o = (a ?? {}) as Record<string, unknown>;
        const row = liteFromJson(o.row);
        const changes = Array.isArray(o.changes) ? (o.changes as EsrFieldChange[]) : [];
        return row ? { row, changes } : null;
      })
      .filter((a): a is { row: EsrRowLite; changes: EsrFieldChange[] } => !!a),
    withdrawn: list("removed").map(liteFromJson).filter((r): r is EsrRowLite => !!r),
    active: (rows ?? []).map((r) => ({
      baseRef: r.base_ref,
      refnum: r.refnum,
      speedValue: r.speed_value,
      speedUnit: r.speed_unit,
      elrCode: r.elr_code,
      location: r.location,
      reason: r.reason,
      etr: r.etr,
      etrRaw: r.etr_raw,
    })),
  };
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function speedText(r: EsrRowLite): string | null {
  if (!r.speedValue) return null;
  const unit = r.speedUnit ?? "mph";
  return /^[\d/]+$/.test(r.speedValue) ? `${r.speedValue}${unit}` : r.speedValue;
}

function place(r: EsrRowLite): string | null {
  return [r.elrCode, r.location].filter(Boolean).join(" ") || null;
}

/** "EM 061C.26 – MML1 Bedford – 20mph" */
export function esrLine(r: EsrRowLite): string {
  return [r.refnum, place(r), speedText(r)].filter(Boolean).join(" – ");
}

function londonDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(d),
    time: d.toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" }),
  };
}

function changeText(c: EsrFieldChange): string {
  if (c.field === "revision") return `revised from ${c.old ?? "—"}`;
  return `${c.label} ${c.old ?? "—"} → ${c.new ?? "—"}`;
}

/** "N" followed by one line per ESR, or "Nil" when there are none. */
function block(lines: string[]): string {
  return lines.length ? [String(lines.length), ...lines].join("\n") : "Nil";
}

export interface SosEsrText {
  /** Planned Removal is omitted when NRSDB supplied no ETRs — leave it manual. */
  esr: Omit<SoSState["esr"], "pr"> & { pr?: string };
  notes: string[];
}

/**
 * Build the SoS ESR fields from a DLog2 run. Planned Removal lists ESRs in
 * force whose ETR falls on `today` (Europe/London); NRSDB rarely supplies an
 * ETR, so when none of the ESRs in force has one the field is left untouched.
 */
export function buildSosEsr(run: EsrRunSummary, today: string = londonToday()): SosEsrText {
  const notes: string[] = [];
  if (run.snapshotDate !== today) {
    notes.push(`Latest DLog2 ESR snapshot is from ${run.snapshotDate}, not today — has today's log been built?`);
  }
  if (!run.baselineDate) {
    notes.push("First ESR snapshot in DLog2 — no previous snapshot to compare, so imposed/amended/withdrawn are not available.");
  }

  const hasEtr = run.active.some((r) => r.etr);
  const planned = run.active
    .filter((r) => r.etr && londonDateTime(r.etr).date === today)
    .sort((a, b) => (a.etr ?? "").localeCompare(b.etr ?? ""))
    .map((r) => `${esrLine(r)} – ETR ${londonDateTime(r.etr!).time}`);

  return {
    esr: {
      imp: block(run.imposed.map(esrLine)),
      amd: block(run.amended.map(({ row, changes }) =>
        changes.length ? `${esrLine(row)} (${changes.map(changeText).join("; ")})` : esrLine(row))),
      wdn: block(run.withdrawn.map((r) => [r.refnum, place(r)].filter(Boolean).join(" – "))),
      ...(hasEtr ? { pr: block(planned) } : {}),
      total: `${run.esrCount} ESR${run.esrCount === 1 ? "" : "s"} in force`,
    },
    notes,
  };
}

export function describeRun(run: EsrRunSummary): string {
  const when = new Date(run.capturedAt).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `captured ${when}${run.baselineDate ? `, compared with ${run.baselineDate}` : ""}`;
}
