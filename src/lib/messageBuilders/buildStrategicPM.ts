import type { MetaState, StrategicPMState } from "../types";
import { linesFromPerf } from "../ragLogic";
import { formatMeta } from "./shared";

export function buildStrategicPM(meta: MetaState, s: StrategicPMState): string {
  const lines: string[] = [];

  lines.push(formatMeta(meta));
  lines.push("");

  lines.push("*Strategic Performance Update Post P.M. Peak (20:00)*");
  lines.push("");

  lines.push("*Executive Summary*");
  lines.push(s.exec || "");
  lines.push("");

  lines.push("*Operational Status*");
  lines.push(s.status || "");
  lines.push("");

  lines.push("Performance Snapshot");
  lines.push(linesFromPerf(s.perf));
  lines.push("");

  lines.push("*Performance Trends*");
  lines.push(s.trends || "");
  lines.push("");

  lines.push("*Key Service Interventions Taken & Contingency Plans*");
  lines.push(s.interv || "");
  lines.push("");

  lines.push("*Forward Risks & Preparation for Tomorrow's Start of Service*");
  lines.push(`- Infrastructure: ${s.risk_infra || ""}`);
  lines.push(`- Fleet: ${s.risk_fleet || ""}`);
  lines.push(`- Crew: ${s.risk_crew || ""}`);
  lines.push(`- Weather: ${s.risk_weather || ""}`);
  lines.push("");

  lines.push("*Outlook*");
  lines.push(s.outlook || "");

  return lines.join("\n").trimEnd();
}
