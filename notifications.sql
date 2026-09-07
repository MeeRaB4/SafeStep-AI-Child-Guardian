-- ===========================================================================
-- SafeStep – update #2: parent notifications + kid remove-guard
-- Run this whole file once in: Supabase Dashboard → SQL Editor → New query.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Persistent notifications (kid-device events like tamper attempts)
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles on delete cascade,
  child_id uuid references public.children on delete cascade,
  text text not null default '',
  read boolean not null default false,
  ts timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "notifications own" on public.notifications;
create policy "notifications own" on public.notifications for all
  using (parent_id = auth.uid()) with check (parent_id = auth.uid());

-- Kid device reports an event (e.g. tamper attempt) to its parent
create or replace function public.kid_notice(token uuid, message text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  d public.devices%rowtype;
begin
  select * into d from public.devices where device_token = token;
  if not found then return jsonb_build_object('ok', false, 'error', 'Unknown device'); end if;
  insert into public.notifications (parent_id, child_id, text)
  values (d.parent_id, d.child_id, coalesce(message, ''));
  return jsonb_build_object('ok', true);
end; $$;

-- Kid device verifies the parent PIN (required to remove SafeStep)
create or replace function public.kid_check_pin(token uuid, pin text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  d public.devices%rowtype;
  c public.children%rowtype;
begin
  select * into d from public.devices where device_token = token;
  if not found then return jsonb_build_object('ok', false, 'error', 'Unknown device'); end if;
  select * into c from public.children where id = d.child_id;
  return jsonb_build_object('ok', c.pin = pin);
end; $$;

grant execute on function public.kid_notice(uuid, text) to anon, authenticated;
grant execute on function public.kid_check_pin(uuid, text) to anon, authenticated;

-- Stream notifications to the parent dashboard
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;
