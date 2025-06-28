-- Phase 4c - Section ⇄ Teacher linkage fix
-- Migration: 0008_section_teacher_fix.sql

-- Add derived teacher_id column for faster look-ups
alter table public.sections
  add column if not exists teacher_id uuid generated always as (class_teacher) stored;

-- Create index for efficient teacher section lookups
create index if not exists idx_sections_teacher_id on public.sections(teacher_id);

-- Create junction table for many-to-many section-teacher relationships
create table if not exists public.section_teachers (
  section_id uuid references public.sections(id) on delete cascade not null,
  teacher_id uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key(section_id, teacher_id)
);

-- Enable RLS on section_teachers
alter table public.section_teachers enable row level security;

-- RLS policies for section_teachers (mirror sections table policies)
create policy "Users can view section_teachers in their school"
  on public.section_teachers for select
  using (
    exists (
      select 1 from public.sections s
      join public.users u on u.school_id = s.school_id
      where s.id = section_teachers.section_id
      and u.id = auth.uid()
    )
  );

create policy "School admins can manage section_teachers"
  on public.section_teachers for all
  using (
    exists (
      select 1 from public.sections s
      join public.users u on u.school_id = s.school_id
      where s.id = section_teachers.section_id
      and u.id = auth.uid()
      and u.role in ('school_admin', 'super_admin')
    )
  );

create policy "Teachers can view their section assignments"
  on public.section_teachers for select
  using (
    teacher_id = auth.uid()
  );

-- Create indexes for performance
create index if not exists idx_section_teachers_section_id on public.section_teachers(section_id);
create index if not exists idx_section_teachers_teacher_id on public.section_teachers(teacher_id);

-- Back-fill section_teachers from existing periods/timetables data
insert into public.section_teachers (section_id, teacher_id)
select distinct 
  s.id as section_id,
  p.teacher_id
from public.periods p
join public.sections s on s.id = p.section_id
where p.teacher_id is not null
on conflict (section_id, teacher_id) do nothing;

-- Also back-fill from timetables table if it exists and has data
insert into public.section_teachers (section_id, teacher_id)
select distinct 
  s.id as section_id,
  t.teacher_id
from public.timetables t
join public.sections s on s.school_id = t.school_id 
  and concat('Grade ', s.grade, ' ', s.section) = t.section
where t.teacher_id is not null
on conflict (section_id, teacher_id) do nothing; 