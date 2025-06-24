-- Phase 4a - Teacher Assets
-- Migration: 0007_teacher_assets.sql

-- Create timetables table for class scheduling
create table if not exists public.timetables (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade not null,
  section text not null,
  weekday int not null check (weekday between 1 and 7), -- 1=Monday, 7=Sunday
  period_no int not null,
  subject text not null,
  teacher_id uuid references public.users(id) on delete cascade not null,
  start_time time,
  end_time time,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index for efficient querying
create index if not exists timetables_school_teacher_idx 
  on public.timetables(school_id, teacher_id);

create index if not exists timetables_section_weekday_idx 
  on public.timetables(section, weekday, period_no);

-- Enable RLS
alter table public.timetables enable row level security;

-- RLS Policy: Users can only access timetables for their school
create policy "Timetables: same school access" on public.timetables
  for all using (
    (select role from public.users where id = auth.uid()) = 'super_admin'
    or school_id = (select school_id from public.users where id = auth.uid())
  )
  with check (
    (select role from public.users where id = auth.uid()) = 'super_admin'
    or school_id = (select school_id from public.users where id = auth.uid())
  );

-- Create homework table
create table if not exists public.homeworks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade not null,
  section text not null,
  subject text not null,
  title text not null,
  description text,
  due_date date not null,
  file_url text,
  created_by uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index for efficient querying
create index if not exists homeworks_school_section_idx 
  on public.homeworks(school_id, section);

create index if not exists homeworks_teacher_idx 
  on public.homeworks(created_by);

create index if not exists homeworks_due_date_idx 
  on public.homeworks(due_date);

-- Enable RLS
alter table public.homeworks enable row level security;

-- RLS Policy: Users can only access homework for their school
create policy "Homeworks: same school access" on public.homeworks
  for all using (
    (select role from public.users where id = auth.uid()) = 'super_admin'
    or school_id = (select school_id from public.users where id = auth.uid())
  )
  with check (
    (select role from public.users where id = auth.uid()) = 'super_admin'
    or school_id = (select school_id from public.users where id = auth.uid())
  );

-- Create announcements table
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade not null,
  title text not null,
  content text not null,
  target_audience text not null check (target_audience in ('students', 'parents', 'teachers', 'all')),
  sections text[], -- Array of sections this announcement applies to, null means all sections
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  is_published boolean not null default false,
  published_at timestamp with time zone,
  created_by uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index for efficient querying
create index if not exists announcements_school_audience_idx 
  on public.announcements(school_id, target_audience);

create index if not exists announcements_published_idx 
  on public.announcements(is_published, published_at);

create index if not exists announcements_priority_idx 
  on public.announcements(priority);

-- Enable RLS
alter table public.announcements enable row level security;

-- RLS Policy: Users can only access announcements for their school
create policy "Announcements: same school access" on public.announcements
  for all using (
    (select role from public.users where id = auth.uid()) = 'super_admin'
    or school_id = (select school_id from public.users where id = auth.uid())
  )
  with check (
    (select role from public.users where id = auth.uid()) = 'super_admin'
    or school_id = (select school_id from public.users where id = auth.uid())
  );

-- Insert sample timetable data for development
insert into public.timetables (school_id, section, weekday, period_no, subject, teacher_id, start_time, end_time)
select 
  s.id as school_id,
  'Grade 1 A' as section,
  generate_series(1, 5) as weekday, -- Monday to Friday
  generate_series(1, 6) as period_no,
  case (random() * 5)::int
    when 0 then 'Mathematics'
    when 1 then 'English'
    when 2 then 'Science'
    when 3 then 'Social Studies'
    when 4 then 'Art'
    else 'Physical Education'
  end as subject,
  u.id as teacher_id,
  ('08:00:00'::time + (generate_series(1, 6) - 1) * interval '1 hour') as start_time,
  ('09:00:00'::time + (generate_series(1, 6) - 1) * interval '1 hour') as end_time
from public.schools s
cross join public.users u
where u.role = 'teacher' and u.school_id = s.id
limit 30; -- Limit to avoid too much test data

-- Insert sample homework for development
insert into public.homeworks (school_id, section, subject, title, description, due_date, created_by)
select 
  s.id as school_id,
  'Grade 1 A' as section,
  'Mathematics' as subject,
  'Practice Addition Problems' as title,
  'Complete exercises 1-10 on page 45 of your math workbook.' as description,
  current_date + interval '3 days' as due_date,
  u.id as created_by
from public.schools s
cross join public.users u
where u.role = 'teacher' and u.school_id = s.id
limit 5;

-- Insert sample announcements for development
insert into public.announcements (school_id, title, content, target_audience, priority, is_published, published_at, created_by)
select 
  s.id as school_id,
  'Welcome to the new school year!' as title,
  'We are excited to start this new academic year. Please ensure all students have their required materials.' as content,
  'parents' as target_audience,
  'normal' as priority,
  true as is_published,
  now() as published_at,
  u.id as created_by
from public.schools s
cross join public.users u
where u.role = 'teacher' and u.school_id = s.id
limit 3; 