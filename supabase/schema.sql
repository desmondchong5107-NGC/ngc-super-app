-- NGC Super App push-notification schema.
-- The deployed project stores generated VAPID credentials and an admin-token hash.
-- No private credential is committed to this file.

create table if not exists public.push_settings (
  id smallint primary key check (id = 1),
  vapid_public_key text not null,
  vapid_private_key text not null,
  admin_token_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  subscription jsonb not null,
  user_agent text,
  enabled boolean not null default true,
  failure_count integer not null default 0 check (failure_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_success_at timestamptz
);

alter table public.push_settings enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.push_settings force row level security;
alter table public.push_subscriptions force row level security;

revoke all on table public.push_settings from anon, authenticated;
revoke all on table public.push_subscriptions from anon, authenticated;
grant all on table public.push_settings to service_role;
grant all on table public.push_subscriptions to service_role;

create policy "deny direct access to push settings"
on public.push_settings
for all
to anon, authenticated
using (false)
with check (false);

create policy "deny direct access to push subscriptions"
on public.push_subscriptions
for all
to anon, authenticated
using (false)
with check (false);

create or replace function public.increment_push_failure(target_endpoint text)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.push_subscriptions
  set failure_count = failure_count + 1,
      updated_at = now()
  where endpoint = target_endpoint;
$$;

revoke all on function public.increment_push_failure(text) from public, anon, authenticated;
grant execute on function public.increment_push_failure(text) to service_role;
