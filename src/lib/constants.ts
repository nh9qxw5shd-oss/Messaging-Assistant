import type {
  SafetyTypeId,
  SafetyState,
  SoSState,
  StrategicAMState,
  StrategicPMState,
  TacticalState,
  TargetMetric,
  TabKey,
} from "./types";

// ─── Operational status options ───────────────────────────────────────────────

export const LONG_OPS = [
  "🟢 Normal Operations: Services running to timetable with no significant infrastructure or fleet issues.",
  "🟡 Minor Disruption: Isolated delays or shortforms; minimal impact on passenger experience or freight flow.",
  "🟠 Moderate Disruption: Multiple delays, shortforms, or infrastructure faults; some impact on service reliability.",
  "🔴 Significant Disruption: Widespread delays or cancellations; significant infrastructure failure or fleet unavailability.",
  "⚫ Severe Disruption: Network-wide impact; sustained service breakdown, emergency response required.",
] as const;

export const SHORT_OPS = [
  "🟢 Normal Operations",
  "🟡 Minor Disruption",
  "🟠 Moderate Disruption",
  "🔴 Significant Disruption",
  "⚫ Severe Disruption",
] as const;

// ─── Safety message reference data ────────────────────────────────────────────

export const SAFETY_TYPES: { id: SafetyTypeId; label: string }[] = [
  { id: "near_miss",    label: "Near miss" },
  { id: "wrong_route",  label: "Wrong route" },
  { id: "lb_poss",      label: "Line blockage / Possession irregularity" },
  { id: "staff_acc",    label: "Staff accident / injury" },
  { id: "sig_irreg",    label: "Signalling irregularity (COA / SPAR / WSF)" },
  { id: "station_ops",  label: "Station / dispatch / overshoot incident" },
  { id: "other",        label: "Other" },
];

export const SAFETY_SUBTYPES: Record<SafetyTypeId, string[]> = {
  near_miss:   ["Level crossing", "Station end / trespass", "Track worker / worksite", "Other"],
  wrong_route: ["Offered not taken", "Offered and taken", "Route set back / COA risk", "Other"],
  lb_poss:     ["Line blockage irregularity", "SBSI / limits issue", "Possession irregularity", "Worksite protection issue", "Other"],
  staff_acc:   ["Slip / trip / fall", "Strain / sprain", "Cut / burn / foreign body", "RTC / travel", "Assault", "Other"],
  sig_irreg:   ["COA (G-R)", "SPAR", "WSF / signal washed out", "Points irregularity", "Other"],
  station_ops: ["Door irregularity", "Dispatch against signal", "Station overshoot / set back", "Failed to call", "Other"],
  other:       ["Other"],
};

export const SAFETY_STATUS = [
  "Initial advice",
  "Update",
  "Correction",
  "Closed / no further action",
  "Investigation ongoing",
] as const;

// ─── Emoji tray ───────────────────────────────────────────────────────────────

export const EMOJI_TRAY = [
  "✅", "⚠️", "🔴", "🟠", "🟡", "🟢",
  "⚫️", "⚪️", "ℹ️", "➡️", "⛔", "🚂",
  "☎️", "🌞", "🌧️", "⬆️", "⬇️", "🔌",
];

// ─── Default targets (fallback when no Supabase data) ─────────────────────────

export const DEFAULT_TARGETS: TargetMetric[] = [
  { name: "Route T3 %", value: "", target: 78.4, amber: 77.0, dir: "higher", notes: "Route T3 headline" },
  { name: "EMR T3 %",   value: "", target: 69.9, amber: 72.0, dir: "higher", notes: "EMR T3" },
  { name: "EMR Can %",  value: "", target: 4.1,  amber: 3.0,  dir: "lower",  notes: "EMR cancellations" },
  { name: "GTR T3 %",   value: "", target: 84.8, amber: 82.0, dir: "higher", notes: "GTR T3" },
  { name: "XC T3 %",    value: "", target: 67.8, amber: 69.0, dir: "higher", notes: "XC T3" },
];

// ─── SoS-only metric ─────────────────────────────────────────────────────────

export const SOS_ONLY_METRIC = "current period variance";

// ─── Tab labels ───────────────────────────────────────────────────────────────

export const TAB_LABELS: Record<TabKey, string> = {
  sos:          "Start of Service 05:30",
  strategic_am: "Strategic AM 11:00",
  strategic_pm: "Strategic PM 20:00",
  tactical:     "Tactical 09 / 15 / 22",
  safety_msg:   "Safety Message",
  targets:      "Targets & Thresholds",
};

export const TABS: TabKey[] = [
  "sos",
  "strategic_am",
  "strategic_pm",
  "tactical",
  "safety_msg",
  "targets",
];

// ─── Banner file paths (relative to public/) ─────────────────────────────────

export const BANNER_FILES: Partial<Record<TabKey, string>> = {
  sos:          "/banners/sos.png",
  strategic_am: "/banners/strategic.png",
  strategic_pm: "/banners/strategic.png",
  tactical:     "/banners/tactical.png",
};

// ─── Default state factories ──────────────────────────────────────────────────

export const DEFAULT_SOS: SoSState = {
  intro: "Good morning from the East Midlands Control Centre in Derby.",
  status: LONG_OPS[0],
  safety: "Nil",
  perf: [],
  toc: { sos_toc_gtr: SHORT_OPS[0], sos_toc_emr: SHORT_OPS[0], sos_toc_xc: SHORT_OPS[0] },
  nr:  { sos_tl: SHORT_OPS[0], sos_south: SHORT_OPS[0], sos_north: SHORT_OPS[0], sos_lincs: SHORT_OPS[0] },
  oncall: { exec_until: "", exec_from: "", ops_until: "", ops_from: "", maint_until: "", maint_from: "" },
  incidents: "⚠️",
  esr: { imp: "Nil", amd: "Nil", wdn: "Nil", pr: "Nil", total: "" },
  weather: "",
  maxtemps: "",
  forecast: "",
  eng: "",
  seasonal_opt: "",
};

export const DEFAULT_STR_AM: StrategicAMState = {
  status: LONG_OPS[0],
  perf: [],
  exec: "",
  trends: "",
  interv: "",
  opps: "",
  forward: "",
};

export const DEFAULT_STR_PM: StrategicPMState = {
  status: LONG_OPS[0],
  perf: [],
  exec: "",
  trends: "",
  interv: "",
  risk_infra: "",
  risk_fleet: "",
  risk_crew: "",
  risk_weather: "",
  outlook: "",
};

export const DEFAULT_TAC: TacticalState = {
  intro: "Good afternoon from the East Midlands Control Centre in Derby.",
  sndm: "",
  rcm: "",
  status: LONG_OPS[0],
  safety: "Nil",
  perf: [],
  incidents: "",
  late: { gtr20: "0", gtr10: "0", gtrInt: "", emr20: "0", emr10: "0", emrInt: "" },
  seasonal: "",
};

export const DEFAULT_SAFETY: SafetyState = {
  type: "near_miss",
  subtype: "Level crossing",
  location: "",
  time: "",
  asset: "",
  people: "",
  what: "",
  actions: { ebr: false, mom: false, btp: false, screen: false, care: false, ffcctv: false },
  status: "Initial advice",
  owner: "",
  notes: "",
};

// ─── Storage keys ─────────────────────────────────────────────────────────────

export const LS_SESSION_KEY = "ma-session-v5";
export const LS_BACKUP_KEY  = "ma-backups-v5";
export const BACKUP_KEEP    = 36;
export const BACKUP_TTL_DAYS = 7;
export const BACKUP_INTERVAL_MS = 5 * 60 * 1000;
