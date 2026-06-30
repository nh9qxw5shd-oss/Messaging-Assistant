import type { MetaState, TacticalState } from "../types";
import { linesFromPerf } from "../ragLogic";

export function buildTactical(_meta: MetaState, tac: TacticalState): string {
  const lines: string[] = [];

  lines.push(tac.intro || "");
  lines.push("");

  lines.push("*Control Command Team*");
  lines.push(`SNDM: ${tac.sndm || ""}`);
  lines.push(`RCM: ${tac.rcm || ""}`);
  lines.push("");

  lines.push("*Route Resource Dashboard*");
  lines.push("https://em-exec-dashboard.vercel.app/");
  lines.push("");

  lines.push("*Upcoming 08:15 Agenda*");
  lines.push("https://route-call.vercel.app/view");
  lines.push("");

  lines.push("*Operational Status*");
  lines.push(tac.status || "");
  lines.push("");

  lines.push(`⚠️ *Safety Incidents/Accidents*: ${tac.safety || "Nil"}`);
  lines.push("");

  lines.push("🚂 *Route Performance*");
  lines.push(linesFromPerf(tac.perf));
  lines.push("");

  lines.push("ℹ️ *Incidents ongoing/concluded since last update*");
  lines.push(tac.incidents || "");
  lines.push("");

  const l = tac.late;
  lines.push("⏱️ *Late running services*");
  lines.push("GTR");
  lines.push(`🟪 20 minutes Plus: ${l.gtr20 || 0}`);
  lines.push(`🟥 10 > 20 minutes: ${l.gtr10 || 0}`);
  lines.push(`Interventions: ${l.gtrInt || ""}`);
  lines.push("");
  lines.push("EMR");
  lines.push(`🟪 20 minutes Plus: ${l.emr20 || 0}`);
  lines.push(`🟥 10 > 20 minutes: ${l.emr10 || 0}`);
  lines.push(`Interventions: ${l.emrInt || ""}`);

  if (tac.seasonal?.trim()) {
    lines.push("");
    lines.push(tac.seasonal.trim());
  }

  return lines.join("\n").trimEnd();
}
