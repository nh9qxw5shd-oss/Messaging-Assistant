"use client";

// Live shared state: every open copy, on any machine, shows the same draft.
//
// Each section (route meta, SoS, strategic AM/PM, tactical, safety, incidents)
// is one row in ma_live_state with its own revision, so editing one section
// never touches another: the RCM on the SoS and tactical, the SNDM on
// incidents. A change here is written about a second after typing stops; the
// database is read every few seconds and on focus. If the section moved on
// elsewhere since this copy last agreed with it, the two are merged field by
// field (see merge.ts); where both changed the same field, this copy's is kept
// and the other is saved as a local backup.
//
// Browser storage stays the offline copy: every change is still saved there
// first, and anything written while the database cannot be reached is sent
// when it can, merged the same way.

import { useEffect } from "react";
import { create } from "zustand";
import { supabase } from "../supabase";
import { useStore } from "../store";
import { useIncidentStore } from "../incident/store";
import type { IncidentState } from "../incident/types";
import { sameValue } from "./merge";
import { planSync, SECTIONS, SESSION_SECTIONS, type Known, type Row, type Section, type SessionSection } from "./plan";

export const LS_LIVE_KEY = "ma-live-sync-v1";
const PUSH_DELAY_MS = 800;
const POLL_MS = 3_000;
const HIDDEN_POLL_MS = 30_000;
const RETRY_MS = 5_000;

export type LiveStatus = "local" | "connecting" | "live" | "saving" | "offline";

export const useLiveStatus = create<{ status: LiveStatus; lastSync: number | null }>(() => ({
  status: supabase ? "connecting" : "local",
  lastSync: null,
}));

// ─── What this browser last agreed with the database ────────────────────────

interface SyncState { known: Partial<Record<Section, Known>>; cursor: number }

function loadSyncState(): SyncState {
  try {
    const v = JSON.parse(localStorage.getItem(LS_LIVE_KEY) ?? "null");
    if (v && typeof v === "object" && v.known && typeof v.cursor === "number") return v as SyncState;
  } catch { /* fall through */ }
  return { known: {}, cursor: 0 };
}

function saveSyncState(s: SyncState): void {
  try { localStorage.setItem(LS_LIVE_KEY, JSON.stringify(s)); } catch { /* storage full */ }
}

// ─── Reading and writing a section in this copy ─────────────────────────────

const isSession = (s: Section): s is SessionSection => s !== "incidents";

function read(section: Section): unknown {
  return isSession(section) ? useStore.getState()[section] : useIncidentStore.getState().incidents;
}

function write(section: Section, value: unknown): void {
  if (isSession(section)) {
    useStore.setState({ [section]: value } as Partial<ReturnType<typeof useStore.getState>>);
    useStore.getState().persist();
  } else {
    useIncidentStore.getState().replaceIncidents(value as IncidentState[]);
  }
}

// ─── Engine ─────────────────────────────────────────────────────────────────

