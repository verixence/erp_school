-- Migration: Add status column to users table for account activation/deactivation
-- This enables school admins to activate/deactivate parent and teacher accounts

-- Add status column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- Add updated_at column if it doesn't exist
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at_trigger ON public.users;
CREATE TRIGGER update_users_updated_at_trigger
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

-- Set all existing users to active status
UPDATE public.users
SET status = 'active'
WHERE status IS NULL;

-- Add index for performance on status queries
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON public.users(role, status);

-- Add comment for documentation
COMMENT ON COLUMN public.users.status IS 'User account status: active or inactive. Inactive users cannot log in.';
