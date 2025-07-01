-- Fix Announcements Table Schema Conflicts
-- Migration 0019_fix_announcements_schema.sql

-- Drop the conflicting announcements table from 0014 if it exists and recreate with proper schema
-- This ensures consistency with the 0007 schema which was created first

-- First, let's ensure we have the correct announcements table structure
-- The table from 0007_teacher_assets.sql should be the authoritative one

-- Add missing columns that might be needed from the 0014 schema attempt
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

-- Add media_urls column if not exists (from 0016 migration)
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS media_urls text[] DEFAULT '{}';

-- Update RLS policies to use created_by instead of author_id for consistency
DROP POLICY IF EXISTS "Authors can update their announcements" ON public.announcements;
DROP POLICY IF EXISTS "School staff can insert announcements" ON public.announcements;

-- Updated RLS policy for authors to update their announcements
CREATE POLICY "Authors can update their announcements" ON public.announcements
  FOR UPDATE 
  USING (created_by = auth.uid());

-- Updated RLS policy for school staff to insert announcements  
CREATE POLICY "School staff can insert announcements" ON public.announcements
  FOR INSERT 
  WITH CHECK (
    school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('school_admin', 'teacher')
    )
  );

-- Ensure the table has the correct structure and constraints
-- Fix any inconsistencies in the table structure
DO $$ 
BEGIN
  -- Check if target_audience column exists, if not add it
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'target_audience') THEN
    ALTER TABLE public.announcements ADD COLUMN target_audience text NOT NULL DEFAULT 'all' CHECK (target_audience IN ('students', 'parents', 'teachers', 'all'));
  END IF;
  
  -- Check if audience column exists and drop it (to avoid confusion)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'audience') THEN
    ALTER TABLE public.announcements DROP COLUMN audience;
  END IF;
  
  -- Check if message column exists and drop it (we use title + content)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'message') THEN
    ALTER TABLE public.announcements DROP COLUMN message;
  END IF;
  
  -- Check if level column exists and drop it (we use priority)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'level') THEN
    ALTER TABLE public.announcements DROP COLUMN level;
  END IF;
END $$;

-- Add indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS announcements_author_id_idx ON public.announcements(author_id);
CREATE INDEX IF NOT EXISTS announcements_media_urls_idx ON public.announcements USING GIN(media_urls);

-- Update the updated_at trigger to ensure it exists
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger to ensure it works
DROP TRIGGER IF EXISTS announcements_updated_at ON public.announcements;
CREATE TRIGGER announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcements_updated_at(); 