const clientId = (() => {
  if (typeof window === "undefined") return "server";
  try {
    const k = "ma-live-client";
    const v = sessionStorage.getItem(k) ?? `c-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(k, v);
    return v;
  } catch { return `c-${Math.random().toString(36).slice(2, 10)}`; }
})();

let sync: SyncState = { known: {}, cursor: 0 };
let ready = false;
const timers = new Map<Section, ReturnType<typeof setTimeout>>();
const busy = new Set<Section>();

function setStatus(status: LiveStatus): void {
  useLiveStatus.setState(status === "live" ? { status, lastSync: Date.now() } : { status });
}

function settle(): void {
  if (busy.size === 0 && timers.size === 0) setStatus("live");
}

function reconcile(section: Section, row: Row | null): void {
  if (busy.has(section)) return; // the write in flight gets the latest back if it is stale
  const local = read(section);
  const plan = planSync(section, sync.known[section], local, row);
  // Performance figures are refilled from the live feed by every open copy, so a
  // clash there is two reads of the same feed, not someone's work.
  if (plan.conflicts.some((f) => f !== "perf") && row && isSession(section)) {
    useStore.getState().backupSection(section, row.state, `${section} changed elsewhere`);
  }
  sync.known[section] = plan.known;
  if (row) sync.cursor = Math.max(sync.cursor, row.rev);
  saveSyncState(sync);
  if (plan.apply !== undefined) write(section, plan.apply);
  if (plan.push) schedule(section, 0);
}

function schedule(section: Section, delay = PUSH_DELAY_MS): void {
  if (!ready) return;
  clearTimeout(timers.get(section));
  timers.set(section, setTimeout(() => { timers.delete(section); void push(section); }, delay));
}

async function push(section: Section): Promise<void> {
  if (!supabase) return;
  if (busy.has(section)) { schedule(section); return; }
  const known = sync.known[section];
  const value = read(section);
  if (known && known.rev > 0 && sameValue(value, known.base)) { settle(); return; }
  busy.add(section);
  setStatus("saving");
  let stale: Row | null | undefined;
  try {
    const { data, error } = await supabase.rpc("ma_live_put", {
      p_section: section,
      p_state: value,
      p_base_rev: known?.rev ?? 0,
      p_client: clientId,
    });
    if (error) throw new Error(error.message);
    const r = (Array.isArray(data) ? data[0] : data) as { ok: boolean; rev: number; state: unknown } | null;
    if (!r) throw new Error("No reply");
    if (r.ok) {
      sync.known[section] = { rev: Number(r.rev), base: value };
      sync.cursor = Math.max(sync.cursor, Number(r.rev));
      saveSyncState(sync);
    } else {
      stale = Number(r.rev) > 0 ? { rev: Number(r.rev), state: r.state } : null;
    }
    busy.delete(section);
    if (stale !== undefined) reconcile(section, stale);
    settle();
  } catch {
    busy.delete(section);
    setStatus("offline");
    schedule(section, RETRY_MS);
  }
}

async function pull(all: boolean): Promise<void> {
  if (!supabase) return;
  let q = supabase.from("ma_live_state").select("section, state, rev");
  if (!all) q = q.gt("rev", sync.cursor);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = new Map<string, Row>();
  for (const r of data ?? []) rows.set(String(r.section), { rev: Number(r.rev), state: r.state });
  if (all) {
    // First time on this browser with a shared copy already there: keep what
    // this browser had as a backup before taking the shared copy.
    const firstHere = SESSION_SECTIONS.every((s) => !sync.known[s]);
    if (firstHere && SESSION_SECTIONS.some((s) => rows.has(s) && !sameValue(read(s), rows.get(s)!.state))) {
      useStore.getState().backupNow("before shared draft");
    }
    for (const s of SECTIONS) reconcile(s, rows.get(s) ?? null);
  } else {
    for (const [s, row] of rows) if ((SECTIONS as readonly string[]).includes(s)) reconcile(s as Section, row);
  }
}

let started = false;

function start(): () => void {
  if (started || !supabase) return () => {};
  started = true;
  sync = loadSyncState();
  useIncidentStore.getState().hydrate();

  // Any change here is written back (no-op when it matches what was agreed).
  const last = new Map<Section, unknown>(SECTIONS.map((s) => [s, read(s)]));
  const onChange = () => {
    for (const s of SECTIONS) {
      const v = read(s);
      if (v !== last.get(s)) { last.set(s, v); schedule(s); }
    }
  };
  const unsubs = [useStore.subscribe(onChange), useIncidentStore.subscribe(onChange)];

  let stopped = false;
  let lastPoll = 0;
  const connect = async () => {
    while (!stopped && !ready) {
      try {
        await pull(true);
        ready = true;
        // Changes made before the first read went through reconcile; anything still differing goes now.
        for (const s of SECTIONS) schedule(s, 0);
        settle();
      } catch {
        setStatus("offline");
        await new Promise((r) => setTimeout(r, RETRY_MS));
      }
    }
  };
  void connect();

  const poll = async (force = false) => {
    if (!ready || stopped) return;
    const visible = document.visibilityState === "visible";
    if (!force && !visible && Date.now() - lastPoll < HIDDEN_POLL_MS) return;
    lastPoll = Date.now();
    try {
      await pull(false);
      if (useLiveStatus.getState().status === "offline") {
        for (const s of SECTIONS) schedule(s, 0);
      }
      settle();
    } catch {
      setStatus("offline");
    }
  };
  const id = setInterval(() => { void poll(); }, POLL_MS);
  const onFocus = () => { void poll(true); };
  window.addEventListener("focus", onFocus);
  window.addEventListener("online", onFocus);

  return () => {
    stopped = true;
    started = false;
    ready = false;
    clearInterval(id);
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("online", onFocus);
    unsubs.forEach((u) => u());
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
  };
}

/** Keep this copy on the shared draft. Call once, after the session is hydrated. */
export function useLiveSync(): void {
  useEffect(() => start(), []);
}
