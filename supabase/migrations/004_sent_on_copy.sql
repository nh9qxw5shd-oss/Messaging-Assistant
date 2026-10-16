-- Messaging Assistant — Supabase migration 004
-- Copy logs the send. Copying a scheduled message inside its send window marks
-- it as sent, so the desk no longer has to remember a second press; "Mark as
-- sent" stays for a message that went out another way. sent_via records which
-- of the two made the mark. Additive only: one nullable column, one new
-- function, and the existing mark/unmark functions replaced with the same
-- signatures (no overloads, nothing dropped).

alter table ma_message_snapshots add column if not exists sent_via text;

do $$ begin
  alter table ma_message_snapshots
    add constraint ma_message_snapshots_sent_via_check check (sent_via in ('copy', 'manual'));
exception when duplicate_object then null; end $$;

comment on column ma_message_snapshots.sent_via is
  'How the sent mark was made: copy (logged when the message was copied in its send window) or manual (Mark as sent). Null before migration 004 or while unsent.';

-- Mark by hand: unchanged behaviour, now also recording sent_via = manual.
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
    (snapshot_date, slot, tab, message, payload, metrics, metrics_for_date, sent_at, sent_via)
  values
    (p_snapshot_date, p_slot, p_tab, p_message, p_payload, p_metrics, p_metrics_for_date, now(), 'manual')
  on conflict (snapshot_date, slot) do update set
    tab              = excluded.tab,
    message          = excluded.message,
    payload          = excluded.payload,
    metrics          = excluded.metrics,
    metrics_for_date = excluded.metrics_for_date,
    build_count      = ma_message_snapshots.build_count + 1,
    last_built_at    = now(),
    sent_via         = case when ma_message_snapshots.sent_at is null then 'manual' else ma_message_snapshots.sent_via end,
    sent_at          = coalesce(ma_message_snapshots.sent_at, now())
  returning sent_at;
$$;

-- Mark on copy: the same, recording sent_via = copy. The first mark's time and
-- method are kept; a later copy only refreshes the stored content.
create or replace function ma_mark_message_sent_on_copy(
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
    (snapshot_date, slot, tab, message, payload, metrics, metrics_for_date, sent_at, sent_via)
  values
    (p_snapshot_date, p_slot, p_tab, p_message, p_payload, p_metrics, p_metrics_for_date, now(), 'copy')
  on conflict (snapshot_date, slot) do update set
    tab              = excluded.tab,
    message          = excluded.message,
    payload          = excluded.payload,
    metrics          = excluded.metrics,
    metrics_for_date = excluded.metrics_for_date,
    build_count      = ma_message_snapshots.build_count + 1,
    last_built_at    = now(),
    sent_via         = case when ma_message_snapshots.sent_at is null then 'copy' else ma_message_snapshots.sent_via end,
    sent_at          = coalesce(ma_message_snapshots.sent_at, now())
  returning sent_at;
$$;

comment on function ma_mark_message_sent_on_copy is
  'Mark the message for (snapshot_date, slot) as sent because it was copied in its send window; the first mark''s time and method are kept.';

-- Undo a mark made in error. The built content stays.
create or replace function ma_unmark_message_sent(
  p_snapshot_date date,
  p_slot          text
) returns void
language sql
as $$
  update ma_message_snapshots
     set sent_at = null,
         sent_via = null
   where snapshot_date = p_snapshot_date
     and slot = p_slot;
$$;
