CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS halls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT,
  university_name TEXT NOT NULL,
  university_logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hall_id UUID REFERENCES halls(id),
  role TEXT NOT NULL CHECK (role IN ('provost', 'staff')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  batch TEXT NOT NULL,
  hall_id UUID REFERENCES halls(id) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('attach_meal_off', 'attach_meal_on', 'staying_meal_on')),
  password_plain TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  breakfast BOOLEAN DEFAULT true,
  lunch BOOLEAN DEFAULT true,
  dinner BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, date)
);

CREATE TABLE IF NOT EXISTS hall_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_id UUID REFERENCES halls(id) NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT hall_closures_valid_range CHECK (to_date >= from_date)
);

CREATE TABLE IF NOT EXISTS billing_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_id UUID REFERENCES halls(id) NOT NULL,
  billing_month TEXT NOT NULL,
  total_meal_charge NUMERIC NOT NULL,
  other_bills NUMERIC DEFAULT 0,
  fuel_and_spices NUMERIC DEFAULT 0,
  svc_charge NUMERIC DEFAULT 0,
  hall_rent NUMERIC DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(hall_id, billing_month)
);

CREATE TABLE IF NOT EXISTS payment_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  hall_id UUID REFERENCES halls(id) NOT NULL,
  billing_month TEXT NOT NULL,
  no_of_meals INTEGER NOT NULL,
  meal_charge NUMERIC NOT NULL,
  other_bills NUMERIC NOT NULL,
  fuel_and_spices NUMERIC NOT NULL,
  svc_charge NUMERIC NOT NULL,
  hall_rent NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  dues NUMERIC DEFAULT 0,
  dues_months TEXT[] DEFAULT '{}',
  grand_total NUMERIC NOT NULL,
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'dues')),
  paid_at TIMESTAMPTZ,
  generated_by UUID REFERENCES profiles(id),
  generated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, billing_month)
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_hall_id ON profiles(hall_id);
CREATE INDEX IF NOT EXISTS idx_students_hall_id ON students(hall_id);
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_meal_records_student_id_date ON meal_records(student_id, date);
CREATE INDEX IF NOT EXISTS idx_hall_closures_hall_id ON hall_closures(hall_id);
CREATE INDEX IF NOT EXISTS idx_billing_configs_hall_month ON billing_configs(hall_id, billing_month);
CREATE INDEX IF NOT EXISTS idx_payment_slips_student_month ON payment_slips(student_id, billing_month);
CREATE INDEX IF NOT EXISTS idx_contact_messages_student_id ON contact_messages(student_id);

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_hall_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.hall_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

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

ALTER TABLE halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE hall_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_read_halls ON halls;
CREATE POLICY public_read_halls ON halls
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS read_own_or_provost_profile ON profiles;
CREATE POLICY read_own_or_provost_profile ON profiles
  FOR SELECT
  USING (id = auth.uid() OR public.get_my_role() = 'provost');

DROP POLICY IF EXISTS manage_own_profile ON profiles;
CREATE POLICY manage_own_profile ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS provost_insert_profiles ON profiles;
CREATE POLICY provost_insert_profiles ON profiles
  FOR INSERT
  WITH CHECK (public.get_my_role() = 'provost');

DROP POLICY IF EXISTS hall_staff_manage_students ON students;
CREATE POLICY hall_staff_manage_students ON students
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

DROP POLICY IF EXISTS public_read_closures ON hall_closures;
CREATE POLICY public_read_closures ON hall_closures
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS hall_staff_manage_closures ON hall_closures;
CREATE POLICY hall_staff_manage_closures ON hall_closures
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

DROP POLICY IF EXISTS public_read_billing ON billing_configs;
CREATE POLICY public_read_billing ON billing_configs
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS hall_staff_manage_billing ON billing_configs;
CREATE POLICY hall_staff_manage_billing ON billing_configs
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

DROP POLICY IF EXISTS auth_manage_meals ON meal_records;
CREATE POLICY auth_manage_meals ON meal_records
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

DROP POLICY IF EXISTS auth_manage_slips ON payment_slips;
CREATE POLICY auth_manage_slips ON payment_slips
  FOR ALL
  USING (
    auth.role() = 'authenticated'
    AND (
      public.get_my_role() IN ('provost', 'staff')
      OR EXISTS (
        SELECT 1
        FROM students
        WHERE students.id = payment_slips.student_id
          AND students.created_by = auth.uid()
      )
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      public.get_my_role() IN ('provost', 'staff')
      OR EXISTS (
        SELECT 1
        FROM students
        WHERE students.id = payment_slips.student_id
          AND students.created_by = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS students_insert_contact_messages ON contact_messages;
CREATE POLICY students_insert_contact_messages ON contact_messages
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS hall_staff_read_contact_messages ON contact_messages;
CREATE POLICY hall_staff_read_contact_messages ON contact_messages
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND public.get_my_role() IN ('provost', 'staff')
  );