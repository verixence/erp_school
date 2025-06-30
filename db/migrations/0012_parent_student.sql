-- Phase 5: Parent & Student Portal Database Setup
-- Migration: 0012_parent_student.sql

-- Create parent-student link table
create table if not exists public.student_parents (
  student_id uuid references public.students(id) on delete cascade,
  parent_id  uuid references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (student_id, parent_id)
);

-- Add last seen timestamp for users
alter table public.users
  add column if not exists last_seen timestamptz default now();

-- RLS Policies for student_parents table
alter table public.student_parents enable row level security;

-- Policy: Parents can only see their own student relationships
create policy "Parents can see their own student relationships"
  on public.student_parents for select
  using (
    (auth.uid() = parent_id) or
    (exists (
      select 1 from public.users
      where id = auth.uid()
      and role in ('super_admin', 'school_admin')
    )) or
    (exists (
      select 1 from public.users u
      join public.students s on s.school_id = u.school_id
      where u.id = auth.uid()
      and u.role = 'teacher'
      and s.id = student_id
    ))
  );

-- Policy: School admins can manage student-parent relationships in their school
create policy "School admins can manage student-parent relationships"
  on public.student_parents for all
  using (
    exists (
      select 1 from public.users u
      join public.students s on s.school_id = u.school_id
      where u.id = auth.uid()
      and u.role in ('super_admin', 'school_admin')
      and s.id = student_id
    )
  );

-- Policy: Students can see their own parent relationships  
create policy "Students can see their own parent relationships"
  on public.student_parents for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
      and role = 'student'
      and id = student_id
    )
  );

-- Create indexes for better performance
create index if not exists idx_student_parents_student_id on public.student_parents(student_id);
create index if not exists idx_student_parents_parent_id on public.student_parents(parent_id);
create index if not exists idx_users_last_seen on public.users(last_seen);

-- Grant necessary permissions
grant select, insert, update, delete on public.student_parents to authenticated; 