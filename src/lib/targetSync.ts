import type { TargetMetric } from "./types";
import { SOS_ONLY_METRIC } from "./constants";

function normName(s: string): string {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Synchronise a perf array with the master targets list.
 * - Metrics present in targets but missing from arr → added with empty value
 * - Metrics in arr that no longer exist in targets → removed (except SOS-only metrics)
 * - Existing metrics in arr → target/amber/dir/name updated; value and notes preserved
 */
export function propagateTargetsToArray(
  arr: TargetMetric[],
  targets: TargetMetric[]
): TargetMetric[] {
  const result = [...arr];

  // Upsert from targets
  for (const t of targets) {
    const nameKey = (t.name ?? "").trim();
    if (!nameKey) continue;
    const idx = result.findIndex(
      (m) => normName(m.name) === normName(nameKey)
    );
    if (idx === -1) {
      result.push({
        name: t.name,
        value: "",
        target: t.target ?? "",
        amber: t.amber ?? "",
        dir: t.dir || "higher",
        notes: "",
      });
    } else {
      result[idx] = {
        ...result[idx],
        name: t.name,
        target: t.target ?? "",
        amber: t.amber ?? "",
        dir: t.dir || "higher",
      };
    }
  }

  // Remove metrics that no longer exist in master targets (preserve SoS-only)
  return result.filter((m) => {
    const n = normName(m.name);
    if (n === SOS_ONLY_METRIC) return true;
    return targets.some((t) => normName(t.name) === n);
  });
}

/**
 * Ensure the SoS perf array has exactly one Current Period Variance row at the bottom.
 */
export function ensureSingleCPV(perf: TargetMetric[]): TargetMetric[] {
  const cpv = perf.filter((m) => normName(m.name) === SOS_ONLY_METRIC);
  const rest = perf.filter((m) => normName(m.name) !== SOS_ONLY_METRIC);
  const keep = cpv[0] ?? { value: "", notes: "" };
  return [
    ...rest,
    {
      name: "Current Period Variance",
      value: keep.value ?? "",
      target: "",
      amber: "",
      dir: "higher" as const,
      notes: keep.notes ?? "",
    },
  ];
}

/**
 * Propagate master targets to all four perf arrays.
 * Returns the updated perf arrays (does not mutate originals).
 */
export function propagateAll(
  targets: TargetMetric[],
  sosPerfIn: TargetMetric[],
  tacPerfIn: TargetMetric[],
  amPerfIn: TargetMetric[],
  pmPerfIn: TargetMetric[]
): {
  sosPerf: TargetMetric[];
  tacPerf: TargetMetric[];
  amPerf: TargetMetric[];
  pmPerf: TargetMetric[];
} {
  const sosPerf = ensureSingleCPV(propagateTargetsToArray(sosPerfIn, targets));
  const tacPerf = propagateTargetsToArray(tacPerfIn, targets);
  const amPerf  = propagateTargetsToArray(amPerfIn, targets);
  const pmPerf  = propagateTargetsToArray(pmPerfIn, targets);
  return { sosPerf, tacPerf, amPerf, pmPerf };
}
