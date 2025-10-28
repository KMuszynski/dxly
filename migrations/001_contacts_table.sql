create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null check (position('@' in email) > 1),
  message text not null,
  created_at timestamptz not null default now(),
  user_agent text,
  ip inet
);

-- Lock it down. Only the server (service role) will write.
alter table public.contacts enable row level security;

create policy "no direct inserts from anon"
on public.contacts
for insert
to anon, authenticated
with check (false);
