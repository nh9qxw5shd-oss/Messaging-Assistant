"use client";
import { useState, useRef } from "react";
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

const btnCls = "px-3 py-2 rounded text-sm font-semibold border transition-colors";

export default function TargetsTab() {
  const {
    targets, updateTarget, addTarget, removeTarget, resetTargets,
    targetPeriods, activeTargetPeriodId,
    setTargets, setTargetPeriods, setActiveTargetPeriodId,
    showToast, exportConfig, importConfig, backupNow, getBackups, restoreBackup,
    supabaseReady,
  } = useStore();

  const [loading, setLoading] = useState(false);
  const [newPeriodName, setNewPeriodName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cfgFileRef = useRef<HTMLInputElement>(null);

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

  // ─── Backups ────────────────────────────────────────────────────────────
  function handleBackupNow() {
    backupNow("manual");
    showToast("Backup saved");
  }

  function handleRestore() {
    const list = getBackups().slice().reverse();
    if (!list.length) { showToast("No backups found"); return; }
    const fmt = (ts: number) => new Date(ts).toLocaleString("en-GB");
    const menu = list.map((b, i) => `${i + 1}. ${fmt(b.ts)} (${b.reason})`).join("\n");
    const input = window.prompt(`Choose a backup (newest first):\n\n${menu}\n\nEnter number:`, "1");
    const n = Number(input);
    if (!n || n < 1 || n > list.length) return;
    if (window.confirm(`Restore backup from ${fmt(list[n - 1].ts)}?`)) {
      // Index in original (oldest-first) array
      restoreBackup(getBackups().length - n);
      showToast("Backup restored");
    }
  }

  // ─── Config import ───────────────────────────────────────────────────────
  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importConfig(reader.result as string);
        showToast("Config imported");
      } catch {
        showToast("Invalid config JSON");
      }
    };
    reader.readAsText(f);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-display font-semibold text-base text-ink mb-1">Targets & Thresholds</h3>
        <p className="text-xs text-muted">Edit target/amber/direction here — changes propagate to all performance tables. Value and notes are per-section.</p>
      </div>

      {/* Supabase target periods */}
      {supabaseReady && (
        <div className="rounded border border-grid bg-panel2 p-4 flex flex-col gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Target Periods (Supabase)</span>

          <div className="flex gap-2 flex-wrap">
            <select
              value={activeTargetPeriodId ?? ""}
              onChange={(e) => e.target.value && handlePeriodSelect(e.target.value)}
              className="flex-1 min-w-0 rounded bg-panel border border-grid px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
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
              className="flex-1 rounded bg-panel border border-grid px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent placeholder:text-muted/60"
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
        <button
          onClick={() => { if (window.confirm("Reset targets to defaults?")) resetTargets(); }}
          className={clsx(btnCls, "bg-bad/10 text-bad border-bad/30 hover:bg-bad/20")}
        >
          Reset defaults
        </button>
      </div>

      {/* Config + Backup */}
      <div className="border-t border-grid/60 pt-4 flex flex-col gap-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Config & Backups</span>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportConfig} className={clsx(btnCls, "bg-panel border-grid text-ink hover:border-accent/50")}>
            Export config
          </button>
          <button onClick={() => cfgFileRef.current?.click()} className={clsx(btnCls, "bg-panel border-grid text-ink hover:border-accent/50")}>
            Import config
          </button>
          <input ref={cfgFileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          <button onClick={handleBackupNow} className={clsx(btnCls, "bg-panel border-grid text-ink hover:border-accent/50")}>
            Backup now
          </button>
          <button onClick={handleRestore} className={clsx(btnCls, "bg-panel border-grid text-ink hover:border-accent/50")}>
            Restore backup…
          </button>
        </div>
      </div>
    </div>
  );
}
