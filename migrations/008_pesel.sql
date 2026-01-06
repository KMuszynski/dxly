-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 008: Add missing columns + PESEL + Visit scheduling
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Add PESEL to patients table
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.patients
  add column if not exists pesel varchar(11);

-- PESEL validation (11 digits)
alter table public.patients
  add constraint pesel_format_valid
  check (pesel is null or pesel ~ '^\d{11}$');

create unique index if not exists idx_patients_pesel 
  on public.patients(pesel) 
  where pesel is not null;

comment on column public.patients.pesel is
  'Polish national identification number (11 digits)';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Add visit status enum and column
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'visit_status') then
    create type visit_status as enum (
      'scheduled',      -- Future appointment, patient can add symptoms
      'checked_in',     -- Patient arrived
      'in_progress',    -- Doctor reviewing
      'completed',      -- Visit finished
      'cancelled'       -- Visit cancelled
    );
  end if;
end$$;

alter table public.visits
  add column if not exists status visit_status not null default 'scheduled';

create index if not exists idx_visits_status on public.visits(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Add source tracking to visit_symptoms
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'symptom_source') then
    create type symptom_source as enum ('patient', 'doctor', 'assistant');
  end if;
end$$;

alter table public.visit_symptoms
  add column if not exists source symptom_source not null default 'doctor',
  add column if not exists entered_by uuid references auth.users(id),
  add column if not exists follow_up_data jsonb;

comment on column public.visit_symptoms.source is
  'Who entered this symptom: patient (pre-visit), doctor, or assistant.';
comment on column public.visit_symptoms.follow_up_data is
  'JSON object with follow-up question answers from the diagnosis API format.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) RLS: Allow patients to INSERT symptoms on their own scheduled/checked_in visits
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='visit_symptoms' and policyname='visit_symptoms_insert_own_patient'
  ) then
    create policy visit_symptoms_insert_own_patient
      on public.visit_symptoms for insert
      with check (
        exists (
          select 1 from public.visits v
          where v.id = visit_symptoms.visit_id
            and v.patient_id = public.get_own_patient_id()
            and v.status in ('scheduled', 'checked_in')
        )
      );
  end if;
end$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) RLS: Allow patients to UPDATE their own symptoms on scheduled/checked_in visits
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='visit_symptoms' and policyname='visit_symptoms_update_own_patient'
  ) then
    create policy visit_symptoms_update_own_patient
      on public.visit_symptoms for update
      using (
        entered_by = auth.uid()
        and exists (
          select 1 from public.visits v
          where v.id = visit_symptoms.visit_id
            and v.status in ('scheduled', 'checked_in')
        )
      )
      with check (
        entered_by = auth.uid()
      );
  end if;
end$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) RLS: Allow patients to DELETE their own symptoms on scheduled/checked_in visits
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='visit_symptoms' and policyname='visit_symptoms_delete_own_patient'
  ) then
    create policy visit_symptoms_delete_own_patient
      on public.visit_symptoms for delete
      using (
        entered_by = auth.uid()
        and exists (
          select 1 from public.visits v
          where v.id = visit_symptoms.visit_id
            and v.status in ('scheduled', 'checked_in')
        )
      );
  end if;
end$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7) RLS: Allow clinic staff to INSERT visits (for scheduling)
-- ─────────────────────────────────────────────────────────────────────────────
-- This should already exist from migration 004, but let's ensure it covers insert
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='visits' and policyname='visits_insert_clinic_users'
  ) then
    create policy visits_insert_clinic_users
      on public.visits for insert
      with check (public.is_clinic_user());
  end if;
end$$;

commit;