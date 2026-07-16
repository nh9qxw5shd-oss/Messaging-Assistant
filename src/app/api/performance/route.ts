import { NextRequest, NextResponse } from "next/server";
import {
  RDM_DEFAULT_BASE,
  RDM_SOURCES,
  SERVER_CACHE_TTL_MS,
  type LiveMetricResult,
  type LivePerfResponse,
} from "@/lib/rdm/config";
import { extractValue } from "@/lib/rdm/parse";

// The RDM key must stay server-side; this handler is the only place it is used.
export const dynamic = "force-dynamic";

const FETCH_TIMEOUT_MS = 15_000;

function apiBase(): string {
  return (process.env.RDM_API_BASE || RDM_DEFAULT_BASE).replace(/\/+$/, "");
}

/** Encode each path segment (route names contain spaces) without touching "/". */
function encodePath(path: string): string {
  return path
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

async function rdmGet(path: string, apiKey: string): Promise<unknown> {
  const url = `${apiBase()}/${encodePath(path)}`;
  const res = await fetch(url, {
    headers: { "x-apikey": apiKey, accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 200);
    throw new Error(`HTTP ${res.status} from ${path}${body ? ` — ${body}` : ""}`);
  }
  return res.json();
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

  // ── Debug: probe an arbitrary reference endpoint of the product ────────────
  // e.g. /api/performance?probe=operators  or  ?probe=routes
  // Lets you list valid TOC codes / route names without leaving the browser.
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

  await Promise.all(
    RDM_SOURCES.map(async (source) => {
      try {
        const payload = await rdmGet(source.path, apiKey);
        if (raw) rawPayloads[source.id] = payload;
        for (const ex of source.extract) {
          const { value, path, error } = extractValue(payload, ex.kind, ex.pick);
          metrics.push({ metric: ex.metric, value, fieldPath: path, error });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${source.id}: ${msg}`);
        for (const ex of source.extract) {
          metrics.push({ metric: ex.metric, value: null, fieldPath: null, error: msg });
        }
      }
    })
  );

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
