/*
# Allow admins to read all profiles

## Problem
After fixing the recursion, the profiles SELECT policy was restricted to own-row only.
But the TechniciansPage needs to list all customer profiles so an admin can promote
one to technician. Without this, the admin can't see any users to add.

## Fix
- Add a second SELECT policy on profiles allowing admins to read all rows.
- Uses the `is_admin()` SECURITY DEFINER function (no recursion).
- Combined with the existing own-row policy, this means: every user reads their own
  profile, and admins read all profiles.
*/

DROP POLICY IF EXISTS "select_all_profiles_admin" ON profiles;
CREATE POLICY "select_all_profiles_admin" ON profiles FOR SELECT
  TO authenticated USING (public.is_admin());
