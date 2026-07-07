-- Messaging Assistant — Supabase migration 002
-- Message snapshots captured on every "Build message" press.
-- One row per (snapshot_date, slot); rebuilds before the slot passes replace
-- the row in place (build_count increments). Slots are Europe/London local
-- times: 05:30, 09:00, 15:00, 22:00.

create table if not exists ma_message_snapshots (
  id               uuid primary key default gen_random_uuid(),
  snapshot_date    date not null,
  slot             text not null check (slot in ('0530', '0900', '1500', '2200')),
  tab              text not null,
  message          text not null,
  payload          jsonb not null default '{}'::jsonb,
  metrics          jsonb not null default '[]'::jsonb,
  metrics_for_date date not null,
  build_count      integer not null default 1,
  first_built_at   timestamptz not null default now(),
  last_built_at    timestamptz not null default now(),
  unique (snapshot_date, slot)
);

comment on table ma_message_snapshots is
  'Point-in-time snapshots of built messages, one per (snapshot_date, slot). Slots are Europe/London local times.';
comment on column ma_message_snapshots.snapshot_date is
  'Europe/London calendar date the slot belongs to (rolls to tomorrow for builds after 22:00).';
comment on column ma_message_snapshots.slot is
  'Slot the build was pinned to: 0530, 0900, 1500 or 2200 (Europe/London).';
comment on column ma_message_snapshots.tab is
  'Message tab that was built: sos, strategic_am, strategic_pm, tactical or safety_msg.';
comment on column ma_message_snapshots.message is
  'Full built plain-text message exactly as produced by the composer.';
comment on column ma_message_snapshots.payload is
  'Full structured message content: { meta, state } where state is the complete tab state at build time.';
comment on column ma_message_snapshots.metrics is
  'Parsed metrics array. Element names match ma_targets.name exactly; 0530 rows additionally include "Current Period Variance".';
comment on column ma_message_snapshots.metrics_for_date is
  'Date the metric values describe. Previous day for 0530 rows (yesterday''s end-of-day standing), snapshot_date otherwise.';
comment on column ma_message_snapshots.build_count is
  'Number of Build presses that landed on this slot (1 on first capture, +1 per replace).';

create index if not exists ma_message_snapshots_metrics_date_idx
  on ma_message_snapshots (metrics_for_date);

-- Atomic capture: insert the slot's snapshot, or replace it wholesale if a
-- build already landed on the same (snapshot_date, slot), bumping build_count.
create or replace function ma_capture_message_snapshot(
  p_snapshot_date    date,
  p_slot             text,
  p_tab              text,
  p_message          text,
  p_payload          jsonb,
  p_metrics          jsonb,
  p_metrics_for_date date
) returns void
language sql
as $$
  insert into ma_message_snapshots
    (snapshot_date, slot, tab, message, payload, metrics, metrics_for_date)
  values
    (p_snapshot_date, p_slot, p_tab, p_message, p_payload, p_metrics, p_metrics_for_date)
  on conflict (snapshot_date, slot) do update set
    tab              = excluded.tab,
    message          = excluded.message,
    payload          = excluded.payload,
    metrics          = excluded.metrics,
    metrics_for_date = excluded.metrics_for_date,
    build_count      = ma_message_snapshots.build_count + 1,
    last_built_at    = now();
$$;

comment on function ma_capture_message_snapshot is
  'Upsert a message snapshot for (snapshot_date, slot): replace-not-duplicate, incrementing build_count on conflict.';
