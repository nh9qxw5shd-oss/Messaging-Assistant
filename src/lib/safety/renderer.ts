import type { SafetyIncidentState } from "./types";
import { INCIDENT_CATEGORIES, ACTION_CHIPS } from "./constants";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategoryDef(category: string) {
  return INCIDENT_CATEGORIES.find((c) => c.id === category);
}

function getSubcategoryDef(category: string, subCategory: string) {
  const cat = getCategoryDef(category);
  return cat?.subcategories.find((s) => s.id === subCategory);
}

function reporterLabel(state: SafetyIncidentState): string {
  const { reporterType, reporterQualifier } = state;
  if ((reporterType === "Signaller" || reporterType === "MOM") && reporterQualifier) {
    return `${reporterType} ${reporterQualifier}`;
  }
  return reporterType;
}

function reporterVerb(state: SafetyIncidentState): string {
  return state.reporterType === "Driver" ? "reports" : "advises";
}

function serviceDescriptor(state: SafetyIncidentState): string {
  const { headcode, serviceTime, serviceOrigin, serviceDestination, unitNumber } = state;
  if (!headcode) return "";
  const parts: string[] = [];
  if (serviceTime) parts.push(serviceTime);
  if (serviceOrigin) parts.push(serviceOrigin);
  if (serviceOrigin && serviceDestination) parts.push(`to ${serviceDestination}`);
  else if (serviceDestination) parts.push(serviceDestination);
  if (unitNumber) parts.push(`(${unitNumber})`);
  return parts.length ? `${headcode} (${parts.join(" ")})` : headcode;
}

// ─── Severity trigger — identified header (§1.3) ──────────────────────────────

function useIdentifiedHeader(state: SafetyIncidentState): boolean {
  if (state.headerOverride) return true;
  const { category, subCategory } = state;
  if (category === "spad") return true;
  if (category === "near_miss" && ["mop", "trespasser", "staff"].includes(subCategory)) return true;
  if (category === "trespass" || category === "fire") return true;
  if (category === "possession_irreg" && state.location) return true;
  if (category === "line_block_irreg" && state.location) return false; // no identified header per spec
  return false;
}

// ─── Header builder (§1.1) ────────────────────────────────────────────────────

function buildHeader(state: SafetyIncidentState): string {
  const { category, subCategory, isAutumnRelated, statusType } = state;

  const icon = statusType === "update" || statusType === "6hour" ? "ℹ️" : "⚠️";

  // Autumn WSTCF special case
  if (category === "wstcf_autumn") {
    return `${icon}🍂 *East Midlands Route - Autumn Related WSTCF*`;
  }

  // Update suffix
  const updateSuffix = (statusType === "update" || statusType === "6hour") ? " Update" : "";

  if (useIdentifiedHeader(state)) {
    // Identified header format
    const catDef = getCategoryDef(category);
    const subDef = getSubcategoryDef(category, subCategory);
    let prefix = subDef?.headerLabel ?? catDef?.shortForm ?? catDef?.label ?? category;
    const loc = state.locationShort || state.location;
    const hc = state.headcode;

    if (category === "spad") {
      // "Cat A SPaD 1D48 St Pancras Churchyard"
      const parts = [prefix, hc, loc].filter(Boolean);
      return `${icon} *East Midlands Route - ${parts.join(" ")}${updateSuffix}*`;
    }
    if (category === "near_miss") {
      // "1K59 Near Miss Mill Lane UWC"
      const parts = [hc, "Near Miss", loc].filter(Boolean);
      return `${icon} *East Midlands Route - ${parts.join(" ")}${updateSuffix}*`;
    }
    if (category === "possession_irreg") {
      // "Possession Irregularity / Ampthill"
      return `${icon} *East Midlands Route - Possession Irregularity / ${loc}${updateSuffix}*`;
    }
    // Generic identified: "{shortForm} {loc}"
    const parts = [prefix, loc].filter(Boolean);
    return `${icon} *East Midlands Route - ${parts.join(" ")}${updateSuffix}*`;
  }

  // Plain header — "Advice of {label}"
  const catDef = getCategoryDef(category);
  const subDef = getSubcategoryDef(category, subCategory);
  const label = subDef?.headerLabel ?? catDef?.label ?? "safety incident";
  return `${icon} *East Midlands Route - Advice of ${label}${updateSuffix}*`;
}

// ─── Beat 1 — Source & headline (§1.5, §1.6) ─────────────────────────────────

