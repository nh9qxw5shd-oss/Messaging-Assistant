import type { MetaState, StrategicAMState } from "../types";
import { linesFromPerf } from "../ragLogic";
import { formatMeta } from "./shared";

export function buildStrategicAM(meta: MetaState, s: StrategicAMState): string {
  const lines: string[] = [];

  lines.push(formatMeta(meta));
  lines.push("");

  lines.push("*Strategic Performance Update Post A.M. Peak (11:00)*");
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

  lines.push("*Key Service Interventions & Contingency Plans*");
  lines.push(s.interv || "");
  lines.push("");

  lines.push("*Opportunities to Improve & Build Resilience for the P.M. Peak*");
  lines.push(s.opps || "");
  lines.push("");

  lines.push("*Forward View*");
  lines.push(s.forward || "");

  return lines.join("\n").trimEnd();
}
