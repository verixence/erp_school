-- Phase 2.3 - Parent-Student Many-to-Many Linkage
-- Migration: 0005_link_tables.sql

-- Create parent-student many-to-many relationship table
create table if not exists public.student_parents (
  student_id uuid references public.students(id) on delete cascade,
  parent_id  uuid references public.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (student_id, parent_id)
);

-- Add RLS policies for student_parents table
alter table public.student_parents enable row level security;

-- Policy: Users can only access student_parents for their school
create policy "Users can access student_parents for their school" on public.student_parents
  for all using (
    exists (
      select 1 from public.students s
      join public.users u on s.school_id = u.school_id
      where s.id = student_parents.student_id
      and u.id = auth.uid()
    )
  );

-- Create indexes for better performance
create index if not exists idx_student_parents_student_id on public.student_parents(student_id);
create index if not exists idx_student_parents_parent_id on public.student_parents(parent_id);

-- RPC function to get students with their parents
create or replace function get_students_with_parents(p_school_id uuid)
returns table (
  id uuid,
  full_name text,
  admission_no text,
  grade text,
  section text,
  gender text,
  date_of_birth date,
  student_email text,
  student_phone text,
  school_id uuid,
  created_at timestamp with time zone,
  parents json
) language plpgsql security definer as $$
begin
  return query
  select 
    s.id,
    s.full_name,
    s.admission_no,
    s.grade,
    s.section,
    s.gender,
    s.date_of_birth,
    s.student_email,
    s.student_phone,
    s.school_id,
    s.created_at,
    coalesce(
      (select json_agg(
        json_build_object(
          'id', u.id,
          'first_name', u.first_name,
          'last_name', u.last_name,
          'email', u.email,
          'relation', u.relation
        )
      )
      from public.student_parents sp
      join public.users u on sp.parent_id = u.id
      where sp.student_id = s.id
      ), '[]'::json
    ) as parents
  from public.students s
  where s.school_id = p_school_id
  order by s.created_at desc;
end;
$$;

-- RPC function to get parents with their children count
create or replace function get_parents_with_children(p_school_id uuid)
returns table (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  relation text,
  created_at timestamp with time zone,
  children_count bigint
) language plpgsql security definer as $$
begin
  return query
  select 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.phone,
    u.relation,
    u.created_at,
    coalesce(
      (select count(*)
       from public.student_parents sp
       where sp.parent_id = u.id
      ), 0
    ) as children_count
  from public.users u
  where u.school_id = p_school_id
  and u.role = 'parent'
  order by u.created_at desc;
end;
$$; 