// ─── Critical engineering → message section ─────────────────────────────────
//
// Pure functions shared, by copy, with the Messaging Assistant
// (src/lib/engineering/criticalMessage.ts there). Keep the two files identical:
// the Hub's message preview and the Assistant's auto-filled engineering
// section must say the same thing.
//
// Slots are the Messaging Assistant's: 05:30 start of service, 09:00 / 15:00 /
// 22:00 tactical. On a weekday a slot's section lists:
//   - items still active (taken / behind schedule / overrun / partially achieved)
//   - items due to start before the next message (for 22:00: tonight's works)
//   - items concluded since the previous message (the 05:30 outcomes)
//   - items whose planned window overlapped the last period with no status
//     update, flagged "no update received"
// so multi-night works carry through every message until they conclude, and a
// concluded item is reported exactly once.
//
// Weekends run as one running list: from the Friday 22:00 message to the
// Monday 05:30 message every item on the Friday, Saturday and Sunday nights is
// listed in every message, whatever its status, so the whole weekend picture
// stays visible until Monday morning.
//
// Items are listed in time order (start time, then item number) and never move
// when their status changes.

export type CriticalStatus =
  | "not_yet_taken"
  | "ongoing"
  | "behind_schedule"
  | "overrun"
  | "partially_achieved"
  | "complete"
  | "handed_back_early"
  | "cancelled";

export const CRITICAL_STATUSES: CriticalStatus[] = [
  "not_yet_taken", "ongoing", "behind_schedule", "overrun", "partially_achieved", "complete", "handed_back_early", "cancelled",
];

export const STATUS_META: Record<CriticalStatus, { label: string; short: string; emoji: string; concluded: boolean; active: boolean }> = {
  not_yet_taken:      { label: "Not yet taken",      short: "Not yet taken",      emoji: "⚪️", concluded: false, active: false },
  ongoing:            { label: "Taken / ongoing",    short: "Ongoing",            emoji: "🟢", concluded: false, active: true },
  behind_schedule:    { label: "Behind schedule",    short: "Behind schedule",    emoji: "🟠", concluded: false, active: true },
  overrun:            { label: "Overrun",            short: "Overrun",            emoji: "🔴", concluded: false, active: true },
  partially_achieved: { label: "Partially achieved", short: "Partially achieved", emoji: "🟡", concluded: false, active: true },
  complete:           { label: "Complete",           short: "Complete",           emoji: "✅", concluded: true,  active: false },
  handed_back_early:  { label: "Handed back early",  short: "Handed back early",  emoji: "✅", concluded: true,  active: false },
  cancelled:          { label: "Cancelled",          short: "Cancelled",          emoji: "⛔", concluded: true,  active: false },
};

export function isCriticalStatus(s: string): s is CriticalStatus {
  return (CRITICAL_STATUSES as string[]).includes(s);
}

/** Order of the status summary counts: what needs attention first, settled outcomes last. */
export const STATUS_ORDER: CriticalStatus[] = [
  "not_yet_taken", "ongoing", "cancelled", "overrun", "behind_schedule", "partially_achieved", "complete", "handed_back_early",
];

type Sortable = { start_at: string | null; item_no: number | null };

/** Start time, then item number. Status plays no part, so items stay put as they are updated. */
export function compareByTime(a: Sortable, b: Sortable): number {
  return (ms(a.start_at) ?? Number.MAX_SAFE_INTEGER) - (ms(b.start_at) ?? Number.MAX_SAFE_INTEGER)
    || (a.item_no ?? 0) - (b.item_no ?? 0);
}

/** The columns of eng_critical_items the message logic needs. */
export interface CriticalItemLite {
  id: string;
  route_code: string;
  item_label: string | null;
  item_no: number | null;
  pps_ref: string | null;
  location: string | null;
  times_text: string | null;
  start_at: string | null;   // ISO timestamptz
  end_at: string | null;
  description: string | null;
  lines_affected: string | null;
  status: string;
  status_at: string | null;
  update_note: string | null;
  include_in_messages: boolean;
  concluded_at: string | null;
}

export type MessageSlot = "0530" | "0900" | "1500" | "2200";
export const MESSAGE_SLOTS: MessageSlot[] = ["0530", "0900", "1500", "2200"];

const SLOT_MINUTES: Record<MessageSlot, number> = { "0530": 330, "0900": 540, "1500": 900, "2200": 1320 };
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

// ─── London wall clock ──────────────────────────────────────────────────────

const LONDON_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function londonParts(d: Date): { dateISO: string; minutes: number } {
  const p = LONDON_FMT.formatToParts(d);
  const g = (t: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === t)?.value ?? "00";
  return { dateISO: `${g("year")}-${g("month")}-${g("day")}`, minutes: Number(g("hour")) * 60 + Number(g("minute")) };
}

