import { create } from "zustand";
import type { IncidentState, SentMessage } from "./types";
import { LS_INCIDENTS_KEY, newIncident, nowLondon } from "./constants";

// ─── Persistence ──────────────────────────────────────────────────────────────
// Incidents live under their own key so daily-message state is untouched.

interface PersistedShape {
  incidents: IncidentState[];
  activeId: string | null;
}

function load(): PersistedShape {
  if (typeof window === "undefined") return { incidents: [], activeId: null };
  try {
    const raw = localStorage.getItem(LS_INCIDENTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as PersistedShape) : null;
    return parsed && Array.isArray(parsed.incidents)
      ? parsed
      : { incidents: [], activeId: null };
  } catch {
    return { incidents: [], activeId: null };
  }
}

function save(state: PersistedShape): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_INCIDENTS_KEY, JSON.stringify(state));
  } catch { /* storage full — silent */ }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export interface IncidentStore {
  incidents: IncidentState[];
  activeId: string | null;
  hydrated: boolean;

  hydrate: () => void;
  createIncident: () => void;
  setActive: (id: string) => void;
  /** Patch the active incident. */
  patch: (partial: Partial<IncidentState>) => void;
  /** Move the active incident to a phase, applying step-forward defaults. */
  setPhase: (phase: IncidentState["phase"]) => void;
  closeIncident: () => void;
  reopenIncident: (id: string) => void;
  deleteIncident: (id: string) => void;
  /** Log a copied message and advance counters/phase. */
  logSent: (msg: SentMessage) => void;
}

export const useIncidentStore = create<IncidentStore>((set, get) => {
  const persist = () => {
    const { incidents, activeId } = get();
    save({ incidents, activeId });
  };

  const patchIncident = (id: string, partial: Partial<IncidentState>) => {
    set((s) => ({
      incidents: s.incidents.map((i) => (i.id === id ? { ...i, ...partial } : i)),
    }));
    persist();
  };

  return {
    incidents: [],
    activeId: null,
    hydrated: false,

    hydrate: () => {
      if (get().hydrated) return;
      const { incidents, activeId } = load();
      // Re-hydrated records may predate newer fields — merge over a fresh
      // default so missing keys never reach the renderer.
      const merged = incidents.map((i) => ({ ...newIncident(), ...i }));
      set({
        incidents: merged,
        activeId: activeId && merged.some((i) => i.id === activeId) ? activeId : merged[0]?.id ?? null,
        hydrated: true,
      });
    },

    createIncident: () => {
      const inc = newIncident();
      set((s) => ({ incidents: [inc, ...s.incidents], activeId: inc.id }));
      persist();
    },

    setActive: (id) => {
      set({ activeId: id });
      persist();
    },

    patch: (partial) => {
      const id = get().activeId;
      if (id) patchIncident(id, partial);
    },

    setPhase: (phase) => {
      const inc = get().incidents.find((i) => i.id === get().activeId);
      if (!inc) return;
      const partial: Partial<IncidentState> = { phase, draftNarrative: "" };
      // Keep the narrative when hopping between holding/initial drafting.
      if (phase === "initial" && inc.phase === "holding") {
        partial.draftNarrative = inc.draftNarrative;
      }
      if (phase === "nwr") {
        partial.status = "green";
        if (!inc.nwr.time) partial.nwr = { ...inc.nwr, time: nowLondon() };
      }
      if (phase === "recovery") partial.status = "green";
      patchIncident(inc.id, partial);
    },

    closeIncident: () => {
      const id = get().activeId;
      if (id) patchIncident(id, { phase: "closed" });
    },

    reopenIncident: (id) => {
      patchIncident(id, { phase: "update" });
      set({ activeId: id });
      persist();
    },

    deleteIncident: (id) => {
      set((s) => {
        const incidents = s.incidents.filter((i) => i.id !== id);
        return {
          incidents,
          activeId: s.activeId === id ? incidents[0]?.id ?? null : s.activeId,
        };
      });
      persist();
    },

    logSent: (msg) => {
      const inc = get().incidents.find((i) => i.id === get().activeId);
      if (!inc) return;
      // Copying the identical text again is a re-copy, not a new send.
      const last = inc.sent[inc.sent.length - 1];
      if (last && last.text === msg.text) return;

      const partial: Partial<IncidentState> = { sent: [...inc.sent, msg] };
      if (inc.phase === "update") {
        partial.updateCount = inc.updateCount + 1;
        partial.draftNarrative = "";
      }
      // Sending the initial alert moves the incident into the update cycle.
      if (inc.phase === "initial") partial.phase = "update";
      patchIncident(inc.id, partial);
    },
  };
});
