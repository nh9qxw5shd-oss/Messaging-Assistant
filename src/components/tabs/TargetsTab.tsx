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
import clsx from "clsx";

const btnCls = "px-3 py-2 rounded font-semibold border transition-colors";

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
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-display font-semibold text-base text-ink mb-1">Targets & Thresholds</h3>
        <p className="text-muted">Edit target/direction here — changes propagate to all performance tables. The amber threshold is auto-calculated: 5% below target for higher-is-better metrics (Route/EMR/XC/GTR T3), 0.5% above target for lower-is-better metrics (EMR Cancellations). Value and notes are per-section.</p>
      </div>

      {/* Supabase target periods */}
      {supabaseReady && (
        <div className="rounded border border-grid bg-panel2 p-4 flex flex-col gap-3">
          <h4 className="font-sans font-semibold text-ink/80 mb-0">Target Periods</h4>
          <p className="text-muted text-sm mb-0">
            The railway period containing today is selected automatically on load.
            Pick a future period to enter its targets ahead of time — it will be
            auto-selected once its dates arrive.
          </p>

          <div className="flex gap-2 flex-wrap">
            <select
              value={activeTargetPeriodId ?? ""}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="flex-1 min-w-0 rounded bg-panel border border-grid px-3 py-2 text-ink focus:outline-none focus:border-accent"
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
            <button onClick={loadPeriods} disabled={loading} className={clsx(btnCls, "bg-panel border-grid text-ink hover:border-accent/50")}>
              Refresh
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={handleAutoSelect} disabled={loading} className={clsx(btnCls, "bg-panel border-grid text-ink hover:border-accent/50 disabled:opacity-40")}>
              Back to current period
            </button>
            <button onClick={handleSaveToSupabase} disabled={!activeTargetPeriodId || loading} className={clsx(btnCls, "bg-accent text-white border-accent/80 hover:bg-accent-dim disabled:opacity-40 shadow-orange-glow-sm")}>
              Save targets to Supabase
            </button>
          </div>
        </div>
      )}

      {/* Targets table */}
      <PerfTable
        metrics={targets}
        locked={false}
        onUpdate={updateTarget}
        onRemove={removeTarget}
      />

      {/* Table actions */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={addTarget} className={clsx(btnCls, "bg-panel border-grid text-ink hover:border-accent/50")}>
          + Add metric
        </button>
      </div>
    </div>
  );
}
