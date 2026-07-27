import type { IncidentState } from "./types";
import {
  STATUS_EMOJI,
  STRATEGIC_PRIORITY_GROUPS,
  normaliseTime,
  resolveBanner,
} from "./constants";

// ─── Shared block helpers ─────────────────────────────────────────────────────
// Blocks self-suppress when empty, matching the daily message builders.

function section(title: string, body: string): string | null {
  const b = body.trim();
  return b ? `*${title}*\n${b}` : null;
}

function joinBlocks(blocks: (string | null)[]): string {
  return blocks.filter((b): b is string => !!b && b.trim().length > 0).join("\n\n");
}

function titleLine(inc: IncidentState): string {
  const emoji = STATUS_EMOJI[inc.status];
  return inc.title.trim() ? `${emoji} *${inc.title.trim()}*` : emoji;
}

function serviceGroupsBlock(inc: IncidentState): string | null {
  return section("Service Groups affected", inc.serviceGroups.join("\n"));
}

function strandedBlock(inc: IncidentState): string | null {
  // Only rendered once trains have been entered; cleared trains keep their
  // plan line ("safely returned to…") until removed, matching corpus practice.
  if (inc.stranded.length === 0) return null;
  const active = inc.stranded.filter((t) => !t.cleared || t.plan.trim());
  const lines = active.map((t) => {
    const head = [t.headcode.trim(), t.location.trim()].filter(Boolean).join(" ");
    return t.plan.trim() ? `${head} – ${t.plan.trim()}` : head;
  }).filter(Boolean);
  return section("Stranded Trains", lines.length ? lines.join("\n") : "None");
}

function responseBlock(inc: IncidentState): string | null {
  const lines = inc.response
    .map((r) => {
      const name = r.label.trim() || r.kind;
      if (r.onSite) return `${name} On site`;
      if (r.eta.trim()) return `${name} ETA ${normaliseTime(r.eta)}`;
      return name;
    })
    .filter(Boolean);
  return section("Response", lines.join("\n"));
}

function commandBlock(inc: IncidentState): string | null {
  const lines = inc.command
    .filter((c) => c.holder.trim())
    .map((c) => `${c.role}: ${c.holder.trim()}`);
  return section("Command Structure", lines.join("\n"));
}

function strategicBlock(inc: IncidentState): string | null {
  const lines = STRATEGIC_PRIORITY_GROUPS
    .filter((g) => inc.strategicPriorities.includes(g.id))
    .map((g) => g.text);
  return section("Strategic priorities", lines.join("\n"));
}

function dsfLine(inc: IncidentState): string {
  const { trains, minutes, cancellations } = inc.dsf;
  if (!trains.trim() || !minutes.trim()) return "";
  const base = `DSF ${trains.trim()} x ${minutes.trim()}`;
  return cancellations.trim() ? `${base} with ${cancellations.trim()}` : base;
}

function delayStatusBlock(inc: IncidentState): string | null {
  return section("Delay Status", dsfLine(inc));
}

// ─── Phase renderers ──────────────────────────────────────────────────────────

function renderHolding(inc: IncidentState): string {
  const header = inc.title.trim()
    ? `*Holding Message* – ${inc.title.trim()}`
    : "*Holding Message*";
  return joinBlocks([
    header,
    inc.draftNarrative,
    serviceGroupsBlock(inc),
    strandedBlock(inc),
    "Details being established and update to follow.",
  ]);
}

function renderInitial(inc: IncidentState): string {
  return joinBlocks([
    titleLine(inc),
    section("Headline", inc.headline),
    serviceGroupsBlock(inc),
    strandedBlock(inc),
    section("Train Service", inc.trainService),
    section("Customer Impact", inc.customerImpact),
    responseBlock(inc),
    commandBlock(inc),
    section("Prioritised Plan", inc.priorityPlan),
    section("Milestone Plan", inc.milestonePlan),
  ]);
}

function renderUpdate(inc: IncidentState): string {
  const n = inc.updateCount + 1;
  return joinBlocks([
    titleLine(inc),
    `*Update ${n}*`,
    inc.draftNarrative,
    serviceGroupsBlock(inc),
    strandedBlock(inc),
    section("Train Service", inc.trainService),
    section("Customer Impact", inc.customerImpact),
    delayStatusBlock(inc),
    responseBlock(inc),
    commandBlock(inc),
    strategicBlock(inc),
    section("Prioritised Plan", inc.priorityPlan),
    section("Milestone Plan", inc.milestonePlan),
  ]);
}

function renderNwr(inc: IncidentState): string {
  const time = normaliseTime(inc.nwr.time);
  const detail = inc.nwr.detail.trim();
  const headline = time
    ? `Normal working resumed at ${time}.${detail ? ` ${detail}` : ""}`
    : detail || "Normal working resumed.";
  return joinBlocks([
    titleLine(inc),
    headline,
    inc.nwr.contingencyWithdrawn ? "Contingency plan withdrawn." : null,
    delayStatusBlock(inc),
    inc.nwr.recoveryToFollow
      ? "Post incident service recovery update to follow post ITSR huddle."
      : null,
  ]);
}

function renderRecovery(inc: IncidentState): string {
  const emoji = STATUS_EMOJI[inc.status];
  const title = inc.title.trim()
    ? `${emoji} *${inc.title.trim()}* – *Service Recovery*`
    : `${emoji} *Service Recovery*`;
  const review = inc.recovery.nextReview.trim()
    ? `Time of next service recovery review: ${normaliseTime(inc.recovery.nextReview)}`
    : null;
  return joinBlocks([
    title,
    dsfLine(inc),
    section("Immediate plan going forward", inc.recovery.immediatePlan),
    section("Service Group Recovery Target", inc.recovery.targets),
    section("Post incident service recovery", inc.recovery.postIncident),
    review,
    inc.recovery.note,
  ]);
}

function renderBrief(inc: IncidentState): string {
  const narrative = inc.draftNarrative.trim();
  if (inc.phase === "update") {
    const n = inc.updateCount + 1;
    return joinBlocks([
      titleLine(inc),
      narrative ? `*Update ${n}*: ${narrative}` : `*Update ${n}*:`,
    ]);
  }
  return joinBlocks([titleLine(inc), narrative]);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function renderIncident(inc: IncidentState): string {
  if (inc.register === "brief" && inc.phase !== "nwr" && inc.phase !== "recovery") {
    return renderBrief(inc);
  }
  switch (inc.phase) {
    case "holding":  return renderHolding(inc);
    case "initial":  return renderInitial(inc);
    case "update":   return renderUpdate(inc);
    case "nwr":      return renderNwr(inc);
    case "recovery": return renderRecovery(inc);
    case "closed":   return renderBrief(inc);
  }
}

/**
 * Teams-compatible rich HTML flavour for the dual-format clipboard,
 * with the incident's resolved banner as an absolute-URL image.
 */
export function buildIncidentHtml(inc: IncidentState, plainText: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const banner = resolveBanner(inc);
  const bannerHtml =
    appUrl && banner
      ? `<img src="${appUrl}${banner.path}" alt="Banner" style="max-width:100%;height:auto;display:block;margin:0 0 8px 0;"><hr style="border:none;border-top:1px solid #ddd;margin:8px 0;">`
      : "";
  return `${bannerHtml}${plainText.replace(/\n/g, "<br>")}`;
}
