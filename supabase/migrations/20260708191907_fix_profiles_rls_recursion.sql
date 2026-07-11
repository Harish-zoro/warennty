/*
# Fix infinite recursion in profiles RLS policies

## Problem
The SELECT policy on `profiles` checked for admin role by running a subquery
against `profiles` itself: `EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')`.
This caused infinite recursion — Postgres evaluates RLS policies when querying a table,
so the subquery triggers the same policy again, which triggers it again, etc.

## Fix
- SELECT: users can read their own profile (auth.uid() = id). Admins no longer read all
  profiles via a recursive subquery. Instead, admin access to other tables (products,
  service_requests, etc.) is handled by those tables' own policies using a direct
  check against profiles — but those are fine because they query a *different* table.
- For admin-only views that need to list all profiles (e.g. TechniciansPage listing
  customers), we add a SECURITY DEFINER function `is_admin()` that checks the role
  without triggering RLS recursion, and use it in policies on OTHER tables.
- The profiles SELECT policy is simplified to just `auth.uid() = id` (own profile only).
  Admins who need to see other users' profiles will use the `is_admin()` function
  approach in the calling table's policy, not by selecting profiles directly.

## Security
- profiles SELECT: own row only (no recursion).
- profiles INSERT/UPDATE: own row only (unchanged).
- New `is_admin()` SECURITY DEFINER function for use in other tables' policies.
- Updated policies on service_requests, ownership_transfers, activities, technicians,
  products, and product_registrations to use `is_admin()` instead of the recursive
  `EXISTS (SELECT 1 FROM profiles ...)` pattern.
*/

-- Create a SECURITY DEFINER function to check admin role without RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin');
$$;

-- Fix profiles SELECT policy (remove recursion)
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

-- Update products policies to use is_admin()
DROP POLICY IF EXISTS "insert_products_admin" ON products;
CREATE POLICY "insert_products_admin" ON products FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_products_admin" ON products;
CREATE POLICY "update_products_admin" ON products FOR UPDATE
  TO authenticated USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_products_admin" ON products;
CREATE POLICY "delete_products_admin" ON products FOR DELETE
  TO authenticated USING (public.is_admin());

-- Update product_registrations policies to use is_admin()
DROP POLICY IF EXISTS "select_own_registrations" ON product_registrations;
CREATE POLICY "select_own_registrations" ON product_registrations FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "update_own_registrations" ON product_registrations;
CREATE POLICY "update_own_registrations" ON product_registrations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Update service_requests policies to use is_admin()
DROP POLICY IF EXISTS "select_service_requests" ON service_requests;
CREATE POLICY "select_service_requests" ON service_requests FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR technician_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "update_service_requests" ON service_requests;
CREATE POLICY "update_service_requests" ON service_requests FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id
    OR technician_id = auth.uid()
    OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = user_id
    OR technician_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "delete_service_requests" ON service_requests;
CREATE POLICY "delete_service_requests" ON service_requests FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- Update service_timeline policies to use is_admin()
DROP POLICY IF EXISTS "select_timeline" ON service_timeline;
CREATE POLICY "select_timeline" ON service_timeline FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM service_requests sr WHERE sr.id = service_timeline.service_request_id AND (sr.user_id = auth.uid() OR sr.technician_id = auth.uid() OR public.is_admin()))
  );

DROP POLICY IF EXISTS "insert_timeline" ON service_timeline;
CREATE POLICY "insert_timeline" ON service_timeline FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM service_requests sr WHERE sr.id = service_timeline.service_request_id AND (sr.user_id = auth.uid() OR sr.technician_id = auth.uid() OR public.is_admin()))
  );

-- Update technicians policies to use is_admin()
DROP POLICY IF EXISTS "insert_technicians_admin" ON technicians;
CREATE POLICY "insert_technicians_admin" ON technicians FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_technicians" ON technicians;
CREATE POLICY "update_technicians" ON technicians FOR UPDATE
  TO authenticated USING (profile_id = auth.uid() OR public.is_admin())
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "delete_technicians_admin" ON technicians;
CREATE POLICY "delete_technicians_admin" ON technicians FOR DELETE
  TO authenticated USING (public.is_admin());

-- Update ownership_transfers policies to use is_admin()
DROP POLICY IF EXISTS "select_transfers" ON ownership_transfers;
CREATE POLICY "select_transfers" ON ownership_transfers FOR SELECT
  TO authenticated USING (from_user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "update_transfers_admin" ON ownership_transfers;
CREATE POLICY "update_transfers_admin" ON ownership_transfers FOR UPDATE
  TO authenticated USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Update activities policies to use is_admin()
DROP POLICY IF EXISTS "select_activities" ON activities;
CREATE POLICY "select_activities" ON activities FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR public.is_admin());
