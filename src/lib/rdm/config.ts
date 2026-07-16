// ─── NWR Realtime Performance Data (Rail Data Marketplace) configuration ──────
//
// The live feed behind /api/performance. Everything site-specific lives here:
// which endpoints we call, which metric each value feeds, and how the value is
// located inside the response payload.
//
// The API key is server-side only — set RDM_API_KEY in .env.local (and in the
// Vercel project settings for the deployed app). Never expose it with a
// NEXT_PUBLIC_ prefix.

/** Base URL of the RDM data product. Override with RDM_API_BASE if the
 *  product URL changes (e.g. a new major version is published). */
export const RDM_DEFAULT_BASE =
  "https://api1.raildata.org.uk/1033-realtime-performance-data-experience-api---performance-datav4_0";

/** How often the client polls while the app is open. */
export const POLL_INTERVAL_MS = 2 * 60 * 1000;

/** Server-side cache TTL — repeated requests within this window (extra tabs,
 *  multiple users) are served from memory instead of re-hitting RDM. */
export const SERVER_CACHE_TTL_MS = 60 * 1000;

// ─── Route payload (primary source) ──────────────────────────────────────────
//
// One call supplies all four T-3 figures. The payload is a per-station
// (stanox) breakdown with per-operator splits — no ready-made totals — so
// route and TOC T-3 are computed as stop-weighted aggregates in aggregate.ts.
//
// Route names use underscores: "East_Midlands" (spaces make the backend 500).

export const ROUTE_SOURCE = {
  id: "route-east-midlands",
  path: "performanceData/RTOTM/route/East_Midlands",
};

/** Metric fed by the whole-route aggregate. Metric names must match Targets &
 *  Thresholds exactly (case/whitespace-insensitive) — same rule as target sync. */
export const ROUTE_T3_METRIC = "Route T3 %";

/** Metrics fed by per-operator aggregates of the same route payload. Operators
 *  are matched by their numeric business code (confirmed: 27 = CrossCountry,
 *  28 = East Midlands Railway, 88 = Thameslink/GTR), with the description
 *  regex as a fallback in case a code ever changes. */
export const TOC_T3_METRICS: { metric: string; tocCode: string; tocMatch: RegExp }[] = [
  { metric: "EMR T3 %", tocCode: "28", tocMatch: /east\s*midlands/i },
  { metric: "GTR T3 %", tocCode: "88", tocMatch: /thameslink/i },
  { metric: "XC T3 %", tocCode: "27", tocMatch: /cross\s*country/i },
];

// ─── Additional sources ──────────────────────────────────────────────────────

/** What kind of figure to extract from a payload. */
export type ExtractKind = "t3" | "cancellations";

export interface RdmExtraction {
  metric: string;
  kind: ExtractKind;
  /**
   * Optional explicit location of the value inside the payload, as a dot path
   * (array indices as numbers), e.g. "performanceData.0.t3Percentage".
   * When set it bypasses the key-name scan in parse.ts. Use
   * /api/performance?raw=1 to inspect the real payload and fill this in if
   * the automatic scan picks the wrong field.
   */
  pick?: string;
}

export interface RdmSource {
  /** Short id used in error messages and ?raw=1 output. */
  id: string;
  /** Path relative to the product base URL. Segments are encoded on request.
   *  May contain "{tocCode}", resolved via tocMatch. */
  path: string;
  /** When path contains "{tocCode}": the operator (by description) whose
   *  numeric code — discovered from the route payload's operator list — fills
   *  the placeholder. TOC codes are numeric business codes (88 = GTR), so
   *  they're resolved at runtime rather than hard-coded. */
  tocMatch?: RegExp;
  extract: RdmExtraction[];
}

// Cancellations are not part of the RTOTM data type — they're expected in the
// PPM data for the operator. The PPM payload schema is unverified (empty
// overnight when this was wired up); if the value doesn't appear, check
// /api/performance?raw=1 during service hours and adjust `kind`/`pick`, or
// switch the path to the RT data type.
export const EXTRA_SOURCES: RdmSource[] = [
  {
    id: "emr-cancellations",
    path: "performanceData/PPM/toc/28", // 28 = East Midlands Railway
    extract: [{ metric: "EMR Can %", kind: "cancellations" }],
  },
];

// ─── Shared response shape (server route ⇄ client poller) ────────────────────

export interface LiveMetricResult {
  metric: string;
  value: number | null;
  /** Where the value came from: a payload dot path, or an aggregate summary. */
  fieldPath: string | null;
  /** Why the value is null, when it is. */
  error: string | null;
}

export interface LivePerfResponse {
  updatedAt: string; // ISO timestamp of the fetch
  metrics: LiveMetricResult[];
  /** Source-level failures (network / HTTP errors), one line per source. */
  errors: string[];
}
