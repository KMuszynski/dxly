begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0) Extensions (for gen_random_uuid)
-- ─────────────────────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Enums & Helper Functions
-- ─────────────────────────────────────────────────────────────────────────────

-- Gender enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_gender') then
    create type app_gender as enum ('female', 'male', 'other', 'unknown');
  end if;
end$$;

-- Helper: identify clinic users (doctor/assistant) via public.users
create or replace function public.is_clinic_user()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.users u
    where u.user_id = auth.uid()
      and u.type in ('doctor','assistant')
  );
$$;

comment on function public.is_clinic_user() is
  'True if auth.uid() exists in public.users with type doctor/assistant.';

-- Shared updated_at trigger fn (idempotent)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) PATIENTS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (length(trim(first_name)) > 0),
  last_name  text not null check (length(trim(last_name)) > 0),
  date_of_birth date not null
    check (date_of_birth <= current_date and date_of_birth >= date '1900-01-01'),
  gender app_gender not null default 'unknown',
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_format_valid
    check (
      email is null
      or email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
    ),
  constraint phone_format_basic
    check (
      phone is null
      or phone ~ '^[0-9+\-\s().]{6,}$'
    )
);

comment on table public.patients is
  'Patients (demographics & contact info). Extend later as needed.';

drop trigger if exists trg_patients_updated_at on public.patients;
create trigger trg_patients_updated_at
before update on public.patients
for each row execute function public.set_updated_at();

create index if not exists idx_patients_last_name on public.patients (last_name);
create index if not exists idx_patients_email on public.patients (email) where email is not null;
create index if not exists idx_patients_phone on public.patients (phone) where phone is not null;

alter table public.patients enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='patients' and policyname='patients_rw_clinic_users'
  ) then
    create policy patients_rw_clinic_users
      on public.patients
      for all
      using (public.is_clinic_user())
      with check (public.is_clinic_user());
  end if;
end$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) VISITS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_id uuid not null references public.users(user_id) on delete restrict,
  visit_date timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
  -- NOTE: "doctor_id is a doctor" enforced via constraint trigger below
);

comment on table public.visits is
  'Each clinical visit; links patient and doctor. Symptom/diagnosis items in child tables.';

drop trigger if exists trg_visits_updated_at on public.visits;
create trigger trg_visits_updated_at
before update on public.visits
for each row execute function public.set_updated_at();

create index if not exists idx_visits_patient on public.visits (patient_id);
create index if not exists idx_visits_doctor on public.visits (doctor_id);
create index if not exists idx_visits_date on public.visits (visit_date);

alter table public.visits enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='visits' and policyname='visits_rw_clinic_users'
  ) then
    create policy visits_rw_clinic_users
      on public.visits
      for all
      using (public.is_clinic_user())
      with check (public.is_clinic_user());
  end if;
end$$;

-- Enforce: doctor_id must belong to a user with type = 'doctor' (no subquery-in-CHECK)
create or replace function public.ensure_doctor_id_is_doctor()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.users u
    where u.user_id = new.doctor_id
      and u.type = 'doctor'
  ) then
    raise exception 'doctor_id % is not a doctor user', new.doctor_id
      using errcode = '23514'; -- integrity constraint violation
  end if;
  return new;
end;
$$;

drop trigger if exists visits_doctor_id_is_doctor on public.visits;
create constraint trigger visits_doctor_id_is_doctor
after insert or update of doctor_id on public.visits
deferrable initially immediate
for each row execute function public.ensure_doctor_id_is_doctor();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) VISIT SYMPTOMS (one-to-many per visit)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.visit_symptoms (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  symptom text not null check (length(trim(symptom)) > 0),
  duration text, -- free text for now; switch to INTERVAL later if needed
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.visit_symptoms is
  'Symptom items linked to a visit. One visit can have many symptoms.';

drop trigger if exists trg_visit_symptoms_updated_at on public.visit_symptoms;
create trigger trg_visit_symptoms_updated_at
before update on public.visit_symptoms
for each row execute function public.set_updated_at();

create index if not exists idx_visit_symptoms_visit on public.visit_symptoms (visit_id);

alter table public.visit_symptoms enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='visit_symptoms' and policyname='visit_symptoms_rw_clinic_users'
  ) then
    create policy visit_symptoms_rw_clinic_users
      on public.visit_symptoms
      for all
      using (public.is_clinic_user())
      with check (public.is_clinic_user());
  end if;
end$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) VISIT DIAGNOSES (one-to-many per visit)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.visit_diagnoses (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  diagnosis text not null check (length(trim(diagnosis)) > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.visit_diagnoses is
  'Diagnosis items linked to a visit. Add ICD-10/SNOMED columns later if desired.';

drop trigger if exists trg_visit_diagnoses_updated_at on public.visit_diagnoses;
create trigger trg_visit_diagnoses_updated_at
before update on public.visit_diagnoses
for each row execute function public.set_updated_at();

create index if not exists idx_visit_diagnoses_visit on public.visit_diagnoses (visit_id);

alter table public.visit_diagnoses enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='visit_diagnoses' and policyname='visit_diagnoses_rw_clinic_users'
  ) then
    create policy visit_diagnoses_rw_clinic_users
      on public.visit_diagnoses
      for all
      using (public.is_clinic_user())
      with check (public.is_clinic_user());
  end if;
end$$;

commit;
