// Which scheduled message is in hand, and which date it belongs to.
//
// A message is logged against its own slot: the SoS against 05:30, the
// tactical against the slot chosen on the Tactical tab. While the tactical
// slot is on auto it stays on the current message until that message is
// marked as sent (or moved on by hand), or until an hour after its booked
// time, so a message that goes a little late is still logged as itself.
//
// Pure functions over a Date and plain sets, no imports at runtime, so the
// rules are unit-tested with node --test.

import type { SnapshotSlot, TacticalSlot } from "../types";

export const TIMEZONE = "Europe/London";

/** Minutes after the booked time before auto moves on to the next message. */
export const GRACE_MINUTES = 60;

export const TACTICAL_ORDER: TacticalSlot[] = ["0900", "1500", "2200"];

export const SLOT_MINUTES: Record<SnapshotSlot, number> = {
  "0530": 5 * 60 + 30,
  "0900": 9 * 60,
  "1500": 15 * 60,
  "2200": 22 * 60,
};

const HALF_DAY = 12 * 60;
const DAY = 24 * 60;

const FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** London calendar date and minutes since London midnight. */
export function londonNow(now: Date): { dateISO: string; minutes: number } {
  const parts = FMT.formatToParts(now);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    dateISO: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

export function shiftDate(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Key for one message occurrence, e.g. "2026-10-11|0900". */
export function slotKey(dateISO: string, slot: SnapshotSlot): string {
  return `${dateISO}|${slot}`;
}

/**
 * The date of the nearest occurrence of a tactical slot: the one within twelve
 * hours either side of now. So 09:00 picked at 22:30 is tomorrow's, and 22:00
 * picked at 00:20 (a late message) is yesterday's.
 */
export function tacticalSlotDate(slot: TacticalSlot, now: Date = new Date()): string {
  const { dateISO, minutes } = londonNow(now);
  const diff = SLOT_MINUTES[slot] - minutes;
  if (diff > HALF_DAY) return shiftDate(dateISO, -1);
  if (diff <= -HALF_DAY) return shiftDate(dateISO, 1);
  return dateISO;
}

/** The 05:30 Start of Service in hand: today's, or tomorrow's from 22:00. */
export function sosSlotDate(now: Date = new Date()): string {
  const { dateISO, minutes } = londonNow(now);
  return minutes >= 22 * 60 ? shiftDate(dateISO, 1) : dateISO;
}

/**
 * The tactical message auto should show: the earliest of the nearest 09:00,
 * 15:00 and 22:00 that is neither done (sent or moved on) nor more than the
 * grace period past its booked time. When all three are done or past, it is
 * the next day's 09:00.
 */
export function activeTacticalSlot(
  now: Date = new Date(),
  done: ReadonlySet<string> = new Set(),
): { slot: TacticalSlot; dateISO: string } {
  const { dateISO: today, minutes } = londonNow(now);
  const dayIndex = (d: string) => Math.round((Date.parse(d) - Date.parse(today)) / 86_400_000);

  const candidates = TACTICAL_ORDER.map((slot) => {
    const dateISO = tacticalSlotDate(slot, now);
    return { slot, dateISO, at: dayIndex(dateISO) * DAY + SLOT_MINUTES[slot] };
  }).sort((a, b) => a.at - b.at);

  const open = candidates.find((c) => !done.has(slotKey(c.dateISO, c.slot)) && minutes < c.at + GRACE_MINUTES);
  if (open) return { slot: open.slot, dateISO: open.dateISO };

  // All three are done: the first 09:00 after the latest of them.
  const last = candidates[candidates.length - 1].at;
  const k = Math.floor((last - SLOT_MINUTES["0900"]) / DAY) + 1;
  return { slot: "0900", dateISO: shiftDate(today, k) };
}

/** The tactical message after this one, for the manual "move on" button. */
export function nextTacticalSlot(slot: TacticalSlot): TacticalSlot {
  return TACTICAL_ORDER[(TACTICAL_ORDER.indexOf(slot) + 1) % TACTICAL_ORDER.length];
}

/** Where a build or a "sent" mark is logged; null for messages that are not scheduled. */
export interface MessagePin {
  snapshotDate: string;
  slot: SnapshotSlot;
  /** The day the figures describe: the previous day for the 05:30 SoS. */
  metricsForDate: string;
}

export function pinForMessage(tab: string, tacticalSlot: TacticalSlot, now: Date = new Date()): MessagePin | null {
  if (tab === "sos") {
    const d = sosSlotDate(now);
    return { snapshotDate: d, slot: "0530", metricsForDate: shiftDate(d, -1) };
  }
  if (tab === "tactical") {
    const d = tacticalSlotDate(tacticalSlot, now);
    return { snapshotDate: d, slot: tacticalSlot, metricsForDate: d };
  }
  return null;
}
