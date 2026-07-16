// ─── Aggregation over the RTOTM route payload ─────────────────────────────────
//
// performanceData/RTOTM/route/{route} returns per-station data:
//
//   {
//     performanceData: { stanoxes: [ {
//       stanox, desc, weighting,
//       RTOTM: { punctuality: { totalStops, timeTo3: { count, percent, ... }, ... } },
//       operators: [ { tocCode: "88", desc: "Greater Thameslink Railway",
//                      RTOTM: { punctuality: { ... } } } ]
//     } ] },
//     operatorList: [ { tocCode, desc } ]
//   }
//
// There is no route- or operator-level total in the payload, so T-3 figures
// are computed as stop-weighted aggregates: Σ timeTo3.count / Σ totalStops.
// That matches the per-station percentages (count ÷ stops), summed over
// whatever scope is asked for.

interface Punctuality {
  totalStops?: unknown;
  timeTo3?: { count?: unknown };
}

export interface AggregateResult {
  value: number | null;
  /** Human-readable provenance, e.g. "aggregate: 41/52 stops in T3 across 17 stanoxes". */
  detail: string | null;
  error: string | null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function stanoxes(payload: unknown): Record<string, unknown>[] {
  const list = (payload as { performanceData?: { stanoxes?: unknown } })
    ?.performanceData?.stanoxes;
  return Array.isArray(list) ? (list as Record<string, unknown>[]) : [];
}

function punctuality(node: unknown): Punctuality | null {
  const p = (node as { RTOTM?: { punctuality?: Punctuality } })?.RTOTM?.punctuality;
  return p && typeof p === "object" ? p : null;
}

function aggregate(blocks: Punctuality[], scope: string): AggregateResult {
  let stops = 0;
  let t3 = 0;
  let counted = 0;
  for (const p of blocks) {
    const s = num(p.totalStops);
    const c = num(p.timeTo3?.count);
    if (s !== null && c !== null && s > 0) {
      stops += s;
      t3 += c;
      counted++;
    }
  }
  if (stops === 0) {
    return { value: null, detail: null, error: `no stops recorded for ${scope} (no live services yet?)` };
  }
  return {
    value: Math.round((t3 / stops) * 1000) / 10,
    detail: `aggregate: ${t3}/${stops} stops in T3 across ${counted} stanoxes`,
    error: null,
  };
}

/** Whole-route T-3 from each stanox's own punctuality block. */
export function aggregateRouteT3(payload: unknown): AggregateResult {
  const blocks = stanoxes(payload)
    .map((s) => punctuality(s))
    .filter((p): p is Punctuality => p !== null);
  if (blocks.length === 0) {
    return { value: null, detail: null, error: "no stanox data in route payload (empty outside service hours?)" };
  }
  return aggregate(blocks, "route");
}

