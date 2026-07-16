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

export interface OperatorRef {
  tocCode: string;
  desc: string;
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

/** One operator's T-3 within the route, matched by description or exact code. */
export function aggregateTocT3(payload: unknown, tocMatch: RegExp): AggregateResult {
  const blocks: Punctuality[] = [];
  for (const s of stanoxes(payload)) {
    const ops = Array.isArray(s.operators) ? (s.operators as unknown[]) : [];
    for (const op of ops) {
      const { desc, tocCode } = (op ?? {}) as { desc?: unknown; tocCode?: unknown };
      const matches =
        (typeof desc === "string" && tocMatch.test(desc)) ||
        (typeof tocCode === "string" && tocMatch.test(tocCode));
      if (!matches) continue;
      const p = punctuality(op);
      if (p) blocks.push(p);
    }
  }
  if (blocks.length === 0) {
    const seen = listOperators(payload).map((o) => `${o.tocCode}=${o.desc}`).join(", ") || "none";
    return {
      value: null,
      detail: null,
      error: `operator ${tocMatch} not in route payload (operators present: ${seen})`,
    };
  }
  return aggregate(blocks, String(tocMatch));
}

/** All operators seen anywhere in the payload, unique by tocCode. */
export function listOperators(payload: unknown): OperatorRef[] {
  const found = new Map<string, OperatorRef>();
  const add = (op: unknown) => {
    const { tocCode, desc } = (op ?? {}) as { tocCode?: unknown; desc?: unknown };
    if (typeof tocCode === "string" && !found.has(tocCode)) {
      found.set(tocCode, { tocCode, desc: typeof desc === "string" ? desc : "" });
    }
  };
  const top = (payload as { operatorList?: unknown })?.operatorList;
  if (Array.isArray(top)) top.forEach(add);
  for (const s of stanoxes(payload)) {
    if (Array.isArray(s.operators)) (s.operators as unknown[]).forEach(add);
  }
  return [...found.values()];
}

/** Resolve an operator's numeric TOC code from the route payload. */
export function resolveTocCode(payload: unknown, tocMatch: RegExp): string | null {
  const hit = listOperators(payload).find(
    (o) => tocMatch.test(o.desc) || tocMatch.test(o.tocCode)
  );
  return hit?.tocCode ?? null;
}
