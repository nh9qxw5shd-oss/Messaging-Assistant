import type { MetaState, SafetyState } from "../types";
import { SAFETY_TYPES } from "../constants";
import { formatMeta } from "./shared";

export function buildSafety(meta: MetaState, sf: SafetyState): string {
  const lines: string[] = [];

  lines.push(formatMeta(meta));
  lines.push("");

  const typeLabel =
    SAFETY_TYPES.find((t) => t.id === sf.type)?.label ?? "Safety incident";
  const sub = sf.subtype && sf.subtype !== "Other" ? ` (${sf.subtype})` : "";

  lines.push(`⚠️*East Midlands Route - Advice of safety incident* - ${typeLabel}${sub}`);

  // Reference line
  const refs: string[] = [];
  if (sf.time)     refs.push(`Time: ${sf.time}`);
  if (sf.location) refs.push(`Location: ${sf.location}`);
  if (sf.asset)    refs.push(`Ref: ${sf.asset}`);
  if (sf.people)   refs.push(`People: ${sf.people}`);
  if (refs.length) {
    lines.push(refs.join(" | "));
    lines.push("");
  }

  // A — Summary
  lines.push("A. Summary");
  const summaryParts = [`${typeLabel}${sub}`];
  if (sf.location) summaryParts.push(`at ${sf.location}`);
  if (sf.time)     summaryParts.push(`(${sf.time})`);
  lines.push(summaryParts.join(" "));
  lines.push("");

  // B — What happened
  lines.push("B. What happened");
  lines.push((sf.what || "").trim() || "TBC");
  lines.push("");

  // C — Immediate actions
  lines.push("C. Immediate actions");
  const acts: string[] = [];
  const a = sf.actions;
  if (a.ebr)    acts.push("Emergency brake / TPWS intervention");
  if (a.mom)    acts.push("MOM attending / on route");
  if (a.btp)    acts.push("BTP advised / attending");
  if (a.screen) acts.push("Screening arranged / stood down");
  if (a.care)   acts.push("Care plan initiated");
  if (a.ffcctv) acts.push("FFCCTV / comms review requested");
  lines.push(acts.length ? `- ${acts.join("\n- ")}` : "Nil / N/A");
  lines.push("");

  // D — Status
  lines.push("D. Status / next steps");
  lines.push(`Status: ${sf.status || "Initial advice"}`);
  if (sf.owner) lines.push(`Owner: ${sf.owner}`);
  if (sf.notes?.trim()) {
    lines.push("");
    lines.push(sf.notes.trim());
  }

  return lines.join("\n").trimEnd();
}
