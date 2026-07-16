import type {
  SoSState,
  StrategicAMState,
  StrategicPMState,
  TacticalState,
  TargetMetric,
  TabKey,
} from "./types";
export { DEFAULT_SAFETY_INCIDENT } from "./safety/constants";

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


// ─── Emoji tray ───────────────────────────────────────────────────────────────

export const EMOJI_TRAY = [
  "✅", "⚠️", "🔴", "🟠", "🟡", "🟢",
  "⚫️", "⚪️", "ℹ️", "➡️", "⛔", "🚂",
  "☎️", "🌞", "🌧️", "⬆️", "⬇️", "🔌",
];

// ─── Default targets (fallback when no Supabase data) ─────────────────────────

// Amber values are auto-generated from the target (see autoAmber in ragLogic.ts):
// higher-is-better → target − 5, lower-is-better → target + 0.5
export const DEFAULT_TARGETS: TargetMetric[] = [
  { name: "Route T3 %", value: "", target: 78.4, amber: 73.4, dir: "higher", notes: "Route T3 headline" },
  { name: "EMR T3 %",   value: "", target: 69.9, amber: 64.9, dir: "higher", notes: "EMR T3" },
  { name: "EMR Can %",  value: "", target: 4.1,  amber: 4.6,  dir: "lower",  notes: "EMR cancellations" },
  { name: "GTR T3 %",   value: "", target: 84.8, amber: 79.8, dir: "higher", notes: "GTR T3" },
  { name: "XC T3 %",    value: "", target: 67.8, amber: 62.8, dir: "higher", notes: "XC T3" },
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

export { DEFAULT_SAFETY_INCIDENT as DEFAULT_SAFETY } from "./safety/constants";

// ─── Storage keys ─────────────────────────────────────────────────────────────

export const LS_SESSION_KEY = "ma-session-v6";
export const LS_BACKUP_KEY  = "ma-backups-v6";
export const LS_LIVEPERF_KEY = "ma-liveperf-v1";
export const BACKUP_KEEP    = 36;
export const BACKUP_TTL_DAYS = 7;
export const BACKUP_INTERVAL_MS = 5 * 60 * 1000;
