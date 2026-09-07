-- ===========================================================================
-- SafeStep – AI Child Guardian · Supabase schema
-- Run this whole file once in: Supabase Dashboard → SQL Editor → New query.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  email text not null default ''
);

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles on delete cascade,
  name text not null default 'My Child',
  age int not null default 9,
  pin text not null default '1234',
  daily_limit_min int not null default 120,
  bedtime text not null default '21:00',
  blocked_categories text[] not null default array['adult','violence','gambling','scam'],
  whitelist text[] not null default array[]::text[],   -- sites the parent always allows
  created_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles on delete cascade,
  child_id uuid not null references public.children on delete cascade,
  name text not null default 'Kid device',
  code text not null unique,
  device_token uuid not null default gen_random_uuid(),
  last_seen timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles on delete cascade,
  child_id uuid not null references public.children on delete cascade,
  device_id uuid references public.devices on delete set null,
  kind text not null default 'search',          -- search | site | video | app
  title text not null default '',
  url text,
  category text not null default 'general',
  status text not null default 'safe',          -- safe | monitored | blocked | awaiting
  approved boolean not null default false,
  risk_reason text,
  ts timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles on delete cascade,
  child_id uuid not null references public.children on delete cascade,
  activity_id uuid references public.activities on delete cascade,
  status text not null default 'pending',       -- pending | approved | denied
  severity text not null default 'medium',
  reason text not null default '',
  ts timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.usage (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices on delete cascade,
  child_id uuid not null references public.children on delete cascade,
  day date not null default current_date,
  app text not null default 'Portal',
  seconds int not null default 0,
  unique (device_id, day, app)
);

create table if not exists public.parent_settings (
  parent_id uuid primary key references public.profiles on delete cascade,
  auto_block boolean not null default true,
  safe_search boolean not null default true,
  youtube_restricted boolean not null default true,
  notifications boolean not null default true,
  portal_active boolean not null default true,   -- live data-stream toggle (pairing is permanent)
  fun_zone jsonb not null default '{"videos":true,"games":true,"coloring":true,"learning":true}'::jsonb
);

-- ---------------------------------------------------------------------------
-- SafeStep update #3 — idempotent upgrades so existing projects can simply
-- re-run this file after pulling the new features.
-- ---------------------------------------------------------------------------

alter table public.children add column if not exists whitelist text[] not null default array[]::text[];
alter table public.parent_settings add column if not exists portal_active boolean not null default true;
alter table public.parent_settings add column if not exists fun_zone jsonb
  not null default '{"videos":true,"games":true,"coloring":true,"learning":true}'::jsonb;

-- The kid portal may not leave the Fun Zone / portal without the parent PIN:
-- tamper notices stream into public.notifications (see notifications.sql).

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a parent signs up
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, coalesce(new.email,''),
          coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email,''), '@', 1)))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security: parents own their rows; kid portal uses RPCs only
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.children enable row level security;
alter table public.devices enable row level security;
alter table public.activities enable row level security;
alter table public.alerts enable row level security;
alter table public.usage enable row level security;
alter table public.parent_settings enable row level security;

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);

