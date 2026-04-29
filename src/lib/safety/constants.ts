import type { IncidentCategory, SafetyIncidentState } from "./types";

// ─── Incident categories (§2) — ordered by frequency ─────────────────────────

export interface CategoryDef {
  id: IncidentCategory;
  label: string;                    // plain header "Advice of {label}"
  shortForm?: string;               // identified header prefix
  subcategories: SubcategoryDef[];
  alwaysIdentified?: boolean;       // always uses identified header (§1.3)
}

export interface SubcategoryDef {
  id: string;
  label: string;
  headerLabel?: string; // overrides parent label in plain header
}

export const INCIDENT_CATEGORIES: CategoryDef[] = [
  {
    id: "wrong_route",
    label: "Wrong route",
    subcategories: [
      { id: "not_taken",       label: "Not taken",         headerLabel: "Wrong route - Not Taken" },
      { id: "taken",           label: "Taken",             headerLabel: "Wrong route - Taken" },
      { id: "offered_not_taken", label: "Offered – not taken", headerLabel: "Wrong route - Not Taken" },
      { id: "offered_taken",   label: "Offered – taken",   headerLabel: "Wrong route - Taken" },
    ],
  },
  {
    id: "staff_accident",
    label: "Staff Accident",
    subcategories: [
      { id: "strain_sprain",  label: "Strain or sprain" },
      { id: "cut_laceration", label: "Cut or laceration" },
      { id: "trip_slip",      label: "Trip or slip" },
      { id: "struck_by",      label: "Struck by" },
      { id: "insect_bite",    label: "Insect bite or sting" },
      { id: "illness",        label: "Illness" },
      { id: "other",          label: "Other" },
    ],
  },
  {
    id: "near_miss",
    label: "Near Miss",
    subcategories: [
      { id: "mop",        label: "Member of public" },
      { id: "trespasser", label: "Trespasser" },
      { id: "staff",      label: "Staff" },
      { id: "vehicle_lc", label: "Vehicle at LC" },
      { id: "animal",     label: "Animal" },
    ],
  },
  {
    id: "coa_spar_sig_irreg",
    label: "COA / SPaR / Signalling irregularity",
    subcategories: [
      { id: "coa_sig",   label: "COA – signaller error" },
      { id: "coa_ars",   label: "COA – ARS" },
      { id: "spar",      label: "SPaR" },
      { id: "irreg_seq", label: "Irregular signal sequence" },
      { id: "wsf",       label: "WSF" },
    ],
  },
  {
    id: "level_crossing",
    label: "Level Crossing",
    subcategories: [
      { id: "misuse",          label: "Misuse" },
      { id: "strike",          label: "Strike" },
      { id: "barrier_failure", label: "Barrier failure" },
      { id: "wicket_damage",   label: "Wicket gate damage" },
      { id: "vehicle_through", label: "Vehicle through barrier" },
    ],
  },
  {
    id: "spad",
    label: "SPAD",
    shortForm: "SPaD",
    alwaysIdentified: true,
    subcategories: [
      { id: "cat_a",      label: "Cat A", headerLabel: "Cat A SPaD" },
      { id: "cat_b",      label: "Cat B", headerLabel: "Cat B SPaD" },
      { id: "tpws_only",  label: "TPWS-only" },
      { id: "multi_spad", label: "Multi-SPAD" },
    ],
  },
  {
    id: "wstcf_autumn",
    label: "Autumn Related WSTCF",
    subcategories: [
      { id: "scwo",        label: "SCWO" },
      { id: "centrix",     label: "Centrix alarm" },
      { id: "late_notice", label: "Late notice" },
    ],
  },
  {
    id: "wstcf_non_autumn",
    label: "WSTCF",
    subcategories: [
      { id: "tc_failure",       label: "TC failure" },
      { id: "wsf",              label: "WSF" },
      { id: "wheel_contamination", label: "Wheel contamination" },
    ],
  },
  {
    id: "line_block_irreg",
    label: "Line Block Irregularity",
    subcategories: [
      { id: "limit_error",     label: "Limit error" },
      { id: "no_protection",   label: "Granted without protection" },
      { id: "late_handback",   label: "Late hand-back" },
      { id: "overlapping",     label: "Overlapping LBs" },
    ],
  },
  {
    id: "station_overshoot",
    label: "Station Overshoot",
    subcategories: [
      { id: "passed",       label: "Station passed" },
      { id: "railhead",     label: "Reportable railhead" },
      { id: "lapse",        label: "Lapse of concentration" },
      { id: "other",        label: "Other" },
    ],
  },
  {
    id: "possession_irreg",
    label: "Possession Irregularity",
    shortForm: "Possession Irregularity /",
    subcategories: [
      { id: "outside_limits",  label: "Worksite outside limits" },
      { id: "marker_board",    label: "Marker board error" },
      { id: "picop_es",        label: "Picop or ES error" },
      { id: "marker_strike",   label: "Strike with marker" },
    ],
  },
  {
    id: "tpws_activation",
    label: "TPWS Activation",
    subcategories: [
      { id: "oss",         label: "OSS" },
      { id: "tss",         label: "TSS" },
      { id: "loop",        label: "Loop" },
      { id: "unsolicited", label: "Unsolicited" },
    ],
  },
  {
    id: "trespass",
    label: "Trespass",
    alwaysIdentified: true,
    subcategories: [
      { id: "on_track",    label: "On track" },
      { id: "on_platform", label: "On platform" },
      { id: "barriers",    label: "Crossing barriers" },
    ],
  },
  {
    id: "fire",
    label: "Fire",
    alwaysIdentified: true,
    subcategories: [
      { id: "on_train",  label: "On train" },
      { id: "lineside",  label: "Lineside" },
      { id: "equipment", label: "Equipment" },
    ],
  },
  {
    id: "fail_to_call",
    label: "Fail to Call",
    subcategories: [
      { id: "booked_passed", label: "Booked station passed" },
    ],
  },
  {
    id: "despatch_irreg",
    label: "Despatch Irregularity",
    subcategories: [
      { id: "tip_not_taken", label: "Tip not taken" },
      { id: "at_red",        label: "At red" },
    ],
  },
  {
    id: "other",
    label: "safety incident",
    subcategories: [
      { id: "other", label: "Other" },
    ],
  },
];

