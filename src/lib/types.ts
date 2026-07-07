// ─── Domain types ────────────────────────────────────────────────────────────

export interface TargetMetric {
  name: string;
  value: number | string;
  target: number | string;
  amber: number | string;
  dir: "higher" | "lower";
  notes: string;
}

export interface MetaState {
  route: string;
  stamp: string; // datetime-local string
}

export interface SoSState {
  intro: string;
  status: string;
  safety: string;
  perf: TargetMetric[];
  toc: {
    sos_toc_gtr: string;
    sos_toc_emr: string;
    sos_toc_xc: string;
  };
  nr: {
    sos_tl: string;
    sos_south: string;
    sos_north: string;
    sos_lincs: string;
  };
  oncall: {
    exec_until: string;
    exec_from: string;
    ops_until: string;
    ops_from: string;
    maint_until: string;
    maint_from: string;
  };
  incidents: string;
  esr: {
    imp: string;
    amd: string;
    wdn: string;
    pr: string;
    total: string;
  };
  weather: string;
  maxtemps: string;
  forecast: string;
  eng: string;
  seasonal_opt: string;
}

export interface StrategicAMState {
  status: string;
  perf: TargetMetric[];
  exec: string;
  trends: string;
  interv: string;
  opps: string;
  forward: string;
}

export interface StrategicPMState {
  status: string;
  perf: TargetMetric[];
  exec: string;
  trends: string;
  interv: string;
  risk_infra: string;
  risk_fleet: string;
  risk_crew: string;
  risk_weather: string;
  outlook: string;
}

export interface TacticalState {
  intro: string;
  sndm: string;
  rcm: string;
  status: string;
  safety: string;
  perf: TargetMetric[];
  incidents: string;
  late: {
    gtr20: string;
    gtr10: string;
    gtrInt: string;
    emr20: string;
    emr10: string;
    emrInt: string;
  };
  seasonal: string;
}

export type { SafetyIncidentState } from "./safety/types";

// ─── Session state (localStorage) ────────────────────────────────────────────

export interface SessionState {
  meta: MetaState;
  sos: SoSState;
  str_am: StrategicAMState;
  str_pm: StrategicPMState;
  tac: TacticalState;
  safety_msg: import("./safety/types").SafetyIncidentState;
}

export interface BackupEntry {
  ts: number;
  reason: string;
  data: SessionState;
}

// ─── Supabase types ───────────────────────────────────────────────────────────

export interface TargetPeriod {
  id: string;
  period_name: string;
  is_active: boolean;
  created_at: string;
}

export interface SupabaseTarget {
  id: string;
  period_id: string;
  name: string;
  target: number | null;
  amber: number | null;
  dir: "higher" | "lower";
  sort_order: number;
}

export interface SeasonalTemplate {
  id: string;
  season: string;
  tab: "sos" | "tactical";
  content: string;
  is_active: boolean;
  created_at: string;
}

// ─── Message snapshots ────────────────────────────────────────────────────────

export type SnapshotSlot = "0530" | "0900" | "1500" | "2200";

/** Where a Build press lands: the slot, its calendar date, and the date its metrics describe. */
export interface SnapshotSlotPin {
  snapshotDate: string;   // YYYY-MM-DD, Europe/London
  slot: SnapshotSlot;
  metricsForDate: string; // YYYY-MM-DD; previous day for 0530, snapshotDate otherwise
}

/** One parsed metric data point stored in ma_message_snapshots.metrics. */
export interface SnapshotMetric {
  name: string;                              // matches ma_targets.name exactly
  value: number | null;                      // null when not entered / not numeric
  target: number | null;
  amber: number | null;
  dir: "higher" | "lower";
  rag: "green" | "amber" | "red" | "none";
  notes: string | null;
}

/** Row shape of ma_message_snapshots, as read back by Insight. */
export interface MessageSnapshot {
  id: string;
  snapshot_date: string;
  slot: SnapshotSlot;
  tab: string;
  message: string;
  payload: { meta: MetaState; state: unknown };
  metrics: SnapshotMetric[];
  metrics_for_date: string;
  build_count: number;
  first_built_at: string;
  last_built_at: string;
}

// ─── UI types ─────────────────────────────────────────────────────────────────

export type TabKey =
  | "sos"
  | "strategic_am"
  | "strategic_pm"
  | "tactical"
  | "safety_msg"
  | "targets";