/** UTC instant of a London wall-clock time (DST aware). */
export function londonInstant(dateISO: string, minutes: number): Date {
  const [y, m, d] = dateISO.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  // Offset of London at that instant; adjust once (DST switches never fall at message times).
  const lp = londonParts(new Date(guess));
  const lpMs = Date.parse(lp.dateISO + "T00:00:00Z") + lp.minutes * 60_000;
  const wantMs = Date.parse(dateISO + "T00:00:00Z") + minutes * 60_000;
  return new Date(guess - (lpMs - wantMs));
}

export function addDaysISO(dateISO: string, delta: number): string {
  return new Date(Date.parse(dateISO + "T00:00:00Z") + delta * DAY_MS).toISOString().slice(0, 10);
}

export interface SlotWindow {
  slot: MessageSlot;
  dateISO: string;  // London date of the message
  at: Date;         // the message time
  prev: Date;       // the previous message time
  next: Date;       // the next message time
}

/** The message window for a slot on a London date. */
export function slotWindow(slot: MessageSlot, dateISO: string): SlotWindow {
  const idx = MESSAGE_SLOTS.indexOf(slot);
  const at = londonInstant(dateISO, SLOT_MINUTES[slot]);
  const prevSlot = MESSAGE_SLOTS[(idx + 3) % 4];
  const nextSlot = MESSAGE_SLOTS[(idx + 1) % 4];
  const prev = londonInstant(idx === 0 ? addDaysISO(dateISO, -1) : dateISO, SLOT_MINUTES[prevSlot]);
  const next = londonInstant(idx === 3 ? addDaysISO(dateISO, 1) : dateISO, SLOT_MINUTES[nextSlot]);
  return { slot, dateISO, at, prev, next };
}

/** The next approaching slot from `now` (a build at 22:01 belongs to tomorrow's 05:30). */
export function nextSlotWindow(now: Date = new Date()): SlotWindow {
  const { dateISO, minutes } = londonParts(now);
  const slot = MESSAGE_SLOTS.find((s) => minutes <= SLOT_MINUTES[s]);
  return slot ? slotWindow(slot, dateISO) : slotWindow("0530", addDaysISO(dateISO, 1));
}

/** Day of week of a London date: 0 Sunday … 6 Saturday. */
function weekday(dateISO: string): number {
  return new Date(Date.parse(dateISO + "T12:00:00Z")).getUTCDay();
}

/** The London date a possession belongs to: its start minus six hours, so a 00:45 Sunday start is Saturday night. */
export function nightDateOf(item: { start_at: string | null }): string | null {
  const t = ms(item.start_at);
  return t === null ? null : londonParts(new Date(t - 6 * HOUR_MS)).dateISO;
}

/** The weekend's three nights (Friday, Saturday, Sunday) if a London night date falls on one. */
export function weekendNightsFor(nightISO: string): { friday: string; nights: string[] } | null {
  const back = { 5: 0, 6: 1, 0: 2 }[weekday(nightISO) as 0 | 5 | 6];
  if (back === undefined) return null;
  const friday = addDaysISO(nightISO, -back);
  return { friday, nights: [friday, addDaysISO(friday, 1), addDaysISO(friday, 2)] };
}

/**
 * The weekend running list a message belongs to: the Friday 22:00 message
 * through the Monday 05:30 message. Null on weekdays.
 */
export function weekendForWindow(w: SlotWindow): { friday: string; nights: string[] } | null {
  const day = weekday(w.dateISO);
  if (day === 5) return w.slot === "2200" ? weekendNightsFor(w.dateISO) : null;
  if (day === 6 || day === 0) return weekendNightsFor(w.dateISO);
  if (day === 1 && w.slot === "0530") return weekendNightsFor(addDaysISO(w.dateISO, -1));
  return null;
}

/** The tactical slot to default to right now: 09:00, 15:00 or 22:00 (after 22:00 stays on 22:00). */
export function defaultTacticalSlot(now: Date = new Date()): Exclude<MessageSlot, "0530"> {
  const w = nextSlotWindow(now);
  return w.slot === "0530" ? "2200" : w.slot;
}

// ─── Selection ──────────────────────────────────────────────────────────────

export type SelectionReason = "active" | "due" | "concluded" | "no_update";

export interface SelectedItem {
  item: CriticalItemLite;
  reason: SelectionReason;
}


