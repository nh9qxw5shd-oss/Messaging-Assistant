import type { SafetyIncidentState } from "../safety/types";
import { renderSafetyMessage } from "../safety/renderer";

export function buildSafety(_meta: unknown, sf: SafetyIncidentState): string {
  return renderSafetyMessage(sf);
}
