// ─── 05:30 Start of Service — weather block from the NR Route 7 Day Forecast ──
//
// DLog2 parses the forecast PDF each morning and writes it to the shared
// Supabase project (weather_forecasts / weather_forecast_days). This module
// reads the latest issue and renders the three SoS weather fields in the
// established message format, so the operator fills them with one click and
// can still edit the text before building.

import { supabase } from "../supabase";
import {
  FORECAST_AREAS,
  HAZARD_LABEL,
  HAZARD_RANK,
  type ForecastAreaKey,
  type HazardLevel,
  type RiskLevel,
} from "./forecastTypes";

export interface RouteForecastDay {
  areaKey: ForecastAreaKey | string;
  areaName: string;
  dayIndex: number;
  date: string;
  dayName: string | null;
  overallLevel: HazardLevel;
  risks: Partial<Record<string, RiskLevel>>;
  maxTemp: number | null;
  minTempMorning: number | null;
  minTempNight: number | null;
  iceDay: boolean | null;
}

export interface RouteForecast {
  id: string;
  issuedAt: string;
  issuedBy: string | null;
  validFromDate: string;
  summary24h: string | null;
  summary2to7: string | null;
  days: RouteForecastDay[];
}

export function londonToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}

/** Latest forecast issue in the shared store, or null when none / not configured. */
export async function fetchLatestRouteForecast(): Promise<RouteForecast | null> {
  if (!supabase) throw new Error("Supabase not configured — check .env.local");
  const { data: issue, error } = await supabase
    .from("weather_forecasts")
    .select("id, issued_at, issued_by, valid_from_date, summary_24h, summary_2_7")
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!issue) return null;
  const { data: rows, error: dayErr } = await supabase
    .from("weather_forecast_days")
    .select("area_key, area_name, day_index, forecast_date, day_name, overall_level, risks, max_temp, min_temp_morning, min_temp_night, ice_day")
    .eq("forecast_id", issue.id)
    .order("day_index");
  if (dayErr) throw dayErr;
  const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
  return {
    id: issue.id,
    issuedAt: issue.issued_at,
    issuedBy: issue.issued_by,
    validFromDate: issue.valid_from_date,
    summary24h: issue.summary_24h,
    summary2to7: issue.summary_2_7,
    days: (rows ?? []).map((r) => ({
      areaKey: r.area_key,
      areaName: r.area_name,
      dayIndex: r.day_index,
      date: r.forecast_date,
      dayName: r.day_name,
      overallLevel: (r.overall_level as HazardLevel) ?? "GREEN",
      risks: (r.risks ?? {}) as Partial<Record<string, RiskLevel>>,
      maxTemp: num(r.max_temp),
      minTempMorning: num(r.min_temp_morning),
      minTempNight: num(r.min_temp_night),
      iceDay: r.ice_day,
    })),
  };
}

// ─── Rendering ────────────────────────────────────────────────────────────────

const LEVEL_EMOJI: Record<HazardLevel, string> = {
  GREEN: "🟢",
  AWARE: "🟡",
  ADVERSE: "🟠",
  EXTREME: "🔴",
};

/** Label used in the message for each area (long form for the risk lines). */
const AREA_LINE_LABEL: Record<string, string> = {
  lincolnshire: "Lincolnshire",
  em_north: "East Midlands North",
  em_south: "East Midlands South",
  london_luton: "London - Luton",
};

/** Shorter label for the temperature line. */
const AREA_TEMP_LABEL: Record<string, string> = {
  lincolnshire: "Lincolnshire",
  em_north: "EM North",
  em_south: "EM South",
  london_luton: "London - Luton",
};

function fmtTemp(n: number | null): string {
  return n === null || isNaN(n) ? "–" : n.toFixed(1);
}

/** "_AWARE_ Max Temp, Lightning" — grouped by level, worst first. */
export function riskPhrase(risks: Partial<Record<string, RiskLevel>>): string {
  const byLevel: Record<RiskLevel, string[]> = { EXTREME: [], ADVERSE: [], AWARE: [] };
  for (const [risk, level] of Object.entries(risks)) {
    if (level) byLevel[level].push(risk);
  }
  const parts: string[] = [];
  for (const level of ["EXTREME", "ADVERSE", "AWARE"] as RiskLevel[]) {
    if (byLevel[level].length) parts.push(`_${level}_ ${byLevel[level].join(", ")}`);
  }
  return parts.join("; ");
}

export interface SosWeatherText {
  weather: string;
  maxtemps: string;
  forecast: string;
  /** which forecast date was used as "today" */
  forDate: string;
  notes: string[];
}

/**
 * Build the three SoS weather fields for `today` from a forecast issue. The
 * first row of each area table is the forecast's own "today"; when the issue is
 * from an earlier day the matching date is used instead and a note is added.
 */
export function buildSosWeather(fc: RouteForecast, today: string = londonToday()): SosWeatherText {
  const notes: string[] = [];
  let forDate = today;
  let todays = fc.days.filter((d) => d.date === today);
  if (!todays.length) {
    todays = fc.days.filter((d) => d.dayIndex === 0);
    forDate = todays[0]?.date ?? fc.validFromDate;
    notes.push(`The stored forecast has no row for ${today}; its first day (${forDate}) was used.`);
  }
  if (fc.validFromDate !== today) {
    notes.push(`Forecast issued ${fc.issuedAt.slice(0, 10)} (valid from ${fc.validFromDate}) — not today's issue.`);
  }

  const byArea = new Map<string, RouteForecastDay>();
  for (const d of todays) byArea.set(d.areaKey, d);

  const areaKeys: string[] = FORECAST_AREAS.map((a) => a.key);
  for (const d of todays) if (!areaKeys.includes(d.areaKey)) areaKeys.push(d.areaKey);

  const riskLines: string[] = [];
  const tempParts: string[] = [];
  for (const key of areaKeys) {
    const d = byArea.get(key);
    const label = AREA_LINE_LABEL[key] ?? d?.areaName ?? key;
    if (!d) {
      riskLines.push(`⚪ - ${label} - no forecast row`);
      continue;
    }
    let worst: HazardLevel = "GREEN";
    for (const lvl of Object.values(d.risks)) {
      if (lvl && HAZARD_RANK[lvl] > HAZARD_RANK[worst]) worst = lvl;
    }
    const phrase = worst === "GREEN" ? HAZARD_LABEL.GREEN : riskPhrase(d.risks);
    riskLines.push(`${LEVEL_EMOJI[worst]} - ${label} - ${phrase}`);
    tempParts.push(`${AREA_TEMP_LABEL[key] ?? label} - Max ${fmtTemp(d.maxTemp)} Min ${fmtTemp(d.minTempNight)}`);
  }

  return {
    weather: riskLines.join("\n"),
    maxtemps: tempParts.join(" / "),
    forecast: (fc.summary24h ?? "").trim(),
    forDate,
    notes,
  };
}

export function describeIssue(fc: RouteForecast): string {
  const when = new Date(fc.issuedAt).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `issued ${when}${fc.issuedBy ? ` by ${fc.issuedBy}` : ""}`;
}
