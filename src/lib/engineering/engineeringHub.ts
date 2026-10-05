// ─── Critical engineering from the Engineering Hub ───────────────────────────
//
// The Engineering Hub (the rebuilt WON Splitter) tracks the week's critical
// possessions with live status in the shared Supabase project, in the table
// eng_critical_items (anon-readable; the Hub owns the schema). This module
// reads the rows a message could need and hands them to the shared selection
// and rendering logic in ./criticalMessage.ts, which is a verbatim copy of the
// Hub's src/lib/critical/criticalMessage.ts — keep the two identical so the
// Hub's preview and the Assistant's auto-filled section say the same thing.

import { supabase } from "../supabase";
import {
  STATUS_META,
  addDaysISO,
  buildEngineeringSection,
  londonParts,
  slotWindow,
  type CriticalItemLite,
  type CriticalStatus,
  type MessageSlot,
  type SlotWindow,
} from "./criticalMessage";

export const ENG_CRITICAL_TABLE = "eng_critical_items";

export const SLOT_LABEL: Record<MessageSlot, string> = {
  "0530": "05:30",
  "0900": "09:00",
  "1500": "15:00",
  "2200": "22:00",
};

/** Only the columns the message logic reads (CriticalItemLite). */
const COLUMNS = [
  "id", "route_code", "item_label", "item_no", "pps_ref", "location", "times_text",
  "start_at", "end_at", "description", "lines_affected", "status", "status_at",
  "update_note", "include_in_messages", "concluded_at",
].join(", ");

/** Statuses that keep an item in every message until it concludes. */
const ACTIVE_STATUSES = (Object.keys(STATUS_META) as CriticalStatus[]).filter((s) => STATUS_META[s].active);

const DAY_MS = 86_400_000;

/** ISO instant without milliseconds: PostgREST filter values are dot-delimited. */
function isoNoMs(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Every critical item a message around `at` could carry: rows starting
 * between at − 4 days and at + 3 days, plus anything still active whatever
 * its date (weekend and multi-night works), plus anything concluded in the
 * last day (so an outcome is reported once in the first message after it).
 */
export async function fetchCriticalItemsAround(at: Date): Promise<CriticalItemLite[]> {
  if (!supabase) throw new Error("Supabase not configured — check .env.local");
  const from = isoNoMs(new Date(at.getTime() - 4 * DAY_MS));
  const to = isoNoMs(new Date(at.getTime() + 3 * DAY_MS));
  const concludedSince = isoNoMs(new Date(at.getTime() - DAY_MS));
  const { data, error } = await supabase
    .from(ENG_CRITICAL_TABLE)
    .select(COLUMNS)
    .or([
      `and(start_at.gte.${from},start_at.lte.${to})`,
      `status.in.(${ACTIVE_STATUSES.join(",")})`,
      `concluded_at.gte.${concludedSince}`,
    ].join(","))
    .order("start_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown[]) as CriticalItemLite[];
}

export interface EngineeringFill {
  text: string;
  count: number;
  window: SlotWindow;
  fetchedAt: Date;
}

/** Fetch the Hub's items and render the engineering section for a slot on a London date. */
export async function buildEngineeringForSlot(slot: MessageSlot, dateISO: string): Promise<EngineeringFill> {
  const window = slotWindow(slot, dateISO);
  const items = await fetchCriticalItemsAround(window.at);
  const { text, selected } = buildEngineeringSection(items, window);
  return { text, count: selected.length, window, fetchedAt: new Date() };
}

/** "Filled from Engineering Hub for 22:00 Sat 3 Oct · 5 items · 21:14" */
export function describeEngineeringFill(r: EngineeringFill): string {
  const day = new Date(Date.parse(r.window.dateISO + "T12:00:00Z")).toLocaleDateString("en-GB", {
    timeZone: "UTC", weekday: "short", day: "numeric", month: "short",
  });
  const time = r.fetchedAt.toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
  const n = r.count === 1 ? "1 item" : `${r.count} items`;
  return `Filled from Engineering Hub for ${SLOT_LABEL[r.window.slot]} ${day} · ${n} · ${time}`;
}

// ─── Which London date a message describes ───────────────────────────────────

/** Tactical messages describe today, even a 22:00 message built after 22:00. */
export function tacticalDateISO(now: Date = new Date()): string {
  return londonParts(now).dateISO;
}

/** The next 05:30 Start of Service: today, or tomorrow once it is 22:00 or later. */
export function sosDateISO(now: Date = new Date()): string {
  const { dateISO, minutes } = londonParts(now);
  return minutes >= 22 * 60 ? addDaysISO(dateISO, 1) : dateISO;
}
