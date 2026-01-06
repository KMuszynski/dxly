-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 006b: Patient User Support
-- RUN THIS AFTER 006a HAS BEEN COMMITTED
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Link patients table to auth.users (optional login capability)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.patients
  add column if not exists user_id uuid unique references auth.users(id) on delete set null;

comment on column public.patients.user_id is
  'Optional link to auth.users. When set, this patient can log in and access their own data.';

create index if not exists idx_patients_user_id 
  on public.patients(user_id) 
  where user_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Add helper function to check if user is a patient
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.is_patient_user()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.users u
    where u.user_id = auth.uid()
      and u.type = 'patient'
  );
$$;

comment on function public.is_patient_user() is
  'True if auth.uid() exists in public.users with type = patient.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Helper function to get patient's own patient record
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_own_patient_id()
returns uuid
language sql
stable
as $$
  select p.id
  from public.patients p
  where p.user_id = auth.uid()
  limit 1;
$$;

comment on function public.get_own_patient_id() is
  'Returns the patient.id for the currently authenticated patient user.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) Update RLS policies for patients table
-- ─────────────────────────────────────────────────────────────────────────────
create policy patients_select_own
  on public.patients for select
  using (
    public.is_clinic_user()
    or user_id = auth.uid()
  );

create policy patients_update_own
  on public.patients for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) Update RLS policies for visits table
-- ─────────────────────────────────────────────────────────────────────────────
create policy visits_select_own_patient
  on public.visits for select
  using (
    patient_id = public.get_own_patient_id()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) Update RLS policies for visit_symptoms
-- ─────────────────────────────────────────────────────────────────────────────
create policy visit_symptoms_select_own_patient
  on public.visit_symptoms for select
  using (
    exists (
      select 1 from public.visits v
      where v.id = visit_symptoms.visit_id
        and v.patient_id = public.get_own_patient_id()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 7) Update RLS policies for visit_diagnoses
-- ─────────────────────────────────────────────────────────────────────────────
create policy visit_diagnoses_select_own_patient
  on public.visit_diagnoses for select
  using (
    exists (
      select 1 from public.visits v
      where v.id = visit_diagnoses.visit_id
        and v.patient_id = public.get_own_patient_id()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 8) Update handle_new_user() trigger to support patient registration
-- ─────────────────────────────────────────────────────────────────────────────
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
  -- Determine user type from metadata
  if new.raw_user_meta_data ? 'type' then
    begin
      v_type := (new.raw_user_meta_data->>'type')::app_user_type;
    exception when others then
      v_type := 'patient';
    end;
  else
    v_type := 'patient';
  end if;

  v_name := coalesce(nullif(new.raw_user_meta_data->>'name', ''), 'Unnamed');
  v_surname := coalesce(nullif(new.raw_user_meta_data->>'surname', ''), 'User');
  v_profile_picture := nullif(new.raw_user_meta_data->>'profile_picture', '');
  v_specialization := nullif(new.raw_user_meta_data->>'specialization', '');

  -- Only allow specialization for doctors
  if v_type <> 'doctor' then
    v_specialization := null;
  end if;

  -- Insert into users table
  insert into public.users (user_id, type, name, surname, profile_picture, specialization)
  values (new.id, v_type, v_name, v_surname, v_profile_picture, v_specialization)
  on conflict (user_id) do nothing;

  -- If patient type, also create a patient record linked to this user
  if v_type = 'patient' then
    insert into public.patients (
      user_id,
      first_name,
      last_name,
      date_of_birth,
      gender,
      email
    )
    values (
      new.id,
      v_name,
      v_surname,
      coalesce((new.raw_user_meta_data->>'date_of_birth')::date, current_date - interval '30 years'),
      coalesce((new.raw_user_meta_data->>'gender')::app_gender, 'unknown'),
      new.email
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

commit;