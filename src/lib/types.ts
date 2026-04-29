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

export type SafetyTypeId =
  | "near_miss"
  | "wrong_route"
  | "lb_poss"
  | "staff_acc"
  | "sig_irreg"
  | "station_ops"
  | "other";

export interface SafetyActions {
  ebr: boolean;
  mom: boolean;
  btp: boolean;
  screen: boolean;
  care: boolean;
  ffcctv: boolean;
}

export interface SafetyState {
  type: SafetyTypeId;
  subtype: string;
  location: string;
  time: string;
  asset: string;
  people: string;
  what: string;
  actions: SafetyActions;
  status: string;
  owner: string;
  notes: string;
}

// ─── Session state (localStorage) ────────────────────────────────────────────

export interface SessionState {
  meta: MetaState;
  sos: SoSState;
  str_am: StrategicAMState;
  str_pm: StrategicPMState;
  tac: TacticalState;
  safety_msg: SafetyState;
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

// ─── UI types ─────────────────────────────────────────────────────────────────

export type TabKey =
  | "sos"
  | "strategic_am"
  | "strategic_pm"
  | "tactical"
  | "safety_msg"
  | "targets";
