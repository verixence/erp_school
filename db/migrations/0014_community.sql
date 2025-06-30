-- Community features: Posts and Announcements
-- Migration 0014_community.sql

-- Posts table for community discussions
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools on delete cascade,
  author_id uuid references public.users on delete set null,
  title text not null,
  body text,
  audience text check (audience in ('all','teachers','parents','students')) default 'all',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Announcements table for important notices
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools on delete cascade,
  author_id uuid references public.users on delete set null,
  message text not null,
  audience text check (audience in ('all','teachers','parents','students')) default 'all',
  level text default 'info' check (level in ('info', 'warning', 'urgent')),
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add indexes for performance
create index posts_school_id_idx on public.posts(school_id);
create index posts_audience_idx on public.posts(audience);
create index posts_created_at_idx on public.posts(created_at desc);

create index announcements_school_id_idx on public.announcements(school_id);
create index announcements_audience_idx on public.announcements(audience);
create index announcements_expires_at_idx on public.announcements(expires_at);
create index announcements_level_idx on public.announcements(level);

-- Enable RLS
alter table public.posts enable row level security;
alter table public.announcements enable row level security;

-- RLS Policies for posts
create policy "Users can view posts from their school"
  on public.posts for select
  using (school_id = (select school_id from public.users where id = auth.uid()));

create policy "School staff can insert posts"
  on public.posts for insert
  with check (
    school_id = (select school_id from public.users where id = auth.uid())
    and exists (
      select 1 from public.users 
      where id = auth.uid() 
      and role in ('school_admin', 'teacher')
    )
  );

create policy "Authors can update their posts"
  on public.posts for update
  using (author_id = auth.uid());

create policy "School admins can delete any post in their school"
  on public.posts for delete
  using (
    school_id = (select school_id from public.users where id = auth.uid())
    and exists (
      select 1 from public.users 
      where id = auth.uid() 
      and role = 'school_admin'
    )
  );

-- RLS Policies for announcements
create policy "Users can view announcements from their school"
  on public.announcements for select
  using (
    school_id = (select school_id from public.users where id = auth.uid())
    and (expires_at is null or expires_at > now())
  );

create policy "School staff can insert announcements"
  on public.announcements for insert
  with check (
    school_id = (select school_id from public.users where id = auth.uid())
    and exists (
      select 1 from public.users 
      where id = auth.uid() 
      and role in ('school_admin', 'teacher')
    )
  );

create policy "Authors can update their announcements"
  on public.announcements for update
  using (author_id = auth.uid());

create policy "School admins can delete any announcement in their school"
  on public.announcements for delete
  using (
    school_id = (select school_id from public.users where id = auth.uid())
    and exists (
      select 1 from public.users 
      where id = auth.uid() 
      and role = 'school_admin'
    )
  );

-- Functions for updated_at timestamps
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger posts_updated_at
  before update on public.posts
  for each row execute function public.handle_updated_at();

create trigger announcements_updated_at
  before update on public.announcements
  for each row execute function public.handle_updated_at(); 