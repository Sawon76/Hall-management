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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'billing_configs'
      AND column_name = 'total_meal_charge'
  ) THEN
    UPDATE public.billing_configs
    SET total_meal_charge = 0
    WHERE total_meal_charge IS NULL;

    ALTER TABLE public.billing_configs
      ALTER COLUMN total_meal_charge SET DEFAULT 0;

    ALTER TABLE public.billing_configs
      ALTER COLUMN total_meal_charge DROP NOT NULL;
  END IF;
END
$$;

ALTER TABLE IF EXISTS public.billing_configs
  ADD COLUMN IF NOT EXISTS breakfast_meal_charge NUMERIC;

ALTER TABLE IF EXISTS public.billing_configs
  ADD COLUMN IF NOT EXISTS lunch_meal_charge NUMERIC;

ALTER TABLE IF EXISTS public.billing_configs
  ADD COLUMN IF NOT EXISTS dinner_meal_charge NUMERIC;

UPDATE public.billing_configs
SET breakfast_meal_charge = COALESCE(breakfast_meal_charge, 0)
WHERE breakfast_meal_charge IS NULL;

UPDATE public.billing_configs
SET lunch_meal_charge = COALESCE(lunch_meal_charge, 0)
WHERE lunch_meal_charge IS NULL;

UPDATE public.billing_configs
SET dinner_meal_charge = COALESCE(dinner_meal_charge, 0)
WHERE dinner_meal_charge IS NULL;

ALTER TABLE IF EXISTS public.payment_slips
  ADD COLUMN IF NOT EXISTS dues_months TEXT[] DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.weekly_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_id UUID REFERENCES public.halls(id) ON DELETE CASCADE NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  day_name TEXT NOT NULL,
  breakfast TEXT DEFAULT '',
  lunch TEXT DEFAULT '',
  dinner TEXT DEFAULT '',
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(hall_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS public.meal_daily_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_id UUID REFERENCES public.halls(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  breakfast_price NUMERIC NOT NULL DEFAULT 0,
  lunch_price NUMERIC NOT NULL DEFAULT 0,
  dinner_price NUMERIC NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(hall_id, date)
);

CREATE INDEX IF NOT EXISTS idx_weekly_menus_hall_day ON public.weekly_menus(hall_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_meal_daily_prices_hall_date ON public.meal_daily_prices(hall_id, date);

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

CREATE OR REPLACE FUNCTION public.enforce_student_meal_change_window()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  local_now TIMESTAMP := timezone('Asia/Dhaka', now());
  student_hall_name TEXT;
  cutoff_time TIME := TIME '19:00';
  target_deadline TIMESTAMP;
  cutoff_label TEXT := '7:00 PM';
BEGIN
  IF auth.role() = 'authenticated' AND public.get_my_role() IN ('provost', 'staff') THEN
    RETURN NEW;
  END IF;

  SELECT h.name
  INTO student_hall_name
  FROM public.students s
  JOIN public.halls h ON h.id = s.hall_id
  WHERE s.id = NEW.student_id
  LIMIT 1;

  IF COALESCE(student_hall_name, '') ILIKE '%girls%annex%'
     OR COALESCE(student_hall_name, '') ILIKE '%bir pratik taramon bibi%'
  THEN
    cutoff_time := TIME '15:00';
    cutoff_label := '3:00 PM';
  END IF;

  target_deadline := ((NEW.date::timestamp - INTERVAL '1 day') + cutoff_time);

  IF to_char(NEW.date, 'YYYY-MM') <> to_char(local_now, 'YYYY-MM') THEN
    RAISE EXCEPTION 'Meals can only be changed for dates in the current month.';
  END IF;

  IF NEW.date <= local_now::date THEN
    RAISE EXCEPTION 'Past and same-day meals cannot be changed.';
  END IF;

  IF local_now >= target_deadline THEN
    RAISE EXCEPTION 'Next-day meal changes close at % on the previous day.', cutoff_label;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meal_records_student_change_window ON public.meal_records;
CREATE TRIGGER trg_meal_records_student_change_window
BEFORE INSERT OR UPDATE ON public.meal_records
FOR EACH ROW
EXECUTE FUNCTION public.enforce_student_meal_change_window();

CREATE OR REPLACE FUNCTION public.enforce_previous_billing_month()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_month TEXT := to_char(date_trunc('month', now()), 'YYYY-MM');
BEGIN
  IF NEW.billing_month IS NULL OR NEW.billing_month >= current_month THEN
    RAISE EXCEPTION 'Billing month must be before the current month (%). Received: %', current_month, NEW.billing_month;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_billing_configs_previous_month_only ON public.billing_configs;
CREATE TRIGGER trg_billing_configs_previous_month_only
BEFORE INSERT OR UPDATE OF billing_month ON public.billing_configs
FOR EACH ROW
EXECUTE FUNCTION public.enforce_previous_billing_month();

DROP TRIGGER IF EXISTS trg_payment_slips_previous_month_only ON public.payment_slips;
CREATE TRIGGER trg_payment_slips_previous_month_only
BEFORE INSERT OR UPDATE OF billing_month ON public.payment_slips
FOR EACH ROW
EXECUTE FUNCTION public.enforce_previous_billing_month();

ALTER TABLE IF EXISTS public.weekly_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.meal_daily_prices ENABLE ROW LEVEL SECURITY;

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

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'meal_records'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.meal_records', policy_record.policyname);
  END LOOP;
END
$$;

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_slips'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.payment_slips', policy_record.policyname);
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
      AND EXISTS (
        SELECT 1
        FROM public.students s
        WHERE s.id = meal_records.student_id
          AND s.hall_id = public.get_my_hall_id()
      )
    )
    OR public.student_exists(meal_records.student_id)
  )
  WITH CHECK (
    (
      auth.role() = 'authenticated'
      AND public.get_my_role() IN ('provost', 'staff')
      AND EXISTS (
        SELECT 1
        FROM public.students s
        WHERE s.id = meal_records.student_id
          AND s.hall_id = public.get_my_hall_id()
      )
    )
    OR public.student_exists(meal_records.student_id)
  );

