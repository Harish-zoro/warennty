/*
# Update handle_new_user trigger to set role from signup metadata

## Changes
- Modifies the `handle_new_user` trigger function to read the `role` field from
  `raw_user_meta_data` and set it on the profile row at creation time.
- This eliminates the race condition where the client tried to UPDATE the profile
  row immediately after signup, before the trigger had finished creating it.
- The old approach required the client to poll for the profile row's existence,
  which could fail if no session was established yet (auth.uid() = null, RLS blocks SELECT).
- Now the role is set atomically at profile creation, so no post-signup UPDATE is needed.

## Security
- No RLS policy changes.
- The trigger runs with SECURITY DEFINER, so it can insert into profiles regardless
  of the caller's RLS context.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  IF v_role NOT IN ('admin', 'customer', 'technician') THEN
    v_role := 'customer';
  END IF;
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.raw_user_meta_data->>'phone', ''), v_role);
  RETURN NEW;
END;
$$;
