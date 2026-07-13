// Network Rail / GB rail-industry period calendar.
// Ported from Insight (lib/railwayCalendar.ts) and its SQL twin
// (supabase/migrations/013_railway_calendar_alignment.sql) so both systems
// attribute dates to identical periods:
//   - 13 periods × 4 weeks per financial year; P13 absorbs the extra week
//     in 53-week rail years.
//   - Period 1 Week 1 starts on the first Sunday on or after 1 April. Days
//     from 1 April up to that Sunday belong to P13 of the prior rail year.
// Period names produced here ("Period 4 26/27") match the target_period_name
// format Insight stamps on ma_message_snapshots, so snapshots join cleanly to
// the targets in force for the calendar-correct period.

function railwayP1Start(railYear: number): Date {
  const apr1 = new Date(Date.UTC(railYear, 3, 1));
  const dow = apr1.getUTCDay(); // 0 = Sun
  const daysToNextSunday = dow === 0 ? 0 : 7 - dow;
  return new Date(apr1.getTime() + daysToNextSunday * 86_400_000);
}

export interface RailPeriodWeek {
  period: number;    // 1..13
  week: number;      // 1..4 (or 5 in 53-week years, P13 only)
  railYear: number;  // calendar year P01 began (e.g. 2026 for 2026/27)
  yearLabel: string; // "26/27"
}

export function railwayPeriodWeek(dateInput: Date | string): RailPeriodWeek {
  const date = typeof dateInput === "string"
    ? new Date(dateInput + "T00:00:00Z")
    : dateInput;
  const y = date.getUTCFullYear();
  let p1 = railwayP1Start(y);
  let railYear = y;
  if (date.getTime() < p1.getTime()) {
    p1 = railwayP1Start(y - 1);
    railYear = y - 1;
  }
  const daysSince = Math.floor((date.getTime() - p1.getTime()) / 86_400_000);
  const weekIndex = Math.floor(daysSince / 7); // 0-based
  const period = Math.min(13, Math.floor(weekIndex / 4) + 1);
  const week = weekIndex - (period - 1) * 4 + 1;
  return { period, week, railYear, yearLabel: yearLabelFor(railYear) };
}

function yearLabelFor(railYear: number): string {
  const from = String(railYear % 100).padStart(2, "0");
  const to = String((railYear + 1) % 100).padStart(2, "0");
  return `${from}/${to}`;
}

/**
 * Canonical ma_target_periods.period_name for a period — must stay identical
 * to the target_period_name Insight derives in migration 013
 * ("Period 4 26/27"), which is the join key between message snapshots and
 * their targets.
 */
export function periodName(period: number, railYear: number): string {
  return `Period ${period} ${yearLabelFor(railYear)}`;
}

// 52- vs 53-week rail year: P13 absorbs the extra week.
export function railwayWeeksInPeriod(period: number, railYear: number): number {
  if (period < 1 || period > 13) return 0;
  if (period < 13) return 4;
  const thisP1 = railwayP1Start(railYear);
  const nextP1 = railwayP1Start(railYear + 1);
  const totalWeeks = Math.round((nextP1.getTime() - thisP1.getTime()) / (7 * 86_400_000));
  return Math.max(4, totalWeeks - 48); // 48 weeks before P13 starts (12 × 4)
}

export function railwayPeriodBounds(period: number, railYear: number): { from: string; to: string } {
  const p1 = railwayP1Start(railYear);
  const fromMs = p1.getTime() + (period - 1) * 28 * 86_400_000;
  const weeks = railwayWeeksInPeriod(period, railYear);
  const toMs = fromMs + weeks * 7 * 86_400_000 - 86_400_000; // inclusive end
  return { from: isoDay(new Date(fromMs)), to: isoDay(new Date(toMs)) };
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shortDateUK(iso: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]}`;
}

// ─── Period window for the targets dropdown ──────────────────────────────────

export interface RailPeriodOption {
  period: number;
  railYear: number;
  name: string;      // "Period 4 26/27" — canonical period_name / join key
  label: string;     // "Period 4 26/27 · 5 Jul → 1 Aug"
  from: string;      // inclusive ISO start date
  to: string;        // inclusive ISO end date
  isCurrent: boolean;
}

/**
 * Every railway period whose date range intersects the window from
 * `monthsBack` calendar months before today to `monthsAhead` months after —
 * defaults to the previous 3 and next 15 months, so targets can be populated
 * ahead of time and auto-selected once the period arrives.
 */
export function listPeriodOptions(
  today: Date = new Date(),
  monthsBack = 3,
  monthsAhead = 15
): RailPeriodOption[] {
  const todayMs = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const windowFrom = Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - monthsBack, today.getUTCDate());
  const windowTo = Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + monthsAhead, today.getUTCDate());

  let { period, railYear } = railwayPeriodWeek(new Date(windowFrom));
  const out: RailPeriodOption[] = [];
  for (;;) {
    const { from, to } = railwayPeriodBounds(period, railYear);
    const fromMs = Date.parse(from + "T00:00:00Z");
    if (fromMs > windowTo) break;
    const toMs = Date.parse(to + "T00:00:00Z");
    const name = periodName(period, railYear);
    out.push({
      period,
      railYear,
      name,
      label: `${name} · ${shortDateUK(from)} → ${shortDateUK(to)}`,
      from,
      to,
      isCurrent: todayMs >= fromMs && todayMs <= toMs,
    });
    if (period === 13) { period = 1; railYear += 1; }
    else period += 1;
  }
  return out;
}

/** Canonical period_name for the railway period containing the given date. */
export function currentPeriodName(today: Date = new Date()): string {
  const { period, railYear } = railwayPeriodWeek(today);
  return periodName(period, railYear);
}
