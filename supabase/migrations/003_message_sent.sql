-- Messaging Assistant — Supabase migration 003
-- "Mark as sent": a build saves progress, a separate press records that the
-- message went out. Additive only: one nullable column and two functions.
-- Builds keep landing through ma_capture_message_snapshot, which leaves
-- sent_at alone, so a correction rebuilt after sending keeps the sent time.

alter table ma_message_snapshots add column if not exists sent_at timestamptz;

comment on column ma_message_snapshots.sent_at is
  'When the message for this slot was marked as sent (first mark wins). Null while it has only been built.';

-- Record the message as sent: store the content as the snapshot of record and
-- stamp sent_at if it is not already set. Returns the sent time.
create or replace function ma_mark_message_sent(
  p_snapshot_date    date,
  p_slot             text,
  p_tab              text,
  p_message          text,
  p_payload          jsonb,
  p_metrics          jsonb,
  p_metrics_for_date date
) returns timestamptz
language sql
as $$
  insert into ma_message_snapshots
    (snapshot_date, slot, tab, message, payload, metrics, metrics_for_date, sent_at)
  values
    (p_snapshot_date, p_slot, p_tab, p_message, p_payload, p_metrics, p_metrics_for_date, now())
  on conflict (snapshot_date, slot) do update set
    tab              = excluded.tab,
    message          = excluded.message,
    payload          = excluded.payload,
    metrics          = excluded.metrics,
    metrics_for_date = excluded.metrics_for_date,
    build_count      = ma_message_snapshots.build_count + 1,
    last_built_at    = now(),
    sent_at          = coalesce(ma_message_snapshots.sent_at, now())
  returning sent_at;
$$;

comment on function ma_mark_message_sent is
  'Mark the message for (snapshot_date, slot) as sent, storing its content; the first mark''s time is kept.';

-- Undo a mark made in error. The built content stays.
create or replace function ma_unmark_message_sent(
  p_snapshot_date date,
  p_slot          text
) returns void
language sql
as $$
  update ma_message_snapshots
     set sent_at = null
   where snapshot_date = p_snapshot_date
     and slot = p_slot;
$$;

comment on function ma_unmark_message_sent is
  'Clear the sent mark for (snapshot_date, slot); the built message is kept.';
