"use client";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import PerfTable from "@/components/shared/PerfTable";
import {
  fetchTargetPeriods,
  fetchTargetsByPeriod,
  ensureTargetPeriod,
  autoSelectCurrentPeriod,
  saveTargetsForPeriod,
} from "@/lib/supabase";
import { listPeriodOptions } from "@/lib/railwayCalendar";
import type { TargetPeriod } from "@/lib/types";
import { CalendarCheck, Plus, RefreshCw, Save } from "lucide-react";
import TabHeader from "@/components/TabHeader";
import { Card, Field } from "@/components/ui";

export default function TargetsTab() {
  const {
    targets, updateTarget, addTarget, removeTarget,
    targetPeriods, activeTargetPeriodId,
    setTargets, setTargetPeriods, setActiveTargetPeriodId,
    showToast, supabaseReady,
  } = useStore();

  const [loading, setLoading] = useState(false);

  // Railway periods covering the previous 3 and next 15 months, so targets
  // can be populated ahead of time and auto-selected once the period arrives.
  const calendarOptions = useMemo(() => listPeriodOptions(), []);

  // Match calendar periods to their Supabase rows by canonical period_name.
  const periodByName = useMemo(() => {
    const map = new Map<string, TargetPeriod>();
    for (const p of targetPeriods) {
      if (!map.has(p.period_name)) map.set(p.period_name, p);
    }
    return map;
  }, [targetPeriods]);

  // Periods that exist in Supabase but sit outside the calendar window
  // (older data, or rows created before auto-naming) stay reachable.
  const legacyPeriods = useMemo(() => {
    const calendarNames = new Set(calendarOptions.map((o) => o.name));
    return targetPeriods.filter((p) => !calendarNames.has(p.period_name));
  }, [targetPeriods, calendarOptions]);

  // ─── Supabase: load periods ──────────────────────────────────────────────
  async function loadPeriods() {
    if (!supabaseReady) return;
    setLoading(true);
    try {
      const periods = await fetchTargetPeriods();
      setTargetPeriods(periods);
    } catch (e) {
      showToast("Failed to load periods");
    } finally {
      setLoading(false);
    }
  }

  // Auto-select the period containing today whenever the tab has no selection
  // (the app shell normally selects it at boot).
  useEffect(() => {
    if (!supabaseReady || activeTargetPeriodId) return;
    handleAutoSelect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseReady, activeTargetPeriodId]);

  async function handleAutoSelect() {
    setLoading(true);
    try {
      const { period, targets: t, periods } = await autoSelectCurrentPeriod();
      setTargetPeriods(periods);
      setActiveTargetPeriodId(period.id);
      if (t.length > 0) setTargets(t);
      else showToast("No targets saved for the current period yet — edit and save below");
    } catch {
      showToast("Failed to auto-select current period");
    } finally {
      setLoading(false);
    }
  }

  async function loadTargetsFor(periodId: string) {
    setActiveTargetPeriodId(periodId);
    const t = await fetchTargetsByPeriod(periodId);
    if (t.length > 0) setTargets(t);
    else showToast("No targets saved for this period yet — edit and save below");
  }

  async function handlePeriodChange(value: string) {
    if (!value) return;
    setLoading(true);
    try {
      if (value.startsWith("new:")) {
        // Calendar period without a Supabase row yet — create it on demand.
        const period = await ensureTargetPeriod(value.slice(4));
        await loadTargetsFor(period.id);
        loadPeriods();
      } else {
        await loadTargetsFor(value);
      }
    } catch {
      showToast("Failed to load targets for period");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveToSupabase() {
    if (!activeTargetPeriodId) { showToast("Select a period first"); return; }
    setLoading(true);
    try {
      await saveTargetsForPeriod(activeTargetPeriodId, targets);
      showToast("Targets saved to Supabase");
    } catch {
      showToast("Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <TabHeader
        tab="targets"
        subtitle="Edit targets and direction here; changes flow to every performance table. Value and notes stay per message."
      />

      <div className="stagger flex flex-col gap-4">
        {/* Supabase target periods */}
        {supabaseReady && (
          <Card
            title="Target period"
            subtitle="The railway period containing today is selected on load. Pick a future period to enter its targets ahead of time; it is selected automatically once its dates arrive."
            action={
              <button type="button" onClick={loadPeriods} disabled={loading} className="btn btn-ghost btn-sm" title="Reload the period list">
                {loading ? <span className="spinner" /> : <RefreshCw size={13} />} Refresh
              </button>
            }
          >
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Period" className="min-w-0 flex-1 basis-64">
                <select
                  value={activeTargetPeriodId ?? ""}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                  className="input cursor-pointer"
                >
                  <option value="">— Select period —</option>
                  <optgroup label="Railway periods (past 3 → next 15 months)">
                    {calendarOptions.map((o) => {
                      const row = periodByName.get(o.name);
                      return (
                        <option key={o.name} value={row?.id ?? `new:${o.name}`}>
                          {o.label}{o.isCurrent ? " — current" : ""}
                        </option>
                      );
                    })}
                  </optgroup>
                  {legacyPeriods.length > 0 && (
                    <optgroup label="Other periods">
                      {legacyPeriods.map((p) => (
                        <option key={p.id} value={p.id}>{p.period_name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </Field>
              <button type="button" onClick={handleAutoSelect} disabled={loading} className="btn">
                <CalendarCheck size={15} /> Back to current period
              </button>
              <button type="button" onClick={handleSaveToSupabase} disabled={!activeTargetPeriodId || loading} className="btn btn-primary">
                <Save size={15} /> Save targets to Supabase
              </button>
            </div>
          </Card>
        )}

        {/* Targets table */}
        <Card
          title="Metrics"
          subtitle="Amber is auto-calculated: 5% below target for higher-is-better metrics (Route / EMR / XC / GTR T3), 0.5% above target for lower-is-better metrics (EMR cancellations)."
          padded={false}
          action={
            <button type="button" onClick={addTarget} className="btn btn-sm">
              <Plus size={14} /> Add metric
            </button>
          }
        >
          <PerfTable
            metrics={targets}
            locked={false}
            onUpdate={updateTarget}
            onRemove={removeTarget}
          />
        </Card>
      </div>
    </>
  );
}
