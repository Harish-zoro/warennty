/*
# Service & Warranty Management System — Core Schema

## Overview
Creates the full data model for a Service & Warranty Management System with three roles
(admin, customer, technician). Supports product catalog, warranty configuration, product
registration with digital warranty cards, service requests with status timelines, technician
job management, and ownership transfers with admin approval.

## New Tables
1. profiles — extends auth.users with role, name, phone, avatar
2. products — product catalog managed by admins
3. product_registrations — customer registers purchased product, activating warranty
4. service_requests — customer raises complaint/service request
5. service_timeline — timeline entries for each service request status change
6. technicians — technician profile info (linked to profiles)
7. ownership_transfers — customer initiates transfer, admin approves
8. activities — recent activity log for dashboards

## Security
- RLS enabled on every table.
- profiles: each user reads/updates own profile; admins read all.
- products: all authenticated users can read; only admins can write.
- product_registrations: owner reads/writes own; admins read all.
- service_requests: owner reads/writes own; assigned technician reads/updates; admins read all.
- service_timeline: owner of parent request reads; assigned technician + admin can insert.
- technicians: all authenticated read; admins write.
- ownership_transfers: owner reads own; admins read all and update status.
- activities: owner reads own; admins read all.
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('admin','customer','technician')),
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  image_url text DEFAULT '',
  description text DEFAULT '',
  warranty_months int NOT NULL DEFAULT 12,
  warranty_type text NOT NULL DEFAULT 'standard' CHECK (warranty_type IN ('standard','extended')),
  warranty_terms text DEFAULT '',
  coverage_details text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_products" ON products;
CREATE POLICY "select_products" ON products FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_products_admin" ON products;
CREATE POLICY "insert_products_admin" ON products FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "update_products_admin" ON products;
CREATE POLICY "update_products_admin" ON products FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "delete_products_admin" ON products;
CREATE POLICY "delete_products_admin" ON products FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Product registrations table
CREATE TABLE IF NOT EXISTS product_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  serial_number text NOT NULL,
  purchase_date date NOT NULL,
  invoice_url text DEFAULT '',
  warranty_card_code text UNIQUE NOT NULL DEFAULT upper(substr(encode(gen_random_bytes(8),'hex'),1,12)),
  warranty_expires_at date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','transferred')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE product_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_registrations" ON product_registrations;
CREATE POLICY "select_own_registrations" ON product_registrations FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "insert_own_registrations" ON product_registrations;
CREATE POLICY "insert_own_registrations" ON product_registrations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_registrations" ON product_registrations;
CREATE POLICY "update_own_registrations" ON product_registrations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "delete_own_registrations" ON product_registrations;
CREATE POLICY "delete_own_registrations" ON product_registrations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Service requests table
CREATE TABLE IF NOT EXISTS service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  registration_id uuid NOT NULL REFERENCES product_registrations(id) ON DELETE CASCADE,
  problem_category text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  image_url text DEFAULT '',
  preferred_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','repairing','completed','delivered')),
  technician_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  technician_notes text DEFAULT '',
  estimated_delivery date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_service_requests" ON service_requests;
CREATE POLICY "select_service_requests" ON service_requests FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR technician_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "insert_service_requests" ON service_requests;
CREATE POLICY "insert_service_requests" ON service_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_service_requests" ON service_requests;
CREATE POLICY "update_service_requests" ON service_requests FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id
    OR technician_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    auth.uid() = user_id
    OR technician_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "delete_service_requests" ON service_requests;
CREATE POLICY "delete_service_requests" ON service_requests FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Service timeline table
CREATE TABLE IF NOT EXISTS service_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text DEFAULT '',
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE service_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_timeline" ON service_timeline;
CREATE POLICY "select_timeline" ON service_timeline FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM service_requests sr WHERE sr.id = service_timeline.service_request_id AND (sr.user_id = auth.uid() OR sr.technician_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')))
  );

DROP POLICY IF EXISTS "insert_timeline" ON service_timeline;
CREATE POLICY "insert_timeline" ON service_timeline FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM service_requests sr WHERE sr.id = service_timeline.service_request_id AND (sr.user_id = auth.uid() OR sr.technician_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')))
  );

-- Technicians table
CREATE TABLE IF NOT EXISTS technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  specialization text NOT NULL DEFAULT 'General',
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','busy','offline')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_technicians" ON technicians;
CREATE POLICY "select_technicians" ON technicians FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_technicians_admin" ON technicians;
CREATE POLICY "insert_technicians_admin" ON technicians FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "update_technicians" ON technicians;
CREATE POLICY "update_technicians" ON technicians FOR UPDATE
  TO authenticated USING (profile_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (profile_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "delete_technicians_admin" ON technicians;
CREATE POLICY "delete_technicians_admin" ON technicians FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Ownership transfers table
CREATE TABLE IF NOT EXISTS ownership_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES product_registrations(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  to_name text NOT NULL,
  to_email text NOT NULL,
  to_phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE ownership_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_transfers" ON ownership_transfers;
CREATE POLICY "select_transfers" ON ownership_transfers FOR SELECT
  TO authenticated USING (from_user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "insert_transfers" ON ownership_transfers;
CREATE POLICY "insert_transfers" ON ownership_transfers FOR INSERT
  TO authenticated WITH CHECK (from_user_id = auth.uid());

DROP POLICY IF EXISTS "update_transfers_admin" ON ownership_transfers;
CREATE POLICY "update_transfers_admin" ON ownership_transfers FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_activities" ON activities;
CREATE POLICY "select_activities" ON activities FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "insert_activities" ON activities;
CREATE POLICY "insert_activities" ON activities FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_registrations_user_id ON product_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_user_id ON service_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_technician_id ON service_requests(technician_id);
CREATE INDEX IF NOT EXISTS idx_service_timeline_request_id ON service_timeline(service_request_id);
CREATE INDEX IF NOT EXISTS idx_ownership_transfers_from_user_id ON ownership_transfers(from_user_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at on service_requests
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_requests_updated_at ON service_requests;
CREATE TRIGGER trg_service_requests_updated_at
  BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
