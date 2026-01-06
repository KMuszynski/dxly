-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 011: Allow patients to see doctor information
-- ═══════════════════════════════════════════════════════════════════════════
-- Problem: Patients could see their visits but the doctor field showed '-'
-- because they didn't have permission to read from the users table.
-- Solution: Add a policy allowing patients to see doctors (type='doctor').
-- This is safe because doctor name/specialization is not sensitive info.

begin;

-- Policy: Patients can see doctors (for their visit listings)
-- Using security definer function to avoid RLS recursion
create or replace function public.is_patient_user()
returns boolean
language sql
security definer  -- CRITICAL: bypasses RLS to prevent recursion
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.user_id = auth.uid()
      and u.type = 'patient'
  );
$$;

-- Drop the policy if it already exists (for re-runs)
drop policy if exists users_select_doctors_for_patients on public.users;

-- Create policy: Patients can see all doctors
create policy users_select_doctors_for_patients
  on public.users for select
  using (
    type = 'doctor' and public.is_patient_user()
  );

commit;

