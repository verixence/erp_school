-- Media Support for Community Posts and Announcements
-- Migration 0016_media_support.sql

-- Add media_urls column to posts table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'media_urls') THEN
    ALTER TABLE public.posts ADD COLUMN media_urls text[];
  END IF;
END $$;

-- Add media_urls column to announcements table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'media_urls') THEN
    ALTER TABLE public.announcements ADD COLUMN media_urls text[];
  END IF;
END $$;

-- Create media storage bucket policy
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload media
CREATE POLICY "Authenticated users can upload media" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media');

-- Allow public read access to media
CREATE POLICY "Public can view media" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'media');

-- Allow users to delete their own uploaded media
CREATE POLICY "Users can delete their media" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update the updated_at trigger for posts
CREATE OR REPLACE FUNCTION update_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS posts_updated_at ON public.posts;

-- Create new trigger
CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION update_posts_updated_at();

-- Update the updated_at trigger for announcements
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS announcements_updated_at ON public.announcements;

-- Create new trigger
CREATE TRIGGER announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcements_updated_at(); 