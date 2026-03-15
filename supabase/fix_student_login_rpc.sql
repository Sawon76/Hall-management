-- Fix for student login failing with valid credentials due to RLS on students table.
--
-- Run this in Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'billing_configs'
      AND column_name = 'meal_charge_per_meal'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'billing_configs'
      AND column_name = 'total_meal_charge'
  ) THEN
    ALTER TABLE public.billing_configs RENAME COLUMN meal_charge_per_meal TO total_meal_charge;
  END IF;
END
$$;

ALTER TABLE IF EXISTS public.billing_configs
  ADD COLUMN IF NOT EXISTS total_meal_charge NUMERIC;

ALTER TABLE IF EXISTS public.payment_slips
  ADD COLUMN IF NOT EXISTS dues_months TEXT[] DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.student_login(
  p_student_id TEXT,
  p_hall_id UUID,
  p_password TEXT
)
RETURNS TABLE (
  id UUID,
  student_id TEXT,
  name TEXT,
  hall_id UUID,
  category TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT s.id, s.student_id, s.name, s.hall_id, s.category
  FROM public.students s
  WHERE s.student_id = p_student_id
    AND s.hall_id = p_hall_id
    AND s.password_hash = encode(digest(p_password, 'sha256'), 'hex')
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.student_login(TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_login(TEXT, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.student_login(TEXT, UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.student_change_password(
  p_student_uuid UUID,
  p_current_password TEXT,
  p_new_password TEXT
)
RETURNS TABLE (
  id UUID,
  student_id TEXT,
  name TEXT,
  hall_id UUID,
  category TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  UPDATE public.students s
  SET
    password_plain = p_new_password,
    password_hash = encode(digest(p_new_password, 'sha256'), 'hex')
  WHERE s.id = p_student_uuid
    AND s.password_hash = encode(digest(p_current_password, 'sha256'), 'hex')
  RETURNING s.id, s.student_id, s.name, s.hall_id, s.category;
$$;

REVOKE ALL ON FUNCTION public.student_change_password(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_change_password(UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.student_change_password(UUID, TEXT, TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.get_student_profile(UUID);

CREATE OR REPLACE FUNCTION public.get_student_profile(p_student_uuid UUID)
RETURNS TABLE (
  id UUID,
  student_id TEXT,
  name TEXT,
  department TEXT,
  batch TEXT,
  hall_id UUID,
  category TEXT,
  created_at TIMESTAMPTZ,
  hall_name TEXT,
  university_name TEXT,
  university_logo_url TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.student_id,
    s.name,
    s.department,
    s.batch,
    s.hall_id,
    s.category,
    s.created_at,
    h.name AS hall_name,
    h.university_name,
    h.university_logo_url
  FROM public.students s
  LEFT JOIN public.halls h ON h.id = s.hall_id
  WHERE s.id = p_student_uuid
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_student_profile(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_profile(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_student_profile(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.student_exists(p_student_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = p_student_uuid
  );
$$;

REVOKE ALL ON FUNCTION public.student_exists(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_exists(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.student_exists(UUID) TO authenticated;

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'students'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.students', policy_record.policyname);
  END LOOP;
END
$$;

CREATE POLICY hall_staff_manage_students ON public.students
  FOR ALL
  USING (
    auth.role() = 'authenticated'
    AND public.get_my_role() IN ('provost', 'staff')
    AND hall_id = public.get_my_hall_id()
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.get_my_role() IN ('provost', 'staff')
    AND hall_id = public.get_my_hall_id()
  );

DROP POLICY IF EXISTS auth_manage_meals ON public.meal_records;
CREATE POLICY auth_manage_meals ON public.meal_records
  FOR ALL
  USING (
    (
      auth.role() = 'authenticated'
      AND public.get_my_role() IN ('provost', 'staff')
    )
    OR public.student_exists(meal_records.student_id)
  )
  WITH CHECK (
    (
      auth.role() = 'authenticated'
      AND public.get_my_role() IN ('provost', 'staff')
    )
    OR public.student_exists(meal_records.student_id)
  );

-- Optional quick check (replace values):
-- select * from public.student_login('0802420105101072', 'YOUR_ANNEX_HALL_UUID', 'Kv9QaNZM');