function buildBeat1(state: SafetyIncidentState): string {
  const { category, subCategory, location, signalId, headcode } = state;
  const reporter = reporterLabel(state);
  const verb = reporterVerb(state);
  const svc = serviceDescriptor(state);
  const hc = svc || headcode;
  const loc = location;
  const sig = signalId ? `signal ${signalId}` : "";

  // Staff accident: no "advises" — direct subject
  if (category === "staff_accident") {
    const { ipRole, injuryPhrase, isLateReport } = state;
    if (isLateReport) {
      return `Late reported staff accident — ${ipRole || "IP"}${loc ? ` at ${loc}` : ""}.`;
    }
    const role = ipRole || "IP";
    const injury = injuryPhrase || "sustained an injury";
    return `IP — ${role} has ${injury}${loc ? ` at ${loc}` : ""}.`;
  }

  let subjectPhrase: string;

  switch (category) {
    case "wrong_route": {
      // For wrong_route, signal is the primary location ref; loc only appended if signal absent OR different
      const routingStr = state.routeOffered && state.routeBooked
        ? ` towards ${state.routeOffered} vice ${state.routeBooked}`
        : "";
      if (subCategory === "taken" || subCategory === "offered_taken") {
        subjectPhrase = `${hc} wrongly routed`;
        if (sig) subjectPhrase += ` at ${sig}`;
        if (loc) subjectPhrase += ` at ${loc}`;
        subjectPhrase += routingStr;
      } else {
        // not_taken / offered_not_taken
        subjectPhrase = `wrong route offered to ${hc}`;
        if (sig) subjectPhrase += ` at ${sig}`;
        else if (loc) subjectPhrase += ` at ${loc}`;
        subjectPhrase += routingStr;
      }
      return `${reporter} ${verb} ${subjectPhrase}.`;
    }

    case "spad":
      if (subCategory === "cat_a") {
        subjectPhrase = `passing ${sig || "signal"}${loc ? ` (${loc})` : ""}`;
        return `${reporter} ${verb} ${subjectPhrase}.`;
      }
      if (subCategory === "cat_b") {
        subjectPhrase = `Cat B SPAD ${hc}${sig ? ` at ${sig}` : ""}${loc ? ` ${loc}` : ""}`;
        return `${reporter} ${verb} ${subjectPhrase}.`;
      }
      subjectPhrase = `SPAD ${hc}${sig ? ` at ${sig}` : ""}${loc ? ` ${loc}` : ""}`;
      return `${reporter} ${verb} ${subjectPhrase}.`;

    case "near_miss":
      if (subCategory === "mop" || subCategory === "trespasser") {
        subjectPhrase = `near miss reported by driver ${hc}${loc ? ` when approaching ${loc}` : ""}`;
      } else if (subCategory === "staff") {
        subjectPhrase = `near miss involving staff${loc ? ` at ${loc}` : ""}`;
      } else if (subCategory === "vehicle_lc") {
        subjectPhrase = `near miss with vehicle${loc ? ` at ${loc}` : ""}`;
      } else {
        subjectPhrase = `near miss${loc ? ` at ${loc}` : ""}`;
      }
      return `${reporter} ${verb} ${subjectPhrase}.`;

    case "wstcf_autumn":
      subjectPhrase = `Autumn related WSTCF${state.tcId ? ` on ${state.tcId} T/C SCWO` : ""}${loc ? ` at ${loc}` : ""}`;
      return `${reporter} ${verb} ${subjectPhrase}.`;

    case "wstcf_non_autumn":
      subjectPhrase = `WSTCF${state.tcId ? ` of ${state.tcId}` : ""}${loc ? ` at ${loc}` : ""}`;
      return `${reporter} ${verb} ${subjectPhrase}.`;

    case "tpws_activation": {
      const subLabel = subCategory === "oss" ? "OSS" : subCategory === "tss" ? "TSS" : "TPWS";
      subjectPhrase = `${hc} ${subLabel} TPWS activation${sig ? ` in the area of ${sig}` : ""}${loc ? ` ${loc}` : ""}`;
      return `${reporter} ${verb} ${subjectPhrase}.`;
    }

    case "coa_spar_sig_irreg": {
      const subLabel = subCategory === "spar" ? "SPaR" : "COA";
      subjectPhrase = `${hc} ${subLabel}${sig ? ` at ${sig}` : ""}${loc ? ` ${loc}` : ""}`;
      return `${reporter} ${verb} ${subjectPhrase}.`;
    }

    case "station_overshoot":
      subjectPhrase = `${hc} overshot ${loc || "station"}`;
      return `${reporter} ${verb} ${subjectPhrase}.`;

    case "possession_irreg":
      subjectPhrase = `possession irregularity${loc ? ` at ${loc}` : ""}`;
      return `${reporter} ${verb} ${subjectPhrase}.`;

    case "line_block_irreg":
      subjectPhrase = `line block irregularity${loc ? ` at ${loc}` : ""}`;
      return `${reporter} ${verb} ${subjectPhrase}.`;

    case "trespass":
      subjectPhrase = `trespass${loc ? ` at ${loc}` : ""}`;
      return `${reporter} ${verb} ${subjectPhrase}.`;

    case "level_crossing":
      if (subCategory === "misuse") {
        subjectPhrase = `level crossing misuse${loc ? ` at ${loc}` : ""}`;
      } else if (subCategory === "strike") {
        subjectPhrase = `vehicle strike${loc ? ` at ${loc}` : ""}`;
      } else {
        subjectPhrase = `level crossing incident${loc ? ` at ${loc}` : ""}`;
      }
      return `${reporter} ${verb} ${subjectPhrase}.`;

    case "fire":
      subjectPhrase = `fire${loc ? ` at ${loc}` : ""}`;
      return `${reporter} ${verb} ${subjectPhrase}.`;

    case "fail_to_call":
      subjectPhrase = `${hc} failed to call${loc ? ` at ${loc}` : ""}`;
      return `${reporter} ${verb} ${subjectPhrase}.`;

    case "despatch_irreg":
      subjectPhrase = `${hc} despatch irregularity${loc ? ` at ${loc}` : ""}`;
      return `${reporter} ${verb} ${subjectPhrase}.`;

    default:
      return `${reporter} ${verb} safety incident${loc ? ` at ${loc}` : ""}.`;
  }
}

