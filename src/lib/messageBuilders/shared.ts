import type { MetaState } from "../types";

export function formatMeta(meta: MetaState): string {
  const stamp = meta.stamp
    ? ` | Report: ${new Date(meta.stamp).toLocaleString("en-GB")}`
    : "";
  return `Route: ${meta.route}${stamp}`;
}