drop policy if exists "children own" on public.children;
create policy "children own" on public.children for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());
drop policy if exists "devices own" on public.devices;
create policy "devices own" on public.devices for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());
drop policy if exists "activities own" on public.activities;
create policy "activities own" on public.activities for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());
drop policy if exists "alerts own" on public.alerts;
create policy "alerts own" on public.alerts for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());
drop policy if exists "parent_settings own" on public.parent_settings;
create policy "parent_settings own" on public.parent_settings for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());
drop policy if exists "usage own" on public.usage;
create policy "usage own" on public.usage for all
  using (child_id in (select id from public.children where parent_id = auth.uid()))
  with check (child_id in (select id from public.children where parent_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Kid-portal RPCs (anon callable, security definer, token-gated)
-- ---------------------------------------------------------------------------

create or replace function public.kid_pair(pair_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  d public.devices%rowtype;
  c public.children%rowtype;
  s public.parent_settings%rowtype;
  used int;
begin
  select * into d from public.devices where devices.code = pair_code limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Invalid pairing code. Ask your parent to check the Devices page.');
  end if;
  select * into c from public.children where id = d.child_id;
  select * into s from public.parent_settings where parent_id = d.parent_id;
  select coalesce(sum(seconds), 0) into used from public.usage
    where device_id = d.id and day = current_date;
  update public.devices set last_seen = now() where id = d.id;
  return jsonb_build_object(
    'ok', true,
    'device_token', d.device_token,
    'child', jsonb_build_object('name', c.name, 'age', c.age),
    'settings', jsonb_build_object(
      'auto_block', coalesce(s.auto_block, true),
      'notifications', coalesce(s.notifications, true),
      'blocked_categories', coalesce(c.blocked_categories, array[]::text[]),
      'portal_active', coalesce(s.portal_active, true),
      'fun_zone', coalesce(s.fun_zone, '{"videos":true,"games":true,"coloring":true,"learning":true}'::jsonb),
      'whitelist', coalesce(c.whitelist, array[]::text[])
    ),
    'used_min', round(used / 60.0),
    'limit_min', c.daily_limit_min
  );
end; $$;

create or replace function public.kid_event(token uuid, payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  d public.devices%rowtype;
  act public.activities%rowtype;
  al public.alerts%rowtype;
begin
  select * into d from public.devices where device_token = token;
  if not found then return jsonb_build_object('ok', false, 'error', 'Unknown device'); end if;

  -- Live-stream toggle: a deactivated portal drops events (pairing stays,
  -- only the data stream is disconnected).
  if not coalesce((select p.portal_active from public.parent_settings p where p.parent_id = d.parent_id), true) then
    return jsonb_build_object('ok', true, 'paused', true);
  end if;

  insert into public.activities
    (parent_id, child_id, device_id, kind, title, url, category, status, risk_reason)
  values
    (d.parent_id, d.child_id, d.id,
     coalesce(payload ->> 'kind', 'search'),
     coalesce(payload ->> 'title', ''),
     payload ->> 'url',
     coalesce(payload ->> 'category', 'general'),
     coalesce(payload ->> 'status', 'safe'),
     payload ->> 'reason')
  returning * into act;

  if act.status = 'awaiting' then
    insert into public.alerts (parent_id, child_id, activity_id, status, severity, reason)
    values (d.parent_id, d.child_id, act.id, 'pending',
            coalesce(payload ->> 'severity', 'medium'),
            coalesce(payload ->> 'reason', 'Flagged by SafeStep AI.'))
    returning * into al;
    return jsonb_build_object('ok', true, 'activity_id', act.id, 'alert_id', al.id);
  end if;
  return jsonb_build_object('ok', true, 'activity_id', act.id);
end; $$;

create or replace function public.kid_heartbeat(token uuid, secs int, app text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  d public.devices%rowtype;
  c public.children%rowtype;
  used int;
begin
  select * into d from public.devices where device_token = token;
  if not found then return jsonb_build_object('ok', false, 'error', 'Unknown device'); end if;
  select * into c from public.children where id = d.child_id;
  select coalesce(sum(seconds), 0) into used from public.usage
    where device_id = d.id and day = current_date;

  -- Paused portal: stay reachable (so it can wake up) but record nothing.
  if not coalesce((select p.portal_active from public.parent_settings p where p.parent_id = d.parent_id), true) then
    update public.devices set last_seen = now() where id = d.id;
    return jsonb_build_object('ok', true, 'paused', true,
      'used_min', round(used / 60.0), 'limit_min', c.daily_limit_min, 'locked', false);
  end if;

  insert into public.usage (device_id, child_id, day, app, seconds)
  values (d.id, d.child_id, current_date, coalesce(app, 'Portal'), greatest(secs, 0))
  on conflict (device_id, day, app)
  do update set seconds = public.usage.seconds + greatest(secs, 0);

  update public.devices set last_seen = now() where id = d.id;
  select coalesce(sum(seconds), 0) into used from public.usage
    where device_id = d.id and day = current_date;

  return jsonb_build_object(
    'ok', true,
    'paused', false,
    'used_min', round(used / 60.0),
    'limit_min', c.daily_limit_min,
    'locked', used >= c.daily_limit_min * 60
  );
end; $$;

create or replace function public.kid_poll(token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  d public.devices%rowtype;
  c public.children%rowtype;
  s public.parent_settings%rowtype;
  used int;
  decisions jsonb;
begin
  select * into d from public.devices where device_token = token;
  if not found then return jsonb_build_object('ok', false, 'error', 'Unknown device'); end if;
  select * into c from public.children where id = d.child_id;
  select * into s from public.parent_settings where parent_id = d.parent_id;
  select coalesce(sum(seconds), 0) into used from public.usage
    where device_id = d.id and day = current_date;

  -- A paused portal still polls, so it wakes up the moment the parent
  -- re-activates the live stream from the dashboard.
  update public.devices set last_seen = now() where id = d.id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'activity_id', a.id, 'status', a.status, 'approved', a.approved)), '[]'::jsonb)
  into decisions
  from public.activities a
  where a.device_id = d.id and a.ts > now() - interval '12 hours';

  return jsonb_build_object(
    'ok', true,
    'decisions', decisions,
    -- child profile so the kid portal reflects parent edits (name/age) live
    'child', jsonb_build_object('name', c.name, 'age', c.age),
    'settings', jsonb_build_object(
      'auto_block', coalesce(s.auto_block, true),
      'notifications', coalesce(s.notifications, true),
      'blocked_categories', coalesce(c.blocked_categories, array[]::text[]),
      'portal_active', coalesce(s.portal_active, true),
      'fun_zone', coalesce(s.fun_zone, '{"videos":true,"games":true,"coloring":true,"learning":true}'::jsonb),
      'whitelist', coalesce(c.whitelist, array[]::text[])
    ),
    'used_min', round(used / 60.0),
    'limit_min', c.daily_limit_min
  );
end; $$;

grant execute on function public.kid_pair(text) to anon, authenticated;
grant execute on function public.kid_event(uuid, jsonb) to anon, authenticated;
grant execute on function public.kid_heartbeat(uuid, int, text) to anon, authenticated;
grant execute on function public.kid_poll(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Account deletion: authenticated user can self-delete; cascades via FK
-- ---------------------------------------------------------------------------

create or replace function public.delete_user_account()
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Delete child data first (FKs have ON DELETE CASCADE but be explicit)
  delete from public.activities where parent_id = uid;
  delete from public.alerts where parent_id = uid;
  delete from public.notifications where parent_id = uid;
  delete from public.usage where child_id in (select id from public.children where parent_id = uid);
  delete from public.devices where parent_id = uid;
  delete from public.children where parent_id = uid;
  delete from public.parent_settings where parent_id = uid;
  delete from public.profiles where id = uid;

  -- Remove the auth user (security definer can reach into auth schema)
  delete from auth.users where id = uid;
end; $$;

grant execute on function public.delete_user_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: stream changes to the authenticated parent dashboard
-- ---------------------------------------------------------------------------

do $$ declare t text;
begin
  foreach t in array array['activities','alerts','usage','devices','children','parent_settings'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
