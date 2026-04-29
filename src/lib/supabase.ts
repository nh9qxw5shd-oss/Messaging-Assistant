import { createClient } from "@supabase/supabase-js";
import type {
  TargetPeriod,
  SupabaseTarget,
  SeasonalTemplate,
  TargetMetric,
} from "./types";

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

export async function fetchActiveTargets(): Promise<TargetMetric[]> {
  // Find active period
  const { data: periods, error: pe } = await client()
    .from("ma_target_periods")
    .select("id")
    .eq("is_active", true)
    .limit(1);
  if (pe) throw pe;
  if (!periods || periods.length === 0) return [];

  const periodId = periods[0].id;

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
  // Deactivate all, then activate chosen
  await client().from("ma_target_periods").update({ is_active: false }).neq("id", "none");
  await client().from("ma_target_periods").update({ is_active: true }).eq("id", periodId);
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
