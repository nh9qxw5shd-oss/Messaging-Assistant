// ─── Critical engineering → message section ─────────────────────────────────
//
// Pure functions shared, by copy, with the Messaging Assistant
// (src/lib/engineering/criticalMessage.ts there). Keep the two files identical:
// the Hub's message preview and the Assistant's auto-filled engineering
// section must say the same thing.
//
// Slots are the Messaging Assistant's: 05:30 start of service, 09:00 / 15:00 /
// 22:00 tactical. For a slot the section lists, in start order:
//   - items still active (taken / behind schedule / overrun / partially achieved)
//   - items due to start before the next message (for 22:00: tonight's works)
//   - items concluded since the previous message (the 05:30 outcomes)
//   - items whose planned window overlapped the last period with no status
//     update, flagged "no update received"
// so weekend and multi-night works carry through every message until they
// conclude, and a concluded item is reported exactly once.

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

const HOUR_MS = 3_600_000;

function ms(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
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
  const out: SelectedItem[] = [];
  for (const item of items) {
    if (!item.include_in_messages) continue;
    const status = isCriticalStatus(item.status) ? item.status : "not_yet_taken";
    const meta = STATUS_META[status];
    const start = ms(item.start_at);
    const end = ms(item.end_at);
    const concluded = ms(item.concluded_at) ?? (meta.concluded ? ms(item.status_at) : null);

    if (meta.concluded) {
      // Report an outcome once: in the first message after it was recorded. Fall
      // back to the planned end time when the conclusion was never time-stamped.
      const when = concluded ?? end;
      if (when !== null && when > prev && when <= at + 30 * 60_000) out.push({ item, reason: "concluded" });
      continue;
    }
    if (meta.active) { out.push({ item, reason: "active" }); continue; }
    // not_yet_taken
    if (start !== null && start >= at - HOUR_MS && start < next + HOUR_MS) { out.push({ item, reason: "due" }); continue; }
    if (start !== null && start < at - HOUR_MS && (end === null || end > prev - HOUR_MS)) { out.push({ item, reason: "no_update" }); continue; }
  }
  out.sort((a, b) => (ms(a.item.start_at) ?? 0) - (ms(b.item.start_at) ?? 0) || (a.item.item_no ?? 0) - (b.item.item_no ?? 0));
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

/** Body text of the engineering section for a slot (no heading). */
export function renderEngineeringSection(selected: SelectedItem[], slot: MessageSlot): string {
  if (!selected.length) {
    return slot === "2200" ? "No critical engineering works tonight." : slot === "0530" ? "No critical engineering works overnight." : "No critical engineering works ongoing.";
  }
  const active = selected.filter((s) => s.reason === "active" || s.reason === "no_update");
  const due = selected.filter((s) => s.reason === "due");
  const concluded = selected.filter((s) => s.reason === "concluded");
  const parts: string[] = [];
  const block = (title: string | null, list: SelectedItem[]) => {
    if (!list.length) return;
    const body = list.map((s) => formatItem(s.item, s.reason)).join("\n\n");
    parts.push(title ? `${title}\n${body}` : body);
  };
  if (slot === "0530") {
    block(null, concluded);
    block(active.length && concluded.length ? "_Still ongoing_" : null, active);
    block(due.length && (concluded.length || active.length) ? "_Due today_" : null, due);
  } else {
    block(null, active);
    block(due.length && active.length ? (slot === "2200" ? "_Due tonight_" : "_Due before the next update_") : null, due);
    block(concluded.length && (active.length || due.length) ? "_Concluded since last update_" : null, concluded);
  }
  return parts.join("\n\n");
}

/** Convenience: select + render for a slot. */
export function buildEngineeringSection(items: CriticalItemLite[], w: SlotWindow): { text: string; selected: SelectedItem[] } {
  const selected = selectItemsForSlot(items, w);
  return { text: renderEngineeringSection(selected, w.slot), selected };
}
