-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 010: Allow clinic users to update patient user profiles
-- ═══════════════════════════════════════════════════════════════════════════
-- Problem: When assistants/doctors update patient data in the patients table,
-- the linked user account (name, surname) was not being updated because
-- the RLS policy only allowed users to update their own profile.
-- 
-- Solution: Add a policy that allows clinic users to update patient users.

begin;

-- Policy: Clinic users can update patient user profiles
-- This allows syncing name changes from patients table to users table
create policy users_update_clinic_patients
  on public.users for update
  using (
    -- The current user must be a clinic user (doctor or assistant)
    public.is_clinic_user()
    -- The target user must be a patient
    and type = 'patient'
  )
  with check (
    public.is_clinic_user()
    and type = 'patient'
  );

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- MANUAL RUN INSTRUCTIONS:
-- Run this SQL in your Supabase SQL Editor:
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- create policy users_update_clinic_patients
--   on public.users for update
--   using (
--     public.is_clinic_user()
--     and type = 'patient'
--   )
--   with check (
--     public.is_clinic_user()
--     and type = 'patient'
--   );

