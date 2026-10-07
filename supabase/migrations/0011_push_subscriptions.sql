-- Phase 5: banners on phones and laptops (web push). Adds one table; changes
-- nothing that exists. Design: docs/push-and-email-plan.md, section 1.
--
-- A device belongs to a person, not a workspace: one phone gets banners from
-- every workspace its owner is in, and each banner names the workspace.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- The browser's private address for this device. Unique: one browser, one owner.
  endpoint text not null unique check (char_length(endpoint) <= 2048),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 200),
  label text not null default 'This device' check (char_length(label) <= 60),
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Your devices are yours alone. The app only ever lists a device's id, label
-- and date; the address and keys are read by the server, with the service key,
-- to send. The server, not the browser, checks the address belongs to Apple, Google,
-- Mozilla or Microsoft before saving it (lib/push/hosts.ts), so there are no
-- insert or update policies for ordinary users.
create policy "see own devices" on public.push_subscriptions
  for select using (user_id = (select auth.uid()));
create policy "remove own devices" on public.push_subscriptions
  for delete using (user_id = (select auth.uid()));
