// ─── Incident category identifiers ───────────────────────────────────────────

export type IncidentCategory =
  | "wrong_route"
  | "staff_accident"
  | "near_miss"
  | "coa_spar_sig_irreg"
  | "level_crossing"
  | "spad"
  | "wstcf_autumn"
  | "wstcf_non_autumn"
  | "line_block_irreg"
  | "station_overshoot"
  | "possession_irreg"
  | "tpws_activation"
  | "trespass"
  | "fire"
  | "fail_to_call"
  | "despatch_irreg"
  | "other";

export type StatusType = "new" | "update" | "6hour" | "closed";

// ─── Selected action chip (Beat 4) ───────────────────────────────────────────

export interface SelectedChip {
  chipId: string;
  param: string;
}

// ─── Full incident state ──────────────────────────────────────────────────────

export interface SafetyIncidentState {
  statusType: StatusType;

  // Category
  category: IncidentCategory;
  subCategory: string;

  // Reporter
  reporterType: string;      // "EMCC SSM" | "WH SSM" | "Signaller" | "Driver" | etc.
  reporterQualifier: string; // e.g. "Scropton" for Signaller, "Derby" for MOM

  // Train / service
  headcode: string;
  serviceTime: string;  // "10:09"
  serviceOrigin: string;
  serviceDestination: string;
  unitNumber: string;

  // Location
  location: string;
  locationShort: string; // for identified header, e.g. "St Pancras Churchyard"

  // Signal / TC
  signalId: string;   // primary signal, e.g. "WH21"
  tcId: string;       // e.g. "2723"

  // Routing (wrong route)
  routeOffered: string; // "Derby"
  routeBooked: string;  // "Alfreton"

  // Speed (SPAD / TPWS)
  speedMph: string;
  ossSetMph: string;

  // Incident time
  incidentTime: string;

  // People
  driverWelfare: string; // "ok" | "fit" | "da" | "relieved" | "stood_down" | "not_known" | ""
  driverReliefLocation: string;

  // Staff accident
  ipRole: string;
  injuryPhrase: string;
  isLateReport: boolean;

  // Mechanism — Beat 2 (free text, incident-specific)
  mechanism: string;

  // Actions — Beat 4
  actionChips: SelectedChip[];

  // Delay
  delayOutcome: string; // "otm" | "nil" | "sub" | "terminated" | "ecs" | ""
  delayTime: string;    // "OTM HH:MM"
  delayMinutes: string; // e.g. "8"

  // Flags
  isAutumnRelated: boolean;
  headerOverride: boolean; // force identified header
}
