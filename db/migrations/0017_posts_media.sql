-- Enhanced Posts Media and Interactions
-- Migration 0017_posts_media.sql

-- Add media column to posts (JSONB array of media objects)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]';

-- Post Reactions table for emoji reactions
CREATE TABLE IF NOT EXISTS public.post_reactions (
  post_id UUID REFERENCES public.posts ON DELETE CASCADE,
  user_id UUID REFERENCES public.users ON DELETE CASCADE,
  emoji TEXT DEFAULT '👍',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(post_id, user_id)
);

-- Post Comments table
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts ON DELETE CASCADE,
  user_id UUID REFERENCES public.users ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON public.post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON public.post_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON public.post_comments(created_at DESC);

-- RLS Policies for post_reactions
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions for posts in their school" ON public.post_reactions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.posts p 
    JOIN public.users u ON u.school_id = p.school_id 
    WHERE p.id = post_id AND u.id = auth.uid()
  )
);

CREATE POLICY "Users can manage their own reactions" ON public.post_reactions
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS Policies for post_comments
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments for posts in their school" ON public.post_comments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.posts p 
    JOIN public.users u ON u.school_id = p.school_id 
    WHERE p.id = post_id AND u.id = auth.uid()
  )
);

CREATE POLICY "Users can create comments on posts in their school" ON public.post_comments
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.posts p 
    JOIN public.users u ON u.school_id = p.school_id 
    WHERE p.id = post_id AND u.id = auth.uid()
  )
);

CREATE POLICY "Users can update their own comments" ON public.post_comments
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON public.post_comments
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Updated_at trigger for comments
CREATE OR REPLACE FUNCTION update_post_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_comments_updated_at
  BEFORE UPDATE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comments_updated_at();

-- Storage bucket for post media (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for posts bucket
CREATE POLICY "Authenticated users can upload to posts bucket" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'posts');

CREATE POLICY "Public can view posts media" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'posts');

CREATE POLICY "Users can delete their own posts media" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]); 