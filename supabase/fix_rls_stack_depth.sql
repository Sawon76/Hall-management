-- Fix for: "stack depth limit exceeded" caused by RLS recursion.
--
-- Run this in Supabase SQL Editor on your existing project.
-- It updates helper functions used by RLS policies.

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

-- Optional verification query:
-- select public.get_my_role(), public.get_my_hall_id();
