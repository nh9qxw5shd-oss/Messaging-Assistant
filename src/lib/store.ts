import { create } from "zustand";
import type {
  MetaState,
  SoSState,
  StrategicAMState,
  StrategicPMState,
  TacticalState,
  SafetyIncidentState,
  TargetMetric,
  TabKey,
  BackupEntry,
  SessionState,
  TargetPeriod,
  SeasonalTemplate,
} from "./types";
import {
  DEFAULT_SOS,
  DEFAULT_STR_AM,
  DEFAULT_STR_PM,
  DEFAULT_TAC,
  DEFAULT_SAFETY_INCIDENT as DEFAULT_SAFETY,
  DEFAULT_TARGETS,
  LS_SESSION_KEY,
  LS_BACKUP_KEY,
  BACKUP_KEEP,
  BACKUP_TTL_DAYS,
} from "./constants";
import { propagateAll } from "./targetSync";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadSession(): Partial<SessionState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LS_SESSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSession(state: SessionState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_SESSION_KEY, JSON.stringify(state));
  } catch { /* storage full — silent */ }
}

function loadBackups(): BackupEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_BACKUP_KEY) ?? "[]") ?? [];
  } catch { return []; }
}

function saveBackups(list: BackupEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_BACKUP_KEY, JSON.stringify(list));
  } catch { /* silent */ }
}

function pruneBackups(list: BackupEntry[]): BackupEntry[] {
  const cutoff = Date.now() - BACKUP_TTL_DAYS * 24 * 60 * 60 * 1000;
  return list.filter((b) => b.ts >= cutoff).slice(-BACKUP_KEEP);
}

// ─── Store interface ──────────────────────────────────────────────────────────

export interface AppStore {
  // Session state
  meta:       MetaState;
  sos:        SoSState;
  str_am:     StrategicAMState;
  str_pm:     StrategicPMState;
  tac:        TacticalState;
  safety_msg: SafetyIncidentState;

  // Config state (from Supabase / defaults)
  targets:         TargetMetric[];
  targetPeriods:   TargetPeriod[];
  seasonalTemplates: SeasonalTemplate[];
  activeTargetPeriodId: string | null;

  // UI state
  activeTab:    TabKey;
  builtMessage: string;
  toast:        string | null;
  supabaseReady: boolean;
  theme:        "dark" | "light";

  // ─── Meta ─────────────────────────────────────────────────────────────────
  setMeta: (partial: Partial<MetaState>) => void;

  // ─── SoS ─────────────────────────────────────────────────────────────────
  setSoS:    (partial: Partial<SoSState>) => void;
  setSoSToc: (key: keyof SoSState["toc"],  value: string) => void;
  setSoSNr:  (key: keyof SoSState["nr"],   value: string) => void;
  setSoSOncall: (key: keyof SoSState["oncall"], value: string) => void;
  setSoSEsr: (key: keyof SoSState["esr"],  value: string) => void;
  setSoSPerf:(index: number, partial: Partial<TargetMetric>) => void;

  // ─── Strategic AM ─────────────────────────────────────────────────────────
  setStrAM:     (partial: Partial<StrategicAMState>) => void;
  setStrAMPerf: (index: number, partial: Partial<TargetMetric>) => void;

  // ─── Strategic PM ─────────────────────────────────────────────────────────
  setStrPM:     (partial: Partial<StrategicPMState>) => void;
  setStrPMPerf: (index: number, partial: Partial<TargetMetric>) => void;

  // ─── Tactical ─────────────────────────────────────────────────────────────
  setTac:     (partial: Partial<TacticalState>) => void;
  setTacPerf: (index: number, partial: Partial<TargetMetric>) => void;
  setTacLate: (key: keyof TacticalState["late"], value: string) => void;

  // ─── Safety ──────────────────────────────────────────────────────────────
  setSafety:   (partial: Partial<SafetyIncidentState>) => void;
  clearSafety: () => void;

