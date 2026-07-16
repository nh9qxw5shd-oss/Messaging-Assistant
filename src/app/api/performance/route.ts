import { NextRequest, NextResponse } from "next/server";
import {
  RDM_DEFAULT_BASE,
  ROUTE_SOURCE,
  ROUTE_T3_METRIC,
  EXTRA_SOURCES,
  SERVER_CACHE_TTL_MS,
  type LiveMetricResult,
  type LivePerfResponse,
} from "@/lib/rdm/config";
import { extractValue } from "@/lib/rdm/parse";
import { aggregateRouteT3 } from "@/lib/rdm/aggregate";

// The RDM key must stay server-side; this handler is the only place it is used.
export const dynamic = "force-dynamic";
// Sources are fetched sequentially with retry, so allow more than the default.
export const maxDuration = 30;

const FETCH_TIMEOUT_MS = 8_000;
// The RDM gateway enforces spike arrest at 4 requests/second, smoothed to one
// request per 250ms — concurrent calls get HTTP 429. Space requests out and
// retry 429s (and one transient 5xx) after a pause.
const SPIKE_GAP_MS = 350;
const RETRY_DELAYS_MS = [700, 1500];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function apiBase(): string {
  return (process.env.RDM_API_BASE || RDM_DEFAULT_BASE).replace(/\/+$/, "");
}

/** Encode each path segment without touching "/". */
function encodePath(path: string): string {
  return path
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

async function rdmGet(path: string, apiKey: string): Promise<unknown> {
  const url = `${apiBase()}/${encodePath(path)}`;
  let retried5xx = false;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: { "x-apikey": apiKey, accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (res.ok) return res.json();
    const retryable =
      (res.status === 429 || (res.status >= 500 && !retried5xx)) &&
      attempt < RETRY_DELAYS_MS.length;
    if (retryable) {
      if (res.status >= 500) retried5xx = true;
      await sleep(RETRY_DELAYS_MS[attempt]);
      continue;
    }
    const body = (await res.text()).slice(0, 300);
    throw new Error(`HTTP ${res.status} from ${path}${body ? ` — ${body}` : ""}`);
  }
}

// Module-level cache: serves concurrent tabs/users within the TTL without
// re-hitting RDM. Best-effort on serverless (per warm instance), exact on a
// long-running `next start`.
let cached: { ts: number; body: LivePerfResponse } | null = null;

export async function GET(req: NextRequest) {
  const apiKey = process.env.RDM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "RDM_API_KEY is not set — add it to .env.local (see README, Live performance data)" },
      { status: 503 }
    );
  }

  const raw = req.nextUrl.searchParams.get("raw") === "1";
  const probe = req.nextUrl.searchParams.get("probe");

  // ── Debug: probe an arbitrary endpoint of the product ──────────────────────
  // e.g. /api/performance?probe=performanceData/RTOTM/toc/88
  if (probe) {
    if (probe.includes("..") || probe.includes("://") || probe.startsWith("/")) {
      return NextResponse.json({ error: "probe must be a relative path" }, { status: 400 });
    }
    try {
      return NextResponse.json({ probe, payload: await rdmGet(probe, apiKey) });
    } catch (err) {
      return NextResponse.json(
        { probe, error: err instanceof Error ? err.message : String(err) },
        { status: 502 }
      );
    }
  }

  if (!raw && cached && Date.now() - cached.ts < SERVER_CACHE_TTL_MS) {
    return NextResponse.json(cached.body);
  }

  const metrics: LiveMetricResult[] = [];
  const errors: string[] = [];
  const rawPayloads: Record<string, unknown> = {};

  // ── 1. Route payload — feeds the whole-route T-3 aggregate ─────────────────
  try {
    const routePayload = await rdmGet(ROUTE_SOURCE.path, apiKey);
    if (raw) rawPayloads[ROUTE_SOURCE.id] = routePayload;
    const route = aggregateRouteT3(routePayload);
    metrics.push({
      metric: ROUTE_T3_METRIC,
      value: route.value,
      fieldPath: route.detail,
      error: route.error,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`${ROUTE_SOURCE.id}: ${msg}`);
    metrics.push({ metric: ROUTE_T3_METRIC, value: null, fieldPath: null, error: msg });
  }

  // ── 2. Whole-TOC sources (T-3 and cancellations per operator) ──────────────
  for (const source of EXTRA_SOURCES) {
    await sleep(SPIKE_GAP_MS);
    try {
      const payload = await rdmGet(source.path, apiKey);
      if (raw) rawPayloads[source.id] = payload;
      for (const ex of source.extract) {
        const { value, path: fieldPath, error } = extractValue(payload, ex.kind, ex.pick);
        metrics.push({ metric: ex.metric, value, fieldPath, error });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${source.id}: ${msg}`);
      for (const ex of source.extract) {
        metrics.push({ metric: ex.metric, value: null, fieldPath: null, error: msg });
      }
    }
  }

  const body: LivePerfResponse = {
    updatedAt: new Date().toISOString(),
    metrics,
    errors,
  };

  if (raw) {
    return NextResponse.json({ ...body, rawPayloads });
  }

  cached = { ts: Date.now(), body };
  return NextResponse.json(body);
}