// ─── Reporter picklist (§3) ───────────────────────────────────────────────────

export const REPORTERS = [
  "EMCC SSM",
  "WH SSM",
  "TBROC SSM",
  "Signaller",   // needs qualifier
  "Driver",
  "EMR",
  "MOM",         // needs qualifier
  "TSE",
  "LOM",
  "NOC",
  "BTP",
  "Other",
] as const;

export type ReporterType = (typeof REPORTERS)[number];

// Reporters whose qualifier is required
export const REPORTERS_NEEDING_QUALIFIER: string[] = ["Signaller", "MOM"];

// Reporters that use "reports" (driver / IP themselves)
export const REPORTER_VERB_REPORTS: string[] = ["Driver"];

// ─── Action chips (§4) ───────────────────────────────────────────────────────

export interface ActionChipDef {
  id: string;
  label: string;
  template: string;     // rendered prose; {param} is replaced with chip param
  hasParam: boolean;
  paramPlaceholder?: string;
}

export const ACTION_CHIPS: ActionChipDef[] = [
  { id: "btp_advised",    label: "BTP advised (Ref: ___)",                    template: "BTP advised Ref: {param}.",              hasParam: true,  paramPlaceholder: "ref number" },
  { id: "btp_attending",  label: "BTP attending",                             template: "BTP attending.",                        hasParam: false },
  { id: "mom_attending",  label: "MOM attending",                             template: "MOM attending.",                        hasParam: false },
  { id: "mom_en_route",   label: "MOM en route",                              template: "MOM en route.",                         hasParam: false },
  { id: "st_attending",   label: "S&T attending / on call",                   template: "S&T attending.",                        hasParam: false },
  { id: "l2_l3_st",       label: "L2 / L3 S&T advised",                       template: "L2 S&T advised.",                       hasParam: false },
  { id: "care_plan",      label: "Care plan in place / owner appointed",      template: "Care plan owner appointed.",            hasParam: false },
  { id: "first_aid",      label: "First aid given",                           template: "First aid given.",                      hasParam: false },
  { id: "ip_ae",          label: "IP accompanied to A&E (___)",               template: "IP accompanied to A&E at {param}.",     hasParam: true,  paramPlaceholder: "hospital name" },
  { id: "ip_stood_down",  label: "IP / driver stood down",                    template: "IP / driver stood down.",               hasParam: false },
  { id: "driver_relieved",label: "Driver relieved at ___",                    template: "Driver relieved at {param}.",           hasParam: true,  paramPlaceholder: "location" },
  { id: "da_screening",   label: "Cause screening (D&A) arranged",            template: "Cause screening arranged.",             hasParam: false },
  { id: "double_block",   label: "3.5 working / Double blocking implemented", template: "Double block working implemented.",     hasParam: false },
  { id: "caution",        label: "Caution imposed at ___",                    template: "Caution imposed at {param}.",           hasParam: true,  paramPlaceholder: "location" },
  { id: "otdr",           label: "OTDR / OTMR download requested",            template: "OTDR download requested.",              hasParam: false },
  { id: "ffcctv",         label: "FFCCTV requested",                          template: "FFCCTV requested.",                     hasParam: false },
  { id: "statements",     label: "Statements taken",                          template: "Statements taken.",                     hasParam: false },
  { id: "ecs",            label: "Service set back / forward as ECS to ___",  template: "Service set forward as ECS to {param}.", hasParam: true,  paramPlaceholder: "location" },
  { id: "lom_aware",      label: "LOM aware / will advise LOM",               template: "LOM aware.",                            hasParam: false },
  { id: "line_mgr",       label: "Line manager advised",                      template: "Line manager advised.",                 hasParam: false },
  { id: "investigation",  label: "L1 / L2 / L3 investigation",                template: "{param} investigation.",                hasParam: true,  paramPlaceholder: "L1/L2/L3" },
  { id: "tsr",            label: "TSR imposed",                               template: "TSR imposed.",                          hasParam: false },
  { id: "no_allegations", label: "No allegations against infrastructure / equipment", template: "No allegation against signalling.", hasParam: false },
  { id: "terminated",     label: "Train terminated",                          template: "Train terminated.",                     hasParam: false },
  { id: "driver_ok",      label: "Driver OK to continue",                     template: "Driver OK to continue.",                hasParam: false },
  { id: "driver_fit",     label: "Driver fit to continue",                    template: "Driver fit to continue.",               hasParam: false },
  { id: "nir",            label: "NIR raised (___)",                          template: "NIR raised ({param}).",                 hasParam: true,  paramPlaceholder: "reference" },
  { id: "close_call",     label: "Close Call raised (Ref: ___)",              template: "Close Call raised Ref: {param}.",       hasParam: true,  paramPlaceholder: "ref number" },
];

