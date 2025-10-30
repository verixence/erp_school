-- Fix School Admin Roles Migration
-- Update the role constraint to support principal and vice_principal roles

-- Drop the existing check constraint
ALTER TABLE public.school_admins
DROP CONSTRAINT IF EXISTS school_admins_role_check;

-- Add updated check constraint with all admin role types
ALTER TABLE public.school_admins
ADD CONSTRAINT school_admins_role_check
CHECK (role IN ('admin', 'super_admin', 'principal', 'vice_principal', 'administrator'));

-- Add comment to explain the roles
COMMENT ON COLUMN public.school_admins.role IS 'Admin role types: admin (general administrator), super_admin (full access), principal (school principal), vice_principal (vice principal), administrator (synonymous with admin)';

-- Update existing 'admin' roles to 'administrator' if needed (optional, depends on your preference)
-- Uncomment if you want to rename existing 'admin' to 'administrator'
-- UPDATE public.school_admins SET role = 'administrator' WHERE role = 'admin';
