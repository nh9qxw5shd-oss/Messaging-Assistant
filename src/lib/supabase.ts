import { createClient } from "@supabase/supabase-js";
import type {
  TargetPeriod,
  SupabaseTarget,
  SeasonalTemplate,
  TargetMetric,
  MessageSnapshot,
} from "./types";
import { currentPeriodName } from "./railwayCalendar";

// ─── Client ───────────────────────────────────────────────────────────────────

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = url && key ? createClient(url, key) : null;

function client() {
  if (!supabase) throw new Error("Supabase not configured — check .env.local");
  return supabase;
}

// ─── Target periods ───────────────────────────────────────────────────────────

export async function fetchTargetPeriods(): Promise<TargetPeriod[]> {
  const { data, error } = await client()
    .from("ma_target_periods")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TargetPeriod[];
}

export async function fetchTargetsByPeriod(periodId: string): Promise<TargetMetric[]> {
  const { data, error } = await client()
    .from("ma_targets")
    .select("*")
    .eq("period_id", periodId)
    .order("sort_order", { ascending: true });
  if (error) throw error;

  return ((data ?? []) as SupabaseTarget[]).map((row) => ({
    name:   row.name,
    value:  "",
    target: row.target ?? "",
    amber:  row.amber ?? "",
    dir:    row.dir,
    notes:  "",
  }));
}

export async function createTargetPeriod(name: string): Promise<TargetPeriod> {
  const { data, error } = await client()
    .from("ma_target_periods")
    .insert({ period_name: name, is_active: false })
    .select()
    .single();
  if (error) throw error;
  return data as TargetPeriod;
}

export async function setActivePeriod(periodId: string): Promise<void> {
  // Deactivate all, then activate chosen. The previous implementation
  // filtered the deactivation with .neq("id", "none") — Postgres rejects
  // "none" as a uuid and the unchecked error left every previously
  // activated period latched with is_active = true.
  const { error: deactivateError } = await client()
    .from("ma_target_periods")
    .update({ is_active: false })
    .eq("is_active", true);
  if (deactivateError) throw deactivateError;

  const { error: activateError } = await client()
    .from("ma_target_periods")
    .update({ is_active: true })
    .eq("id", periodId);
  if (activateError) throw activateError;
}

/** Find a period by its canonical name, creating it if it doesn't exist yet. */
export async function ensureTargetPeriod(name: string): Promise<TargetPeriod> {
  const { data, error } = await client()
    .from("ma_target_periods")
    .select("*")
    .eq("period_name", name)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  if (data && data.length > 0) return data[0] as TargetPeriod;
  return createTargetPeriod(name);
}

/**
 * Auto-select the railway period containing today (per the Insight railway
 * calendar): ensure its row exists, make it the single active period, and
 * return it with its targets and the refreshed period list.
 */
export async function autoSelectCurrentPeriod(today: Date = new Date()): Promise<{
  period: TargetPeriod;
  targets: TargetMetric[];
  periods: TargetPeriod[];
}> {
  const period = await ensureTargetPeriod(currentPeriodName(today));
  await setActivePeriod(period.id);
  const [targets, periods] = await Promise.all([
    fetchTargetsByPeriod(period.id),
    fetchTargetPeriods(),
  ]);
  return { period: { ...period, is_active: true }, targets, periods };
}

export async function saveTargetsForPeriod(
  periodId: string,
  targets: TargetMetric[]
): Promise<void> {
  // Delete existing targets for period, then insert fresh
  await client().from("ma_targets").delete().eq("period_id", periodId);
  if (targets.length === 0) return;

  const rows = targets.map((t, i) => ({
    period_id:  periodId,
    name:       t.name,
    target:     t.target === "" ? null : Number(t.target),
    amber:      t.amber  === "" ? null : Number(t.amber),
    dir:        t.dir,
    sort_order: i,
  }));

  const { error } = await client().from("ma_targets").insert(rows);
  if (error) throw error;
}

// ─── Message snapshots ────────────────────────────────────────────────────────

/**
 * Reference implementation of the Insight read contract
 * (see docs/message-snapshots/SPEC.md): all snapshots whose metrics describe
 * the given date, in slot order.
 */
export async function fetchSnapshotsForMetricsDate(
  dateISO: string
): Promise<MessageSnapshot[]> {
  const { data, error } = await client()
    .from("ma_message_snapshots")
    .select("*")
    .eq("metrics_for_date", dateISO)
    .order("snapshot_date", { ascending: true })
    .order("slot", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MessageSnapshot[];
}

// ─── Seasonal templates ───────────────────────────────────────────────────────

export async function fetchSeasonalTemplates(
  tab?: "sos" | "tactical"
): Promise<SeasonalTemplate[]> {
  let query = client()
    .from("ma_seasonal_templates")
    .select("*")
    .eq("is_active", true)
    .order("season", { ascending: true });

  if (tab) query = query.eq("tab", tab);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SeasonalTemplate[];
}

export async function upsertSeasonalTemplate(
  template: Omit<SeasonalTemplate, "id" | "created_at">
): Promise<void> {
  const { error } = await client()
    .from("ma_seasonal_templates")
    .upsert(template, { onConflict: "season,tab" });
  if (error) throw error;
}