function ms(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

/** Why a not-yet-taken item is listed: due before the next message, or overdue with no update. */
function pendingReason(start: number | null, end: number | null, at: number, prev: number, next: number): SelectionReason | null {
  if (start !== null && start >= at - HOUR_MS && start < next + HOUR_MS) return "due";
  if (start !== null && start < at - HOUR_MS && (end === null || end > prev - HOUR_MS)) return "no_update";
  return null;
}

/**
 * Pick the items a slot's engineering section should carry. See the header
 * comment for the rule. `items` may span several weeks; only timing and status
 * matter.
 */
export function selectItemsForSlot(items: CriticalItemLite[], w: SlotWindow): SelectedItem[] {
  const at = w.at.getTime();
  const prev = w.prev.getTime();
  const next = w.next.getTime();
  const weekend = weekendForWindow(w);
  const out: SelectedItem[] = [];
  for (const item of items) {
    if (!item.include_in_messages) continue;
    const status = isCriticalStatus(item.status) ? item.status : "not_yet_taken";
    const meta = STATUS_META[status];
    const start = ms(item.start_at);
    const end = ms(item.end_at);
    const concluded = ms(item.concluded_at) ?? (meta.concluded ? ms(item.status_at) : null);

    // Weekend running list: every Friday / Saturday / Sunday night item, every message.
    const night = nightDateOf(item);
    if (weekend && night && weekend.nights.includes(night)) {
      if (meta.concluded) out.push({ item, reason: "concluded" });
      else if (meta.active) out.push({ item, reason: "active" });
      else out.push({ item, reason: start !== null && start < at - HOUR_MS && end !== null && end < at ? "no_update" : pendingReason(start, end, at, prev, next) ?? "due" });
      continue;
    }

    if (meta.concluded) {
      // Report an outcome once: in the first message after it was recorded. Fall
      // back to the planned end time when the conclusion was never time-stamped.
      const when = concluded ?? end;
      if (when !== null && when > prev && when <= at + 30 * 60_000) out.push({ item, reason: "concluded" });
      continue;
    }
    if (meta.active) { out.push({ item, reason: "active" }); continue; }
    const reason = pendingReason(start, end, at, prev, next);
    if (reason) out.push({ item, reason });
  }
  out.sort((a, b) => compareByTime(a.item, b.item));
  return out;
}

// ─── Rendering (WhatsApp / Teams plain text) ────────────────────────────────

function norm(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Strip the worksite mileage and W-ref tail the critical list appends to its
 * descriptions ("… at Syston South 97m10ch and 98m70ch W2026/11342523").
 */
export function cleanDescription(s: string | null | undefined): string {
  let t = norm(s);
  const wRef = /[\s.,]*\bW\d{4}\/\d{6,9}\s*$/i;
  const mileage = /[\s.,]*(?:\b(?:between|at)\s+)?\b\d+\s*m\s*\d+\s*ch(?:\s+(?:and|to|&)\s+\d+\s*m\s*\d+\s*ch)?\s*$/i;
  let prev: string;
  do { prev = t; t = t.replace(wRef, "").replace(mileage, ""); } while (t !== prev);
  return t.replace(/[\s.,]+$/, "").trim();
}

const ROUTE_PREFIX: Record<string, string> = {
  EM: "", LNES: "LNE South ", LNEC: "LNE Central ", LNEN: "LNE North ", AR: "Anglia ", LNWS: "LNW South ", LNWN: "LNW North ", KS: "Kent ",
};

export function itemTitle(item: CriticalItemLite): string {
  const prefix = ROUTE_PREFIX[item.route_code] ?? (item.route_code && item.route_code !== "EM" ? `${item.route_code} ` : "");
  const label = item.item_label ? (/^wire/i.test(item.item_label) ? "Wire item" : `Item ${item.item_label}`) : "Item";
  return `${prefix}${label}`;
}

export function statusLine(item: CriticalItemLite, reason: SelectionReason): string {
  const status = isCriticalStatus(item.status) ? item.status : "not_yet_taken";
  const meta = STATUS_META[status];
  const note = norm(item.update_note);
  if (status === "not_yet_taken") {
    const base = reason === "no_update" ? "No update received" : "Not yet taken";
    return note ? `_${base} – ${note}_` : `_${base}_`;
  }
  return note ? `_${meta.short} – ${note}_` : `_${meta.short}_`;
}

/** One item in the established three-line format. */
export function formatItem(item: CriticalItemLite, reason: SelectionReason = "due"): string {
  const status = isCriticalStatus(item.status) ? item.status : "not_yet_taken";
  const emoji = STATUS_META[status].emoji;
  const loc = norm(item.location) || "Location not stated";
  const time = norm(item.times_text) || "Time not stated";
  const lines = [`${emoji} *${itemTitle(item)}, ${loc}, ${time}*.`];
  const desc = cleanDescription(item.description);
  if (desc) lines.push(desc);
  lines.push(statusLine(item, reason));
  return lines.join("\n");
}

/**
 * Body text of the engineering section for a slot (no heading): one list in
 * time order. A weekend message opens with a line saying it is the running
 * list.
 */
export function renderEngineeringSection(selected: SelectedItem[], slot: MessageSlot, weekend = false): string {
  if (!selected.length) {
    if (weekend) return "No critical engineering works this weekend.";
    return slot === "2200" ? "No critical engineering works tonight." : slot === "0530" ? "No critical engineering works overnight." : "No critical engineering works ongoing.";
  }
  const sorted = [...selected].sort((a, b) => compareByTime(a.item, b.item));
  const body = sorted.map((s) => formatItem(s.item, s.reason)).join("\n\n");
  return weekend ? `_Weekend running list until 05:30 Monday_\n\n${body}` : body;
}

/** Convenience: select + render for a slot. */
export function buildEngineeringSection(items: CriticalItemLite[], w: SlotWindow): { text: string; selected: SelectedItem[] } {
  const selected = selectItemsForSlot(items, w);
  return { text: renderEngineeringSection(selected, w.slot, weekendForWindow(w) !== null), selected };
}
