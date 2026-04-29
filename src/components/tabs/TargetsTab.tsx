"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import PerfTable from "@/components/shared/PerfTable";
import {
  fetchTargetPeriods,
  fetchTargetsByPeriod,
  createTargetPeriod,
  setActivePeriod,
  saveTargetsForPeriod,
} from "@/lib/supabase";
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
  const [newPeriodName, setNewPeriodName] = useState("");

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

  async function handlePeriodSelect(periodId: string) {
    setActiveTargetPeriodId(periodId);
    setLoading(true);
    try {
      const t = await fetchTargetsByPeriod(periodId);
      if (t.length > 0) setTargets(t);
    } catch {
      showToast("Failed to load targets for period");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetActive() {
    if (!activeTargetPeriodId) return;
    try {
      await setActivePeriod(activeTargetPeriodId);
      showToast("Active period updated");
      loadPeriods();
    } catch {
      showToast("Failed to set active period");
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

  async function handleCreatePeriod() {
    if (!newPeriodName.trim()) return;
    setLoading(true);
    try {
      await createTargetPeriod(newPeriodName.trim());
      setNewPeriodName("");
      loadPeriods();
      showToast("Period created");
    } catch {
      showToast("Failed to create period");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-display font-semibold text-base text-ink mb-1">Targets & Thresholds</h3>
        <p className="text-muted">Edit target/amber/direction here — changes propagate to all performance tables. Value and notes are per-section.</p>
      </div>

      {/* Supabase target periods */}
      {supabaseReady && (
        <div className="rounded border border-grid bg-panel2 p-4 flex flex-col gap-3">
          <h4 className="font-sans font-semibold text-ink/80 mb-0">Target Periods</h4>

          <div className="flex gap-2 flex-wrap">
            <select
              value={activeTargetPeriodId ?? ""}
              onChange={(e) => e.target.value && handlePeriodSelect(e.target.value)}
              className="flex-1 min-w-0 rounded bg-panel border border-grid px-3 py-2 text-ink focus:outline-none focus:border-accent"
            >
              <option value="">— Select period —</option>
              {targetPeriods.map((p: TargetPeriod) => (
                <option key={p.id} value={p.id}>
                  {p.period_name}{p.is_active ? " ✓ active" : ""}
                </option>
              ))}
            </select>
            <button onClick={loadPeriods} disabled={loading} className={clsx(btnCls, "bg-panel border-grid text-ink hover:border-accent/50")}>
              Refresh
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={handleSetActive} disabled={!activeTargetPeriodId || loading} className={clsx(btnCls, "bg-panel border-grid text-ink hover:border-accent/50 disabled:opacity-40")}>
              Set as active
            </button>
            <button onClick={handleSaveToSupabase} disabled={!activeTargetPeriodId || loading} className={clsx(btnCls, "bg-accent text-white border-accent/80 hover:bg-accent-dim disabled:opacity-40 shadow-orange-glow-sm")}>
              Save targets to Supabase
            </button>
          </div>

          <div className="flex gap-2 items-center pt-1 border-t border-grid/60">
            <input
              type="text"
              value={newPeriodName}
              onChange={(e) => setNewPeriodName(e.target.value)}
              placeholder="e.g. Period 12 2025/26"
              className="flex-1 rounded bg-panel border border-grid px-3 py-2 text-ink focus:outline-none focus:border-accent placeholder:text-muted/60"
            />
            <button onClick={handleCreatePeriod} disabled={!newPeriodName.trim() || loading} className={clsx(btnCls, "bg-panel border-grid text-ink hover:border-accent/50 disabled:opacity-40")}>
              + Create period
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