// ─── Beat 4 — Action chips → prose (§4) ──────────────────────────────────────

function buildBeat4(state: SafetyIncidentState): string {
  const sentences: string[] = [];

  for (const selected of state.actionChips) {
    const def = ACTION_CHIPS.find((c) => c.id === selected.chipId);
    if (!def) continue;
    const rendered = def.hasParam && selected.param
      ? def.template.replace("{param}", selected.param)
      : def.hasParam
        ? def.template.replace(" {param}", "").replace("{param}", "")
        : def.template;
    sentences.push(rendered);
  }

  // Delay outcome appended last
  if (state.delayOutcome === "otm" && state.delayTime) {
    const mins = state.delayMinutes ? `${state.delayMinutes}L` : "";
    sentences.push(`OTM ${state.delayTime}${mins ? ` ${mins}` : ""}.`);
  } else if (state.delayOutcome === "nil") {
    sentences.push("Nil delay.");
  } else if (state.delayOutcome === "sub") {
    sentences.push("Sub-threshold.");
  }

  return sentences.join(" ");
}

// ─── Main renderer ────────────────────────────────────────────────────────────

export function renderSafetyMessage(state: SafetyIncidentState): string {
  const parts: string[] = [];

  parts.push(buildHeader(state));

  const beat1 = buildBeat1(state).trim();
  const beat2 = state.mechanism.trim();
  const beat4 = buildBeat4(state).trim();

  const body = [beat1, beat2, beat4].filter(Boolean).join(" ");
  if (body) parts.push(body);

  return parts.join("\n");
}

// ─── Linter (§7.4) ───────────────────────────────────────────────────────────

const BANNED_TOKENS = [
  "thankfully", "fortunately", "concerning", "alarming",
  "unfortunately", "sadly", "happily", "luckily",
];

export interface LintResult {
  ok: boolean;
  warnings: string[];
}

export function lintMessage(rendered: string, state: SafetyIncidentState): LintResult {
  const warnings: string[] = [];

  // Header format
  if (!/^[⚠️ℹ️🍂]+\s*\*East Midlands Route -/.test(rendered)) {
    warnings.push("Header does not match expected format.");
  }

  // Reporter verb present
  if (!/\b(advises|reports|has advised|has reported)\b/.test(rendered)) {
    warnings.push("Beat 1: reporter verb (advises / reports) not detected.");
  }

  // Location present
  if (!state.location && state.category !== "other") {
    warnings.push("Location field is empty.");
  }

  // Driver welfare when driver is implied
  const driverCategories = [
    "wrong_route", "spad", "near_miss", "tpws_activation",
    "station_overshoot", "despatch_irreg", "fail_to_call",
  ];
  if (driverCategories.includes(state.category) && !state.driverWelfare && state.actionChips.every((c) => !["driver_ok", "driver_fit", "driver_relieved", "ip_stood_down"].includes(c.chipId))) {
    warnings.push("Driver welfare not recorded for category that implies a driver.");
  }

  // At least one action chip
  if (state.actionChips.length === 0) {
    warnings.push("Beat 4: no action chips selected.");
  }

  // Banned editorialising tokens
  const lower = rendered.toLowerCase();
  for (const token of BANNED_TOKENS) {
    if (lower.includes(token)) {
      warnings.push(`Banned editorialising token detected: "${token}".`);
    }
  }

  return { ok: warnings.length === 0, warnings };
}
