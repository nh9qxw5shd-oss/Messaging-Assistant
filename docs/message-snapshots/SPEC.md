# Message Snapshots — Brief

Every **Save progress & build** press captures a snapshot of the built
message into Supabase, logged against **the message's own slot**. **Copying**
the message in its send window records that it went out (`sent_at`); a
separate **Mark … as sent** press does the same for a message sent another
way. The Derby Control hub cockpit counts a cadence message as issued only
from that mark. Snapshots give Insight a reliable, queryable record of what was reported
and what the metric standing was at each reporting point of the day.

## Slots

Slots are **Europe/London local times** (DST-aware — the same wall-clock times
apply in GMT and BST):

| Slot   | Local time | Message                      |
|--------|------------|------------------------------|
| `0530` | 05:30      | Start of Service             |
| `0900` | 09:00      | Tactical                     |
| `1500` | 15:00      | Tactical                     |
| `2200` | 22:00      | Tactical                     |

### Pinning rules (`src/lib/snapshots/messageSlot.ts`)

- **SoS tab** → slot `0530`, dated today, or tomorrow from 22:00.
- **Tactical tab** → the slot selected on the tab, dated at its nearest
  occurrence (within 12 hours either side of now). So the 09:00 message built
  at 09:20 is the `0900` snapshot, and `0900` picked at 22:30 is tomorrow's.
- **Safety and incident messages** are not on the cadence and are not captured.
- **Replace, not duplicate:** rebuilds overwrite that slot's snapshot
  wholesale (upsert on `(snapshot_date, slot)`), incrementing `build_count`
  and refreshing `last_built_at`.

### Tactical slot on auto

Auto stays on the current message until it is **marked as sent** (15 minutes
longer when logged on copy, so it can be pasted again or corrected), **moved on**
by hand (per browser, not logged), or **an hour past its booked time**; after
22:00 it is tomorrow's 09:00. Sent marks are read every minute, so a mark made
on one machine moves every open Assistant on.

### Sent marks

- `ma_mark_message_sent(...)` (same parameters as the capture RPC) stores the
  message as the snapshot of record and sets `sent_at` if it is not already
  set. The first mark's time is kept, so a correction rebuilt afterwards does
  not move it.
- `ma_unmark_message_sent(p_snapshot_date, p_slot)` clears a mark made in
  error (the Undo beside the sent time).
- Builds through `ma_capture_message_snapshot` never touch `sent_at`.
- `ma_mark_message_sent_on_copy(...)` is the same mark made by **Copy**. A
  copy logs the send only from 30 minutes before the booked time to an hour
  after (`copyLogsSent`), so a preview copied hours ahead is not counted.
- `sent_via` records which made the first mark: `copy` or `manual` (null on
  marks made before migration 004). The composer shows "logged on copy"
  beside the sent time; Undo clears both.
- A message still not logged 15 minutes after its booked time is flagged in
  the composer until two hours after it (`sendOverdue`). The hub cockpit
  flags it overdue on its own clock.

There is no way to read what went out on WhatsApp, so copying (the one step
every send passes through) stands in for it. The trade: a copy that is never
pasted shows as sent until someone presses Undo, where before a forgotten
press left a sent message showing as unsent.

Created by `supabase/migrations/003_message_sent.sql` and
`004_sent_on_copy.sql`.

## Storage — `ma_message_snapshots`

Created by `supabase/migrations/002_message_snapshots.sql`.

| Column             | Type          | Meaning                                                                 |
|--------------------|---------------|-------------------------------------------------------------------------|
| `id`               | `uuid`        | Primary key.                                                             |
| `snapshot_date`    | `date`        | London calendar date the slot belongs to.                                |
| `slot`             | `text`        | `0530` \| `0900` \| `1500` \| `2200`.                                    |
| `tab`              | `text`        | Tab built: `sos` or `tactical` (older rows may carry other tabs).        |
| `message`          | `text`        | Full built plain-text message, verbatim.                                 |
| `payload`          | `jsonb`       | Full structured content: `{ meta, state }` (complete tab state at build). |
| `metrics`          | `jsonb`       | Parsed metrics array — see element schema below.                          |
| `metrics_for_date` | `date`        | Date the metric values describe (see below).                             |
| `build_count`      | `integer`     | Build presses that landed on this slot (1, then +1 per replace).          |
| `first_built_at`   | `timestamptz` | First capture for this slot.                                             |
| `last_built_at`    | `timestamptz` | Most recent capture (the content stored).                                |
| `sent_at`          | `timestamptz` | When the message was marked as sent; null while only built.              |
| `sent_via`         | `text`        | `copy` or `manual`: how the first sent mark was made.                    |

Unique constraint: `(snapshot_date, slot)`. Index on `metrics_for_date`.

Writes go through the atomic RPC `ma_capture_message_snapshot(...)`
(`insert … on conflict do update`), so concurrent or rapid rebuilds can never
produce duplicate slot rows.

### `metrics` element schema

```json
{
  "name":   "Route T3 %",
  "value":  78.9,
  "target": 78.4,
  "amber":  73.4,
  "dir":    "higher",
  "rag":    "green",
  "notes":  null
}
```

- `name` matches **`ma_targets.name` exactly** (verbatim, no normalisation):
  `Route T3 %`, `EMR T3 %`, `EMR Can %`, `GTR T3 %`, `XC T3 %`.