  // ─── Targets ─────────────────────────────────────────────────────────────
  setTargets:    (targets: TargetMetric[]) => void;
  updateTarget:  (index: number, partial: Partial<TargetMetric>) => void;
  addTarget:     () => void;
  removeTarget:  (index: number) => void;
  resetTargets:  () => void;
  setTargetPeriods: (periods: TargetPeriod[]) => void;
  setActiveTargetPeriodId: (id: string | null) => void;
  setSeasonalTemplates: (templates: SeasonalTemplate[]) => void;
  setSupabaseReady: (ready: boolean) => void;

  // ─── UI ───────────────────────────────────────────────────────────────────
  setActiveTab:    (tab: TabKey) => void;
  setBuiltMessage: (msg: string) => void;
  showToast:       (msg: string) => void;
  clearToast:      () => void;
  toggleTheme:     () => void;

  // ─── Persistence ─────────────────────────────────────────────────────────
  hydrate:      () => void;
  persist:      () => void;
  backupNow:    (reason?: string) => void;
  getBackups:   () => BackupEntry[];
  restoreBackup:(index: number) => void;
  exportConfig: () => void;
  importConfig: (json: string) => void;
}

// ─── Store implementation ────────────────────────────────────────────────────

export const useStore = create<AppStore>((set, get) => {
  // Synchronise all perf arrays after a targets change
  const syncPerf = (targets: TargetMetric[], state: AppStore) => {
    const { sosPerf, tacPerf, amPerf, pmPerf } = propagateAll(
      targets,
      state.sos.perf,
      state.tac.perf,
      state.str_am.perf,
      state.str_pm.perf
    );
    return { sosPerf, tacPerf, amPerf, pmPerf };
  };

  // Persist current session state to localStorage
  const persist = () => {
    const s = get();
    saveSession({
      meta:       s.meta,
      sos:        s.sos,
      str_am:     s.str_am,
      str_pm:     s.str_pm,
      tac:        s.tac,
      safety_msg: s.safety_msg,
    });
  };

  return {
    // ─── Initial state ───────────────────────────────────────────────────────
    meta:       { route: "East Midlands Route", stamp: "" },
    sos:        { ...DEFAULT_SOS },
    str_am:     { ...DEFAULT_STR_AM },
    str_pm:     { ...DEFAULT_STR_PM },
    tac:        { ...DEFAULT_TAC },
    safety_msg: { ...DEFAULT_SAFETY },

    targets:              [...DEFAULT_TARGETS],
    targetPeriods:        [],
    seasonalTemplates:    [],
    activeTargetPeriodId: null,

    activeTab:     "sos",
    builtMessage:  "",
    toast:         null,
    supabaseReady: false,
    theme:         (typeof window !== "undefined" && localStorage.getItem("theme") === "light") ? "light" : "dark",

    // ─── Meta ────────────────────────────────────────────────────────────────
    setMeta: (partial) => {
      set((s) => ({ meta: { ...s.meta, ...partial } }));
      persist();
    },

    // ─── SoS ────────────────────────────────────────────────────────────────
    setSoS: (partial) => {
      set((s) => ({ sos: { ...s.sos, ...partial } }));
      persist();
    },
    setSoSToc: (key, value) => {
      set((s) => ({ sos: { ...s.sos, toc: { ...s.sos.toc, [key]: value } } }));
      persist();
    },
    setSoSNr: (key, value) => {
      set((s) => ({ sos: { ...s.sos, nr: { ...s.sos.nr, [key]: value } } }));
      persist();
    },
    setSoSOncall: (key, value) => {
      set((s) => ({ sos: { ...s.sos, oncall: { ...s.sos.oncall, [key]: value } } }));
      persist();
    },
    setSoSEsr: (key, value) => {
      set((s) => ({ sos: { ...s.sos, esr: { ...s.sos.esr, [key]: value } } }));
      persist();
    },
    setSoSPerf: (index, partial) => {
      set((s) => {
        const perf = [...s.sos.perf];
        perf[index] = { ...perf[index], ...partial };
        return { sos: { ...s.sos, perf } };
      });
      persist();
    },

    // ─── Strategic AM ────────────────────────────────────────────────────────
    setStrAM: (partial) => {
      set((s) => ({ str_am: { ...s.str_am, ...partial } }));
      persist();
    },
    setStrAMPerf: (index, partial) => {
      set((s) => {
        const perf = [...s.str_am.perf];
        perf[index] = { ...perf[index], ...partial };
        return { str_am: { ...s.str_am, perf } };
      });
      persist();
    },

    // ─── Strategic PM ────────────────────────────────────────────────────────
    setStrPM: (partial) => {
      set((s) => ({ str_pm: { ...s.str_pm, ...partial } }));
      persist();
    },
    setStrPMPerf: (index, partial) => {
      set((s) => {
        const perf = [...s.str_pm.perf];
        perf[index] = { ...perf[index], ...partial };
        return { str_pm: { ...s.str_pm, perf } };
      });
      persist();
    },

    // ─── Tactical ────────────────────────────────────────────────────────────
    setTac: (partial) => {
      set((s) => ({ tac: { ...s.tac, ...partial } }));
      persist();
    },
    setTacPerf: (index, partial) => {
      set((s) => {
        const perf = [...s.tac.perf];
        perf[index] = { ...perf[index], ...partial };
        return { tac: { ...s.tac, perf } };
      });
      persist();
    },
    setTacLate: (key, value) => {
      set((s) => ({ tac: { ...s.tac, late: { ...s.tac.late, [key]: value } } }));
      persist();
    },

    // ─── Safety ──────────────────────────────────────────────────────────────
    setSafety: (partial) => {
      set((s) => ({ safety_msg: { ...s.safety_msg, ...partial } }));
      persist();
    },
    clearSafety: () => {
      set({ safety_msg: { ...DEFAULT_SAFETY } });
      persist();
    },

    // ─── Targets ─────────────────────────────────────────────────────────────
    setTargets: (targets) => {
      set((s) => {
        const { sosPerf, tacPerf, amPerf, pmPerf } = syncPerf(targets, s);
        return {
          targets,
          sos:    { ...s.sos,    perf: sosPerf },
          tac:    { ...s.tac,    perf: tacPerf },
          str_am: { ...s.str_am, perf: amPerf },
          str_pm: { ...s.str_pm, perf: pmPerf },
        };
      });
      persist();
    },
    updateTarget: (index, partial) => {
      set((s) => {
        const targets = [...s.targets];
        targets[index] = { ...targets[index], ...partial };
        const { sosPerf, tacPerf, amPerf, pmPerf } = syncPerf(targets, s);
        return {
          targets,
          sos:    { ...s.sos,    perf: sosPerf },
          tac:    { ...s.tac,    perf: tacPerf },
          str_am: { ...s.str_am, perf: amPerf },
          str_pm: { ...s.str_pm, perf: pmPerf },
        };
      });
      persist();
    },
    addTarget: () => {
      set((s) => ({
        targets: [
          ...s.targets,
          { name: "New metric", value: "", target: "", amber: "", dir: "higher", notes: "" },
        ],
      }));
      persist();
    },
    removeTarget: (index) => {
      set((s) => {
        const targets = s.targets.filter((_, i) => i !== index);
        const { sosPerf, tacPerf, amPerf, pmPerf } = syncPerf(targets, s);
        return {
          targets,
          sos:    { ...s.sos,    perf: sosPerf },
          tac:    { ...s.tac,    perf: tacPerf },
          str_am: { ...s.str_am, perf: amPerf },
          str_pm: { ...s.str_pm, perf: pmPerf },
        };
      });
      persist();
    },
    resetTargets: () => {
      set((s) => {
        const targets = [...DEFAULT_TARGETS];
        const { sosPerf, tacPerf, amPerf, pmPerf } = syncPerf(targets, s);
        return {
          targets,
          sos:    { ...s.sos,    perf: sosPerf },
          tac:    { ...s.tac,    perf: tacPerf },
          str_am: { ...s.str_am, perf: amPerf },
          str_pm: { ...s.str_pm, perf: pmPerf },
        };
      });
      persist();
    },
    setTargetPeriods:        (periods)   => set({ targetPeriods: periods }),
    setActiveTargetPeriodId: (id)        => set({ activeTargetPeriodId: id }),
    setSeasonalTemplates:    (templates) => set({ seasonalTemplates: templates }),
    setSupabaseReady:        (ready)     => set({ supabaseReady: ready }),

    // ─── UI ──────────────────────────────────────────────────────────────────
    setActiveTab:    (tab) => set({ activeTab: tab }),
    setBuiltMessage: (msg) => set({ builtMessage: msg }),
    showToast:  (msg) => {
      set({ toast: msg });
      setTimeout(() => set({ toast: null }), 1200);
    },
    clearToast: () => set({ toast: null }),
    toggleTheme: () => {
      const next = get().theme === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") localStorage.setItem("theme", next);
      set({ theme: next });
    },

    // ─── Persistence ─────────────────────────────────────────────────────────
    hydrate: () => {
      const saved = loadSession();
      if (!saved || Object.keys(saved).length === 0) {
        // First run — initialise perf arrays from defaults
        set((s) => {
          const { sosPerf, tacPerf, amPerf, pmPerf } = syncPerf(s.targets, s);
          return {
            sos:    { ...s.sos,    perf: sosPerf },
            tac:    { ...s.tac,    perf: tacPerf },
            str_am: { ...s.str_am, perf: amPerf },
            str_pm: { ...s.str_pm, perf: pmPerf },
          };
        });
        return;
      }
      set((s) => ({
        meta:       { ...s.meta,       ...(saved.meta       ?? {}) },
        sos:        { ...s.sos,        ...(saved.sos        ?? {}) },
        str_am:     { ...s.str_am,     ...(saved.str_am     ?? {}) },
        str_pm:     { ...s.str_pm,     ...(saved.str_pm     ?? {}) },
        tac:        { ...s.tac,        ...(saved.tac        ?? {}) },
        safety_msg: { ...s.safety_msg, ...(saved.safety_msg ?? {}) },
      }));
    },
    persist,
    backupNow: (reason = "auto") => {
      const s = get();
      const snap: SessionState = {
        meta: s.meta, sos: s.sos, str_am: s.str_am,
        str_pm: s.str_pm, tac: s.tac, safety_msg: s.safety_msg,
      };
      const list = loadBackups();
      list.push({ ts: Date.now(), reason, data: snap });
      saveBackups(pruneBackups(list));
    },
    getBackups: () => loadBackups(),
    restoreBackup: (index) => {
      const list = loadBackups();
      const entry = list[index];
      if (!entry) return;
      saveSession(entry.data);
      // Merge into store
      set((s) => ({
        meta:       { ...s.meta,       ...(entry.data.meta       ?? {}) },
        sos:        { ...s.sos,        ...(entry.data.sos        ?? {}) },
        str_am:     { ...s.str_am,     ...(entry.data.str_am     ?? {}) },
        str_pm:     { ...s.str_pm,     ...(entry.data.str_pm     ?? {}) },
        tac:        { ...s.tac,        ...(entry.data.tac        ?? {}) },
        safety_msg: { ...s.safety_msg, ...(entry.data.safety_msg ?? {}) },
      }));
    },
    exportConfig: () => {
      const s = get();
      const payload = JSON.stringify({
        meta: s.meta, targets: s.targets,
        sos: s.sos, str_am: s.str_am, str_pm: s.str_pm,
        tac: s.tac, safety_msg: s.safety_msg,
      }, null, 2);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
      a.download = "messaging-assistant-config.json";
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(a.href);
      a.remove();
    },
    importConfig: (json) => {
      try {
        const parsed = JSON.parse(json);
        set((s) => ({
          meta:       parsed.meta       ? { ...s.meta,       ...parsed.meta }       : s.meta,
          targets:    parsed.targets    ?? s.targets,
          sos:        parsed.sos        ? { ...s.sos,        ...parsed.sos }        : s.sos,
          str_am:     parsed.str_am     ? { ...s.str_am,     ...parsed.str_am }     : s.str_am,
          str_pm:     parsed.str_pm     ? { ...s.str_pm,     ...parsed.str_pm }     : s.str_pm,
          tac:        parsed.tac        ? { ...s.tac,        ...parsed.tac }        : s.tac,
          safety_msg: parsed.safety_msg ? { ...s.safety_msg, ...parsed.safety_msg } : s.safety_msg,
        }));
        persist();
      } catch {
        throw new Error("Invalid config JSON");
      }
    },
  };
});