DROP POLICY IF EXISTS auth_manage_slips ON public.payment_slips;
CREATE POLICY auth_manage_slips ON public.payment_slips
  FOR ALL
  USING (
    (
      auth.role() = 'authenticated'
      AND public.get_my_role() IN ('provost', 'staff')
      AND payment_slips.hall_id = public.get_my_hall_id()
    )
    OR public.student_exists(payment_slips.student_id)
  )
  WITH CHECK (
    (
      auth.role() = 'authenticated'
      AND public.get_my_role() IN ('provost', 'staff')
      AND payment_slips.hall_id = public.get_my_hall_id()
    )
    OR public.student_exists(payment_slips.student_id)
  );

DROP POLICY IF EXISTS public_read_weekly_menus ON public.weekly_menus;
CREATE POLICY public_read_weekly_menus ON public.weekly_menus
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS staff_manage_weekly_menus ON public.weekly_menus;
CREATE POLICY staff_manage_weekly_menus ON public.weekly_menus
  FOR ALL
  USING (
    auth.role() = 'authenticated'
    AND public.get_my_role() = 'staff'
    AND hall_id = public.get_my_hall_id()
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.get_my_role() = 'staff'
    AND hall_id = public.get_my_hall_id()
  );

DROP POLICY IF EXISTS public_read_meal_daily_prices ON public.meal_daily_prices;
CREATE POLICY public_read_meal_daily_prices ON public.meal_daily_prices
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS staff_manage_meal_daily_prices ON public.meal_daily_prices;
CREATE POLICY staff_manage_meal_daily_prices ON public.meal_daily_prices
  FOR ALL
  USING (
    auth.role() = 'authenticated'
    AND public.get_my_role() = 'staff'
    AND hall_id = public.get_my_hall_id()
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.get_my_role() = 'staff'
    AND hall_id = public.get_my_hall_id()
  );

-- Optional quick check (replace values):
-- select * from public.student_login('0802420105101072', 'YOUR_ANNEX_HALL_UUID', 'Kv9QaNZM');