// ─── Driver welfare picklist ──────────────────────────────────────────────────

export const DRIVER_WELFARE_OPTIONS = [
  { id: "",           label: "— not applicable —" },
  { id: "ok",         label: "Driver OK to continue" },
  { id: "fit",        label: "Driver fit to continue" },
  { id: "da",         label: "Driver stood down for D&A" },
  { id: "relieved",   label: "Driver relieved at location" },
  { id: "stood_down", label: "Driver stood down (other)" },
  { id: "not_known",  label: "Not yet known" },
] as const;

// ─── Delay outcome picklist ───────────────────────────────────────────────────

export const DELAY_OUTCOMES = [
  { id: "",           label: "— no delay —" },
  { id: "otm",        label: "OTM (on time minutes)" },
  { id: "nil",        label: "Nil delay" },
  { id: "sub",        label: "Sub-threshold" },
  { id: "terminated", label: "Service terminated" },
  { id: "ecs",        label: "ECS to location" },
] as const;

// ─── Default incident state ───────────────────────────────────────────────────

export const DEFAULT_SAFETY_INCIDENT: SafetyIncidentState = {
  statusType: "new",
  category: "wrong_route",
  subCategory: "not_taken",
  reporterType: "EMCC SSM",
  reporterQualifier: "",
  headcode: "",
  serviceTime: "",
  serviceOrigin: "",
  serviceDestination: "",
  unitNumber: "",
  location: "",
  locationShort: "",
  signalId: "",
  tcId: "",
  routeOffered: "",
  routeBooked: "",
  speedMph: "",
  ossSetMph: "",
  incidentTime: "",
  driverWelfare: "",
  driverReliefLocation: "",
  ipRole: "",
  injuryPhrase: "",
  isLateReport: false,
  mechanism: "",
  actionChips: [],
  delayOutcome: "",
  delayTime: "",
  delayMinutes: "",
  isAutumnRelated: false,
  headerOverride: false,
};
