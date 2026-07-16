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

/** What kind of figure to extract from a payload. */
export type ExtractKind = "t3" | "cancellations";

export interface RdmExtraction {
  /** Must match the metric name in Targets & Thresholds exactly
   *  (case/whitespace-insensitive) — same matching rule as target sync. */
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
  /** Path relative to the product base URL. Segments are encoded on request. */
  path: string;
  extract: RdmExtraction[];
}

// TOC codes and the route name below are the standard short codes used by NWR
// performance systems. If a source errors with 404/400, or returns data for
// the wrong operator, use the reference endpoints to list valid values:
//   /api/performance?probe=operators
//   /api/performance?probe=routes
// then correct the code here.
export const RDM_SOURCES: RdmSource[] = [
  {
    id: "route-east-midlands",
    path: "performanceData/RTOTM/route/East Midlands",
    extract: [{ metric: "Route T3 %", kind: "t3" }],
  },
  {
    id: "toc-emr",
    // ALL so a single call carries both the T-3 and cancellations figures.
    path: "performanceData/ALL/toc/EM",
    extract: [
      { metric: "EMR T3 %", kind: "t3" },
      { metric: "EMR Can %", kind: "cancellations" },
    ],
  },
  {
    id: "toc-gtr",
    path: "performanceData/RTOTM/toc/GTR",
    extract: [{ metric: "GTR T3 %", kind: "t3" }],
  },
  {
    id: "toc-xc",
    path: "performanceData/RTOTM/toc/XC",
    extract: [{ metric: "XC T3 %", kind: "t3" }],
  },
];

// ─── Shared response shape (server route ⇄ client poller) ────────────────────

export interface LiveMetricResult {
  metric: string;
  value: number | null;
  /** Dot path of the payload field the value came from (for transparency). */
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
