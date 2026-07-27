// ─── Significant incident messaging — domain types ───────────────────────────
// See docs/incident-messaging/SPEC.md

export type IncidentPhase =
  | "holding"
  | "initial"
  | "update"
  | "nwr"
  | "recovery"
  | "closed";

export type IncidentSeverity = "red" | "black";

/** 🔴 🟠 🟡 🟢 — tracks current state, independent of banner severity. */
export type StatusEmoji = "red" | "orange" | "yellow" | "green";

export type MessageRegister = "full" | "brief";

/** "" = on-route. Otherwise selects an off-route / generic banner. */
export type OffRoute = "" | "major" | "kent" | "sussex" | "york" | "rugby";

export interface ResponseResource {
  id: string;
  kind: string;   // MOM / ERU / BTP / S&T / P-Way / Off Track / OLE / Telecoms / Other
  label: string;  // "Nottingham MOM", "Richmond recovery"
  eta: string;    // "19:30" — empty when unknown
  onSite: boolean;
}

export interface CommandRole {
  id: string;
  role: string;    // "Rail Incident Commander", "TPIC", custom
  holder: string;  // "SNDM Derby", "Nathan Kent"
  mandatory: boolean;
}

export interface StrandedTrain {
  id: string;
  headcode: string;
  location: string;
  plan: string;    // "Will be moved when possible" / "safely returned to Nottingham"
  cleared: boolean;
}

/** Immutable log entry — the message exactly as copied out. */
export interface SentMessage {
  ts: number;
  phase: IncidentPhase;
  updateNo: number | null;
  register: MessageRegister;
  banner: string | null;
  text: string;
}

export interface IncidentState {
  id: string;
  createdAt: number;
  phase: IncidentPhase;
  severity: IncidentSeverity;
  status: StatusEmoji;
  register: MessageRegister;
  offRoute: OffRoute;
  /** "" = automatic from phase/severity, "none" = no banner, else a banner id. */
  bannerOverride: string;
  title: string;                 // "{What} {Where}" — fixed at creation
  serviceGroups: string[];
  headline: string;
  trainService: string;
  customerImpact: string;
  stranded: StrandedTrain[];
  response: ResponseResource[];
  command: CommandRole[];
  priorityPlan: string;
  milestonePlan: string;
  strategicPriorities: string[]; // ids from STRATEGIC_PRIORITY_GROUPS
  dsf: { trains: string; minutes: string; cancellations: string };
  nwr: {
    time: string;
    detail: string;
    contingencyWithdrawn: boolean;
    recoveryToFollow: boolean;
  };
  recovery: {
    immediatePlan: string;
    targets: string;
    postIncident: string;
    nextReview: string;
    note: string;
  };
  updateCount: number;    // last sent update number
  draftNarrative: string; // the per-message delta (brief body / update narrative)
  sent: SentMessage[];
}
