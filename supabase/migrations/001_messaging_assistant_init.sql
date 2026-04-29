-- Messaging Assistant — Supabase migration 001
-- All tables prefixed ma_ to avoid conflicts with other project data.
-- Safe to run on an existing Supabase project.

-- ─── Target periods ───────────────────────────────────────────────────────────
-- Stores named target sets (e.g. "Period 12 2025/26").
-- Only one period should have is_active = true at any time.

create table if not exists ma_target_periods (
  id          uuid primary key default gen_random_uuid(),
  period_name text not null,
  is_active   boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on table ma_target_periods is 'Named target periods for the Messaging Assistant (e.g. "Period 12 2025/26").';

-- ─── Targets ─────────────────────────────────────────────────────────────────
-- Individual performance metrics per period.
-- Propagated to all message type perf tables on load.

create table if not exists ma_targets (
  id          uuid primary key default gen_random_uuid(),
  period_id   uuid not null references ma_target_periods(id) on delete cascade,
  name        text not null,
  target      numeric,
  amber       numeric,
  dir         text not null check (dir in ('higher', 'lower')) default 'higher',
  sort_order  integer not null default 0
);

comment on table ma_targets is 'Performance metric targets per period for the Messaging Assistant.';
create index if not exists ma_targets_period_idx on ma_targets(period_id);

-- ─── Seasonal templates ───────────────────────────────────────────────────────
-- Pre-written seasonal slot content selectable in the SoS and Tactical tabs.
-- tab column scopes templates to the relevant message type.

create table if not exists ma_seasonal_templates (
  id         uuid primary key default gen_random_uuid(),
  season     text not null,
  tab        text not null check (tab in ('sos', 'tactical')),
  content    text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (season, tab)
);

comment on table ma_seasonal_templates is 'Seasonal slot text templates for SoS and Tactical messages.';

-- ─── Seed data ────────────────────────────────────────────────────────────────
-- Example seasonal templates. Remove or modify as required.

insert into ma_seasonal_templates (season, tab, content) values
  ('Autumn Leaf Fall',   'sos',      'Leaf fall conditions are in effect across the route. Rail head treatment trains are in operation. Drivers are reminded of adhesion protocols and the need to approach stations with care.'),
  ('Autumn Leaf Fall',   'tactical', 'Adhesion conditions remain in place. RHTT operations ongoing. Monitor for delay attribution to adhesion-related braking.'),
  ('Summer Heat',        'sos',      'High rail temperatures forecast today. Track speed restrictions are in place on heat-affected sections. Engineering teams are monitoring critical locations.'),
  ('Summer Heat',        'tactical', 'Temperature-related TSRs remain in force. Monitor for heat-affected infrastructure and fleet performance.'),
  ('Engineering Blockade', 'sos',    'Major engineering blockade in progress. Replacement bus services are operating between [location] and [location]. Passengers are advised to check before travelling.')
on conflict (season, tab) do nothing;
