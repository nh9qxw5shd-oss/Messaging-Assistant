// Which scheduled messages have gone out, shared by everyone on the desk.
//
// "Sent" lives in ma_message_snapshots.sent_at, so a mark made on one machine
// moves every other open Assistant on within a minute. A mark is made by
// copying the message in its send window or by "Mark as sent"; sent_via says
// which. "Move on" (skip a
// message without marking it sent) is a per-browser choice kept locally; the
// cockpit only ever counts real sent marks.

import { useEffect } from "react";
import { create } from "zustand";
import { supabase } from "../supabase";
import { londonNow, settledKeys, shiftDate, slotKey, type MessagePin, type SentVia } from "./messageSlot";

export const MOVED_ON_KEY = "ma_tactical_moved_on";
const POLL_MS = 60_000;

export function loadMovedOn(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const list: unknown = JSON.parse(localStorage.getItem(MOVED_ON_KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((k): k is string => typeof k === "string") : [];
  } catch { return []; }
}

function saveMovedOn(list: string[]): void {
  if (typeof window === "undefined") return;
  // Keep the last couple of days only.
  const cutoff = shiftDate(londonNow(new Date()).dateISO, -2);
  const kept = list.filter((k) => k.slice(0, 10) >= cutoff);
  try { localStorage.setItem(MOVED_ON_KEY, JSON.stringify(kept)); } catch { /* silent */ }
}

interface SentStore {
  /** slotKey → sent_at (ISO) for yesterday, today and tomorrow. */
  sent: Record<string, string>;
  /** slotKey → how the mark was made, where known. */
  via: Record<string, SentVia>;
  movedOn: string[];
  refresh: () => Promise<void>;
  /** Record a message as sent; resolves to the sent time. Throws if it could not be saved. */
  markSent: (pin: MessagePin, via: SentVia, write: () => Promise<string>) => Promise<string>;
  unmarkSent: (pin: MessagePin) => Promise<void>;
  moveOn: (key: string) => void;
}

export const useSentStore = create<SentStore>((set, get) => ({
  sent: {},
  via: {},
  movedOn: [],

  refresh: async () => {
    if (!supabase) return;
    const today = londonNow(new Date()).dateISO;
    const { data, error } = await supabase
      .from("ma_message_snapshots")
      .select("snapshot_date, slot, sent_at, sent_via")
      .gte("snapshot_date", shiftDate(today, -1))
      .lte("snapshot_date", shiftDate(today, 1))
      .not("sent_at", "is", null);
    if (error) { console.warn("Sent marks not read:", error.message); return; }
    const sent: Record<string, string> = {};
    const via: Record<string, SentVia> = {};
    for (const r of data ?? []) {
      const k = slotKey(String(r.snapshot_date), r.slot);
      sent[k] = String(r.sent_at);
      if (r.sent_via === "copy" || r.sent_via === "manual") via[k] = r.sent_via;
    }
    set({ sent, via });
  },

  markSent: async (pin, via, write) => {
    const at = await write();
    const k = slotKey(pin.snapshotDate, pin.slot);
    // The first mark's method is kept, as in the database.
    if (get().sent[k]) return at;
    set({ sent: { ...get().sent, [k]: at }, via: { ...get().via, [k]: via } });
    return at;
  },

  unmarkSent: async (pin) => {
    if (supabase) {
      const { error } = await supabase.rpc("ma_unmark_message_sent", { p_snapshot_date: pin.snapshotDate, p_slot: pin.slot });
      if (error) throw new Error(error.message);
    }
    const k = slotKey(pin.snapshotDate, pin.slot);
    const sent = { ...get().sent };
    const via = { ...get().via };
    delete sent[k];
    delete via[k];
    set({ sent, via });
  },

  moveOn: (key) => {
    const movedOn = [...new Set([...get().movedOn, key])];
    saveMovedOn(movedOn);
    set({ movedOn });
  },
}));

/**
 * Sent and moved-on messages as one set of slot keys, for the auto slot. A
 * message just logged on copy stays in hand for a few minutes (settledKeys).
 */
export function doneKeys(s: Pick<SentStore, "sent" | "via" | "movedOn">, now: Date = new Date()): Set<string> {
  return settledKeys(s.sent, s.via, s.movedOn, now);
}

/** Keep sent marks fresh: on mount, every minute and when the window regains focus. */
export function useSentSync(): void {
  useEffect(() => {
    useSentStore.setState({ movedOn: loadMovedOn() });
    const { refresh } = useSentStore.getState();
    void refresh();
    const id = setInterval(() => { void refresh(); }, POLL_MS);
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, []);
}
