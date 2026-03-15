-- Hall and admin profile seed script
--
-- Step 1:
-- Create these 8 Auth users in Supabase Dashboard -> Authentication -> Users.
-- Use the exact emails below and set passwords of your choice.
--
-- Provost accounts:
-- provost.annex@hall.local
-- provost.taramonbibi@hall.local
-- provost.zikrul@hall.local
-- provost.abbasuddin@hall.local
--
-- Staff accounts:
-- staff.annex@hall.local
-- staff.taramonbibi@hall.local
-- staff.zikrul@hall.local
-- staff.abbasuddin@hall.local
--
-- Step 2:
-- University name is set to Bangladesh Army University Of Science and Technology.
--
-- Step 3:
-- Run this SQL in the Supabase SQL editor.

WITH hall_seed(name, university_name) AS (
  VALUES
    ('Annex', 'Bangladesh Army University Of Science and Technology'),
    ('Bir pratik taramon bibi', 'Bangladesh Army University Of Science and Technology'),
    ('Zikrul', 'Bangladesh Army University Of Science and Technology'),
    ('Abbas Uddin', 'Bangladesh Army University Of Science and Technology')
)
INSERT INTO public.halls (name, university_name)
SELECT hall_seed.name, hall_seed.university_name
FROM hall_seed
WHERE NOT EXISTS (
  SELECT 1
  FROM public.halls h
  WHERE lower(h.name) = lower(hall_seed.name)
);

WITH account_seed(email, full_name, hall_name, role) AS (
  VALUES
    ('provost.annex@hall.local', 'Provost - Annex', 'Annex', 'provost'),
    ('staff.annex@hall.local', 'Staff - Annex', 'Annex', 'staff'),
    ('provost.taramonbibi@hall.local', 'Provost - Bir pratik taramon bibi', 'Bir pratik taramon bibi', 'provost'),
    ('staff.taramonbibi@hall.local', 'Staff - Bir pratik taramon bibi', 'Bir pratik taramon bibi', 'staff'),
    ('provost.zikrul@hall.local', 'Provost - Zikrul', 'Zikrul', 'provost'),
    ('staff.zikrul@hall.local', 'Staff - Zikrul', 'Zikrul', 'staff'),
    ('provost.abbasuddin@hall.local', 'Provost - Abbas Uddin', 'Abbas Uddin', 'provost'),
    ('staff.abbasuddin@hall.local', 'Staff - Abbas Uddin', 'Abbas Uddin', 'staff')
)
INSERT INTO public.profiles (id, hall_id, role, full_name)
SELECT
  auth_user.id,
  hall.id,
  account_seed.role,
  account_seed.full_name
FROM account_seed
JOIN auth.users AS auth_user
  ON lower(auth_user.email) = lower(account_seed.email)
JOIN public.halls AS hall
  ON lower(hall.name) = lower(account_seed.hall_name)
ON CONFLICT (id) DO UPDATE
SET
  hall_id = EXCLUDED.hall_id,
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name;

-- Verification
SELECT p.full_name, p.role, h.name AS hall_name, u.email
FROM public.profiles p
JOIN public.halls h ON h.id = p.hall_id
JOIN auth.users u ON u.id = p.id
ORDER BY h.name, p.role;