import type { ExtractKind } from "./config";

// ─── Value extraction from RDM payloads ───────────────────────────────────────
//
// The RDM product spec isn't publicly documented, so field names are matched
// tolerantly by key name rather than hard-coded to one schema. Every result
// carries the dot path it was read from, so a wrong match is visible in the
// UI / ?raw=1 output and can be pinned down with an explicit `pick` path in
// config.ts.

/** Key-name patterns per extraction kind, tried in order — first pattern that
 *  matches anywhere in the payload wins. Most-specific first. */
const KEY_PATTERNS: Record<ExtractKind, RegExp[]> = {
  t3: [
    /^t[-_]?3(pct|percent(age)?)?$/i,
    /^time[-_]?to[-_]?3(mins?|minutes)?(pct|percent(age)?)?$/i,
    /^within[-_]?3(mins?|minutes)?(pct|percent(age)?)?$/i,
    /t[-_]?3/i,
  ],
  cancellations: [
    /^cancel(led|lation)?s?(pct|percent(age)?)?$/i,
    /cancel.*(pct|percent)/i,
    /cancel/i,
  ],
};

/** Coerce payload values like 78.4, "78.4" or "78.4%" to a number. */
function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/%\s*$/, "").trim());
    if (v.trim() !== "" && Number.isFinite(n)) return n;
  }
  return null;
}

function isPercentLike(n: number): boolean {
  return n >= 0 && n <= 100;
}

interface Found {
  value: number;
  path: string;
}

/** Keys that hold the percentage inside a matched sub-object, in preference
 *  order — RDM blocks look like { count, percent, rollingPercent, trend }. */
const PERCENT_SUBKEYS = ["percent", "percentage", "pct", "value"];

/** Depth-first walk collecting every numeric leaf whose key matches `re`.
 *  A matching key holding an object (e.g. timeTo3: {count, percent}) yields
 *  its percentage subfield instead. */
function collectMatches(node: unknown, re: RegExp, path: string, out: Found[]): void {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectMatches(item, re, `${path}.${i}`, out));
    return;
  }
  for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
    const childPath = path ? `${path}.${key}` : key;
    const n = toNumber(val);
    if (re.test(key) && n !== null && isPercentLike(n)) {
      out.push({ value: n, path: childPath });
      continue;
    }
    if (re.test(key) && val !== null && typeof val === "object" && !Array.isArray(val)) {
      for (const sub of PERCENT_SUBKEYS) {
        const p = toNumber((val as Record<string, unknown>)[sub]);
        if (p !== null && isPercentLike(p)) {
          out.push({ value: p, path: `${childPath}.${sub}` });
          break;
        }
      }
      // fall through and recurse too — a deeper exact match may also exist
    }
    collectMatches(val, re, childPath, out);
  }
}

/** Read a value at an explicit dot path, e.g. "performanceData.0.t3". */
export function readPath(payload: unknown, dotPath: string): number | null {
  let node: unknown = payload;
  for (const seg of dotPath.split(".")) {
    if (node === null || typeof node !== "object") return null;
    node = (node as Record<string, unknown>)[seg];
  }
  return toNumber(node);
}

/**
 * Locate the figure for `kind` inside an RDM payload.
 * Returns the value and the dot path it was found at, or an explanation of
 * why nothing matched. Never guesses across kinds — if no key matches, the
 * value stays null so a wrong field is never silently used.
 */
export function extractValue(
  payload: unknown,
  kind: ExtractKind,
  pick?: string
): { value: number | null; path: string | null; error: string | null } {
  if (pick) {
    const v = readPath(payload, pick);
    if (v === null) {
      return { value: null, path: pick, error: `no numeric value at configured path "${pick}" (no live data yet?)` };
    }
    // The API uses -1 as a "no data" sentinel (e.g. rollingPercent overnight).
    if (!isPercentLike(v)) {
      return { value: null, path: pick, error: `value ${v} at "${pick}" is not a percentage (no live data yet?)` };
    }
    return { value: v, path: pick, error: null };
  }

  for (const re of KEY_PATTERNS[kind]) {
    const found: Found[] = [];
    collectMatches(payload, re, "", found);
    if (found.length > 0) {
      // Prefer an explicitly percentage-named key when several fields match.
      const pct = found.find((f) => /(pct|percent)/i.test(f.path.split(".").pop() ?? ""));
      const best = pct ?? found[0];
      return { value: best.value, path: best.path, error: null };
    }
  }
  return {
    value: null,
    path: null,
    error: `no "${kind}" field recognised in payload — check /api/performance?raw=1 and set a "pick" path in src/lib/rdm/config.ts`,
  };
}