- `0530` rows (built from the SoS tab) **additionally include
  `Current Period Variance`** as a parsed data point — the period variance
  value for the day the metrics describe. Its `target`/`amber` are `null`;
  its `rag` follows the variance rule (≥ 0 green, ≥ −5 amber, else red).
- `value`, `target`, `amber` are numbers or `null` (null = not entered / not
  numeric).
- `rag` is `green` | `amber` | `red` | `none` (`none` = no value entered).
- Tabs without a performance table (`safety_msg`) store `metrics: []`.

### `metrics_for_date`

- **`0530` rows: `snapshot_date` − 1 day.** The Start of Service message
  carries **yesterday's end-of-day standing**, so its metrics describe the
  previous day.
- All other slots: `metrics_for_date = snapshot_date`.

## Capture pipeline

`Save progress & build` (button or Ctrl+Enter) → `Composer.build()` →
`captureMessageSnapshot(pinForMessage(...))` (`src/lib/snapshots/capture.ts`).

`Copy` → builds, copies, then (in the send window) `writeMessageSent(..., "copy")`
→ `ma_mark_message_sent_on_copy`.
`Mark … as sent` → builds, then `writeMessageSent()` → `ma_mark_message_sent`.
Unlike capture, a failed mark is reported to the operator, so nobody is left
thinking a message was logged when it was not.

**Capture never blocks message building.** It is fire-and-forget:

- The built message is rendered, displayed and backed up first; capture runs
  after and returns `void`.
- Any failure — Supabase not configured, network down, RPC error, unexpected
  exception — is caught, logged with `console.warn`, and swallowed. The
  operator's build/copy flow is unaffected in every case.
- Builds of messages without a slot (safety, incident, the `targets` config
  tab) and empty builds are skipped.

Slot resolution is pure and unit-tested in `src/lib/snapshots/messageSlot.ts`
(`pinForMessage`, `activeTacticalSlot`); metric parsing is
`parseSnapshotMetrics` in `src/lib/snapshots/slots.ts`.

## Read contract (Insight)

Insight treats `ma_message_snapshots` as read-only and keys on
**`metrics_for_date`** — never on `snapshot_date` — so the 05:30
previous-day semantics are handled by the table, not by the reader.

**Standing of date `D` across the day** (one row per slot, chronological —
the lexicographic slot ordering `0530 < 0900 < 1500 < 2200` is chronological):

```sql
select snapshot_date, slot, tab, message, payload, metrics,
       metrics_for_date, build_count, last_built_at
from   ma_message_snapshots
where  metrics_for_date = :date
order  by snapshot_date asc, slot asc;
```

**End-of-day standing of date `D`** (the 05:30 message built the following
morning; this row also carries `Current Period Variance`):

```sql
select metrics
from   ma_message_snapshots
where  metrics_for_date = :date
and    slot = '0530';
```

**A single metric's value:** unpack the `metrics` array by exact name match:

```sql
select m ->> 'name'          as name,
       (m ->> 'value')::numeric as value,
       m ->> 'rag'           as rag
from   ma_message_snapshots s,
       jsonb_array_elements(s.metrics) m
where  s.metrics_for_date = :date
and    s.slot = '0530'
and    m ->> 'name' = 'Route T3 %';
```

supabase-js equivalent (reference implementation:
`fetchSnapshotsForMetricsDate` in `src/lib/supabase.ts`):

```ts
const { data } = await supabase
  .from("ma_message_snapshots")
  .select("*")
  .eq("metrics_for_date", "2026-07-06")
  .order("snapshot_date", { ascending: true })
  .order("slot", { ascending: true });
```

Guarantees Insight can rely on:

- At most **one row per `(snapshot_date, slot)`** — no dedup needed.
- `metrics` element `name`s match `ma_targets.name` exactly; join on equality.
- `message` is the exact text the operator copied; `payload.state` is the full
  structured tab state if field-level content is needed.
- A missing row means no message was built for that slot (capture is
  best-effort by design — it never blocks the operator).

## Acceptance checks

Slot pinning (all times Europe/London):

| # | Build time        | Expected pin                                        |
|---|-------------------|-----------------------------------------------------|
| 1 | 04:50             | `0530` today, `metrics_for_date` = yesterday        |
| 2 | 05:30 exactly     | `0530` today (slot minute itself still counts)      |
| 3 | 05:31             | `0900` today, `metrics_for_date` = today            |
| 4 | 14:59             | `1500` today                                        |
| 5 | 15:01             | `2200` today                                        |
| 6 | 22:00 exactly     | `2200` today                                        |
| 7 | 22:01             | **rollover:** `0530` tomorrow, `metrics_for_date` = today |
| 8 | 00:30             | `0530` today, `metrics_for_date` = yesterday        |

Behaviour:

- **Replace-not-duplicate:** build twice at e.g. 08:00 and 08:45 → exactly one
  `(today, 0900)` row containing the 08:45 content with `build_count = 2`.
- **Slot rollover:** build at 08:55 then 09:05 → two rows: `(today, 0900)` and
  `(today, 1500)`; the 0900 row is untouched by the 09:05 build.
- **DST:** pinning uses London wall-clock time, so checks 1–8 hold identically
  in GMT and BST (verified via `Intl` with `timeZone: "Europe/London"`).
- **0530 variance data point:** an SoS build pinned to `0530` stores
  `Current Period Variance` in `metrics` with its numeric value and variance
  RAG.
- **Never blocks:** with Supabase unreachable or unconfigured, Build still
  renders, backs up and copies the message; the only trace is a console
  warning.
