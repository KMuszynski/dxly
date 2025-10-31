begin;

-- 1) Enum for user roles
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_user_type') then
    create type app_user_type as enum ('doctor', 'assistant');
  end if;
end$$;

-- 2) Table definition
create table if not exists public.users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  type app_user_type not null default 'assistant',
  name text not null,
  surname text not null,
  full_name text generated always as (
    trim(coalesce(name,'') || ' ' || coalesce(surname,''))
  ) stored,
  profile_picture text, -- URL to Supabase Storage or external resource
  specialization text,  -- optional; only valid for doctors
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Doctors can have specialization; assistants cannot
  constraint specialization_doctor_only
    check (
      (type = 'doctor') or (specialization is null)
    ),
  constraint profile_picture_is_url
    check (profile_picture is null or profile_picture ~ '^https?://')
);

comment on table public.users is
  'Profiles linked to auth.users. Includes role (doctor/assistant), name, surname, profile picture URL, and optional specialization for doctors.';

-- 3) Enable Row-Level Security
alter table public.users enable row level security;

-- Policies
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'users' and policyname = 'users_select_own'
  ) then
    create policy users_select_own
      on public.users for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'users' and policyname = 'users_update_own'
  ) then
    create policy users_update_own
      on public.users for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'users' and policyname = 'users_insert_own'
  ) then
    create policy users_insert_own
      on public.users for insert
      with check (auth.uid() = user_id);
  end if;
end$$;

-- 4) Trigger for updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

-- 5) Trigger to auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type app_user_type;
  v_name text;
  v_surname text;
  v_profile_picture text;
  v_specialization text;
begin
  if new.raw_user_meta_data ? 'type' then
    begin
      v_type := (new.raw_user_meta_data->>'type')::app_user_type;
    exception when others then
      v_type := 'assistant';
    end;
  else
    v_type := 'assistant';
  end if;

  v_name := coalesce(nullif(new.raw_user_meta_data->>'name', ''), 'Unnamed');
  v_surname := coalesce(nullif(new.raw_user_meta_data->>'surname', ''), 'User');
  v_profile_picture := nullif(new.raw_user_meta_data->>'profile_picture', '');
  v_specialization := nullif(new.raw_user_meta_data->>'specialization', '');

  -- only allow specialization for doctors
  if v_type <> 'doctor' then
    v_specialization := null;
  end if;

  insert into public.users (user_id, type, name, surname, profile_picture, specialization)
  values (new.id, v_type, v_name, v_surname, v_profile_picture, v_specialization)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 6) Indexes
create index if not exists idx_users_type on public.users(type);
create index if not exists idx_users_specialization_doctor
  on public.users(specialization)
  where type = 'doctor';

commit;