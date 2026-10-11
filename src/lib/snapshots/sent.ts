// Which scheduled messages have gone out, shared by everyone on the desk.
//
// "Sent" lives in ma_message_snapshots.sent_at, so a mark made on one machine
// moves every other open Assistant on within a minute. "Move on" (skip a
// message without marking it sent) is a per-browser choice kept locally; the
// cockpit only ever counts real sent marks.

import { useEffect } from "react";
import { create } from "zustand";
import { supabase } from "../supabase";
import { londonNow, shiftDate, slotKey, type MessagePin } from "./messageSlot";

const MOVED_ON_KEY = "ma_tactical_moved_on";
const POLL_MS = 60_000;

function loadMovedOn(): string[] {
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
  movedOn: string[];
  refresh: () => Promise<void>;
  /** Record a message as sent; resolves to the sent time. Throws if it could not be saved. */
  markSent: (pin: MessagePin, write: () => Promise<string>) => Promise<string>;
  unmarkSent: (pin: MessagePin) => Promise<void>;
  moveOn: (key: string) => void;
}

export const useSentStore = create<SentStore>((set, get) => ({
  sent: {},
  movedOn: [],

  refresh: async () => {
    if (!supabase) return;
    const today = londonNow(new Date()).dateISO;
    const { data, error } = await supabase
      .from("ma_message_snapshots")
      .select("snapshot_date, slot, sent_at")
      .gte("snapshot_date", shiftDate(today, -1))
      .lte("snapshot_date", shiftDate(today, 1))
      .not("sent_at", "is", null);
    if (error) { console.warn("Sent marks not read:", error.message); return; }
    const sent: Record<string, string> = {};
    for (const r of data ?? []) sent[slotKey(String(r.snapshot_date), r.slot)] = String(r.sent_at);
    set({ sent });
  },

  markSent: async (pin, write) => {
    const at = await write();
    set({ sent: { ...get().sent, [slotKey(pin.snapshotDate, pin.slot)]: at } });
    return at;
  },

  unmarkSent: async (pin) => {
    if (supabase) {
      const { error } = await supabase.rpc("ma_unmark_message_sent", { p_snapshot_date: pin.snapshotDate, p_slot: pin.slot });
      if (error) throw new Error(error.message);
    }
    const sent = { ...get().sent };
    delete sent[slotKey(pin.snapshotDate, pin.slot)];
    set({ sent });
  },

  moveOn: (key) => {
    const movedOn = [...new Set([...get().movedOn, key])];
    saveMovedOn(movedOn);
    set({ movedOn });
  },
}));

/** Sent and moved-on messages as one set of slot keys, for the auto slot. */
export function doneKeys(s: Pick<SentStore, "sent" | "movedOn">): Set<string> {
  return new Set([...Object.keys(s.sent), ...s.movedOn]);
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
