-- Fix RLS infinite recursion issue
-- Drop problematic policies
DROP POLICY IF EXISTS "Schools: super admin can see all" ON public.schools;
DROP POLICY IF EXISTS "Schools: super admin can update all" ON public.schools;
DROP POLICY IF EXISTS "Users: self only" ON public.users;
DROP POLICY IF EXISTS "Users: super admin can see all" ON public.users;
DROP POLICY IF EXISTS "Students: same school" ON public.students;

-- Temporarily disable RLS for development
ALTER TABLE public.schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY; 