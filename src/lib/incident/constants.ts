import type {
  IncidentPhase,
  IncidentState,
  StatusEmoji,
  CommandRole,
} from "./types";

// ─── Storage ──────────────────────────────────────────────────────────────────

export const LS_INCIDENTS_KEY = "ma-incidents-v1";

// ─── Status emoji ladder ──────────────────────────────────────────────────────

export const STATUS_EMOJI: Record<StatusEmoji, string> = {
  red: "🔴",
  orange: "🟠",
  yellow: "🟡",
  green: "🟢",
};

export const STATUS_LABELS: Record<StatusEmoji, string> = {
  red: "Major / ongoing",
  orange: "Significant",
  yellow: "Minor / monitoring",
  green: "Resolved",
};

// ─── Phases ───────────────────────────────────────────────────────────────────

export const PHASE_LABELS: Record<IncidentPhase, string> = {
  holding: "Holding",
  initial: "Initial alert",
  update: "Update",
  nwr: "Normal working resumed",
  recovery: "Service recovery",
  closed: "Closed",
};

/** Order shown in the stepper. "closed" is reached via the Close button. */
export const PHASE_ORDER: IncidentPhase[] = [
  "holding",
  "initial",
  "update",
  "nwr",
  "recovery",
];

// ─── Picklists ────────────────────────────────────────────────────────────────

// Needs validating against current service-group definitions (SPEC open Q1) —
// free-text additions cover the gaps meanwhile.
export const SERVICE_GROUPS = [
  "East Midlands Inter City",
  "East Midlands Regional",
  "East Midlands Local",
  "Derby / Nottingham / Leicester",
  "Lincoln / Sleaford / Skegness",
  "Bedford South",
  "GTR – Thameslink North",
  "CrossCountry",
  "Northern Inter Urban",
  "Freight",
] as const;

export const RESPONSE_KINDS = [
  "MOM",
  "BTP",
  "S&T",
  "P-Way",
  "OLE",
  "ERU",
  "Off Track",
  "Telecoms",
  "Other",
] as const;

export const COMMAND_ROLE_PRESETS = [
  "Rail Incident Officer (RIO)",
  "MMIC",
  "TPIC",
  "OMIC",
  "Response Staff Team Leader",
  "S&T Fault Team",
  "P-Way Fault Team",
  "Ops support",
] as const;

export interface StrategicPriorityGroup {
  id: string;
  label: string;
  text: string;
}

export const STRATEGIC_PRIORITY_GROUPS: StrategicPriorityGroup[] = [
  {
    id: "responder",
    label: "Responder",
    text: "The health and safety of responders and support to the emergency services remains the immediate priority.",
  },
  {
    id: "site",
    label: "Site",
    text: "Manage the consequences at site, maintain clear communications and provide welfare for those involved.",
  },
  {
    id: "investigation",
    label: "Investigation & recovery",
    text: "Support a rigorous investigation and preserve evidence while planning the recovery of the site.",
  },
  {
    id: "train_service",
    label: "Train services",
    text: "Minimise disruption to train services and return to normality as soon as it is safe to do so.",
  },
];

// ─── Banners ──────────────────────────────────────────────────────────────────

export interface IncidentBanner {
  id: string;
  label: string;
  path: string; // relative to public/
}

export const INCIDENT_BANNERS: IncidentBanner[] = [
  { id: "incident_red",   label: "Incident Alert — Red",    path: "/banners/incident/incident-red.png" },
  { id: "incident_black", label: "Incident Alert — Black",  path: "/banners/incident/incident-black.png" },
  { id: "update_red",     label: "Incident Update — Red",   path: "/banners/incident/update-red.png" },
  { id: "update_black",   label: "Incident Update — Black", path: "/banners/incident/update-black.png" },
  { id: "nwr",            label: "Normal Working Resumed",  path: "/banners/incident/normal-working-resumed.png" },
  { id: "recovery",       label: "Service Recovery",        path: "/banners/incident/service-recovery.png" },
  { id: "major",          label: "Major Incident Alert",    path: "/banners/incident/major-incident-alert.png" },
  { id: "kent",           label: "Off-route — Kent",        path: "/banners/incident/off-route-kent.png" },
  { id: "sussex",         label: "Off-route — Sussex",      path: "/banners/incident/off-route-sussex.png" },
  { id: "york",           label: "Off-route — York",        path: "/banners/incident/off-route-york.png" },
  { id: "rugby",          label: "Off-route — Rugby",       path: "/banners/incident/off-route-rugby.png" },
];

export function bannerById(id: string): IncidentBanner | undefined {
  return INCIDENT_BANNERS.find((b) => b.id === id);
}

/** Automatic banner for the incident's current phase/severity/off-route. */
export function autoBannerId(inc: IncidentState): string | null {
  if (inc.register === "brief") return null;
  switch (inc.phase) {
    case "initial":
      if (inc.offRoute) return inc.offRoute === "major" ? "major" : inc.offRoute;
      return inc.severity === "black" ? "incident_black" : "incident_red";
    case "update":
      return inc.severity === "black" ? "update_black" : "update_red";
    case "nwr":
      return "nwr";
    case "recovery":
      return "recovery";
    default:
      return null; // holding / closed — unbannered
  }
}

/** Resolve the banner actually shown, honouring the manual override. */
export function resolveBanner(inc: IncidentState): IncidentBanner | null {
  if (inc.bannerOverride === "none") return null;
  if (inc.bannerOverride) return bannerById(inc.bannerOverride) ?? null;
  const id = autoBannerId(inc);
  return id ? bannerById(id) ?? null : null;
}

// ─── Factories ────────────────────────────────────────────────────────────────

let seq = 0;
export function uid(): string {
  seq += 1;
  return `${Date.now().toString(36)}-${seq.toString(36)}`;
}

export function defaultCommand(): CommandRole[] {
  return [
    { id: uid(), role: "Rail Incident Commander", holder: "SNDM Derby", mandatory: true },
    { id: uid(), role: "Tactical Incident Commander", holder: "RCM Derby", mandatory: true },
  ];
}

export function newIncident(): IncidentState {
  return {
    id: uid(),
    createdAt: Date.now(),
    phase: "holding",
    severity: "red",
    status: "red",
    register: "full",
    offRoute: "",
    bannerOverride: "",
    title: "",
    serviceGroups: [],
    headline: "",
    trainService: "",
    customerImpact: "",
    stranded: [],
    response: [],
    command: defaultCommand(),
    priorityPlan: "",
    milestonePlan: "",
    strategicPriorities: [],
    dsf: { trains: "", minutes: "", cancellations: "" },
    nwr: { time: "", detail: "", contingencyWithdrawn: false, recoveryToFollow: false },
    recovery: { immediatePlan: "", targets: "", postIncident: "", nextReview: "", note: "" },
    updateCount: 0,
    draftNarrative: "",
    sent: [],
  };
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

/** "1234" → "12:34"; anything else passes through trimmed. */
export function normaliseTime(raw: string): string {
  const t = raw.trim();
  if (/^\d{4}$/.test(t)) return `${t.slice(0, 2)}:${t.slice(2)}`;
  return t;
}

/** Current time HH:MM in Europe/London. */
export function nowLondon(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}
