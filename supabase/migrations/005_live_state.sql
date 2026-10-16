-- Messaging Assistant — Supabase migration 005
-- Live shared state. The draft of each section (SoS, strategic AM/PM,
-- tactical, safety, route meta, incidents) is held here so every open copy, on
-- any machine, shows the same content. Each section is its own row with its
-- own revision, so editing one never touches another. Browser storage stays as
-- the offline copy. Additive only.

create sequence if not exists ma_live_state_rev_seq;

create table if not exists ma_live_state (
  section    text primary key
             check (section in ('meta', 'sos', 'str_am', 'str_pm', 'tac', 'safety_msg', 'incidents')),
  state      jsonb       not null,
  rev        bigint      not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

comment on table ma_live_state is
  'Live draft of each Messaging Assistant section, shared by every open copy. Written only through ma_live_put; rev rises on every write (one sequence across sections, so a reader can ask for everything newer than the last rev it saw).';

create index if not exists ma_live_state_rev_idx on ma_live_state (rev);

-- Reads are open (the hub and every copy poll it); writes go through the function.
alter table ma_live_state enable row level security;
do $$ begin
  create policy ma_live_state_read on ma_live_state for select to anon, authenticated using (true);
exception when duplicate_object then null; end $$;

-- Write a section if nobody has written it since p_base_rev (0 for a section
-- that has never been written). On success returns ok with the new rev; if the
-- section moved on, returns not ok with the current state and rev, for the
-- caller to merge and try again.
create or replace function ma_live_put(
  p_section  text,
  p_state    jsonb,
  p_base_rev bigint,
  p_client   text
) returns table (ok boolean, rev bigint, state jsonb)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  cur ma_live_state%rowtype;
  next_rev bigint;
begin
  select * into cur from ma_live_state s where s.section = p_section for update;
  if not found then
    if p_base_rev <> 0 then
      return query select false, 0::bigint, null::jsonb;
      return;
    end if;
    next_rev := nextval('ma_live_state_rev_seq');
    insert into ma_live_state (section, state, rev, updated_by)
    values (p_section, p_state, next_rev, p_client)
    on conflict (section) do nothing;
    if found then
      return query select true, next_rev, p_state;
    else
      return query select false, s.rev, s.state from ma_live_state s where s.section = p_section;
    end if;
    return;
  end if;
  if cur.rev <> p_base_rev then
    return query select false, cur.rev, cur.state;
    return;
  end if;
  next_rev := nextval('ma_live_state_rev_seq');
  update ma_live_state s
     set state = p_state, rev = next_rev, updated_at = now(), updated_by = p_client
   where s.section = p_section;
  return query select true, next_rev, p_state;
end;
$$;

comment on function ma_live_put is
  'Write one section of the live draft if it is still at p_base_rev; otherwise return the current state and rev to merge.';

grant execute on function ma_live_put(text, jsonb, bigint, text) to anon, authenticated;
