-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 009: Allow clinic users to see all clinic users
-- ═══════════════════════════════════════════════════════════════════════════
-- Problem: The users table only allowed users to see their own profile.
-- This prevented the Schedule Visit dialog from showing available doctors.
-- Solution: Add a policy that allows clinic users to see all users.
-- 
-- IMPORTANT: We must update is_clinic_user() to use SECURITY DEFINER
-- to avoid infinite recursion when RLS policies call it.

begin;

-- First, drop the policy if it exists (in case of re-run after error)
drop policy if exists users_select_clinic_users on public.users;

-- Recreate is_clinic_user() WITH SECURITY DEFINER to bypass RLS
-- This prevents infinite recursion when RLS policies call this function
create or replace function public.is_clinic_user()
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
      and u.type in ('doctor', 'assistant')
  );
$$;

-- Policy: Clinic users (doctors/assistants) can see all users
create policy users_select_clinic_users
  on public.users for select
  using (public.is_clinic_user());

commit;

