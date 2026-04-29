import type { MetaState, SoSState } from "../types";
import { linesFromPerf, statusLinePx } from "../ragLogic";
import { formatMeta } from "./shared";

export function buildSoS(meta: MetaState, sos: SoSState): string {
  const lines: string[] = [];

  lines.push(formatMeta(meta));
  lines.push("");

  lines.push(sos.intro || "");
  lines.push("");

  lines.push("*Operational Status*");
  lines.push("");
  lines.push(sos.status || "");
  lines.push("");

  lines.push(`⚠️ *Overnight Safety Incidents*: ${sos.safety || "Nil"}`);
  lines.push("");

  lines.push("🚂 *Yesterday's Route Performance*");
  lines.push(linesFromPerf(sos.perf));
  lines.push("");

  // TOC status — pixel-padded colon alignment
  lines.push("🚅 *TOC service and fleet start up*");
  lines.push(statusLinePx("GTR", sos.toc.sos_toc_gtr, 40));
  lines.push(statusLinePx("EMR", sos.toc.sos_toc_emr, 38));
  lines.push(statusLinePx("XC",  sos.toc.sos_toc_xc,  38));
  lines.push("");

  // NR Infrastructure
  lines.push("🛤️ *Network Rail Infrastructure*");
  lines.push(statusLinePx("TL Core",      sos.nr.sos_tl,    80));
  lines.push(statusLinePx("South",        sos.nr.sos_south, 80));
  lines.push(statusLinePx("North",        sos.nr.sos_north, 80));
  lines.push(statusLinePx("Lincolnshire", sos.nr.sos_lincs, 80));
  lines.push("");

  // On call
  const oc = sos.oncall;
  const onCallBlock = (label: string, until: string, from: string) =>
    `*${label}*\nUntil 08:00 - ${until?.trim() || "-"}\nFrom 08:00 - ${from?.trim() || "-"}`;

  lines.push("👥 *On Call*");
  lines.push(onCallBlock("Executive",   oc.exec_until,  oc.exec_from));
  lines.push("");
  lines.push(onCallBlock("Operations",  oc.ops_until,   oc.ops_from));
  lines.push("");
  lines.push(onCallBlock("Maintenance", oc.maint_until, oc.maint_from));
  lines.push("");

  lines.push("ℹ️ *Incidents ongoing/concluded since last update*");
  lines.push(sos.incidents || "");
  lines.push("");

  // ESR
  lines.push("🚂 *Emergency Speed Restrictions*");
  lines.push(`Imposed: ${sos.esr.imp}`);
  lines.push(`Amended: ${sos.esr.amd}`);
  lines.push(`Withdrawn: ${sos.esr.wdn}`);
  lines.push(`Planned Removal: ${sos.esr.pr}`);
  if (sos.esr.total?.trim()) lines.push(`Total: ${sos.esr.total.trim()}`);
  lines.push("");

  lines.push("🌤️ *Weather Forecast Summary*");
  lines.push(sos.weather || "");
  lines.push("");

  if (sos.maxtemps?.trim()) {
    lines.push("Max Temperatures");
    lines.push(sos.maxtemps.trim());
    lines.push("");
  }

  lines.push("*Forecast - 24 hours*");
  lines.push(sos.forecast || "");
  lines.push("");

  lines.push("🦺 *Engineering and Critical Works*");
  lines.push(sos.eng || "");

  if (sos.seasonal_opt?.trim()) {
    lines.push("");
    lines.push(sos.seasonal_opt.trim());
  }

  return lines.join("\n").trimEnd();
}
