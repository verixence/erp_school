-- ---------- Phase 2.2 Enhancements ----------

-- Add missing fields to students table for full profile
alter table public.students add column if not exists admission_no text;
alter table public.students add column if not exists gender text check (gender in ('male', 'female', 'other'));
alter table public.students add column if not exists student_email text;
alter table public.students add column if not exists student_phone text;

-- Add unique constraint for admission_no per school
create unique index if not exists idx_students_admission_no_school 
  on public.students(school_id, admission_no) 
  where admission_no is not null;

-- Add missing fields to users table for teachers and parents
alter table public.users add column if not exists first_name text;
alter table public.users add column if not exists last_name text;
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists employee_id text;
alter table public.users add column if not exists subjects text[];
alter table public.users add column if not exists relation text; -- for parents: father/mother/guardian

-- Create classes table
create table if not exists public.classes (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid references public.schools on delete cascade,
  class_name    text not null,
  grade         text not null,
  section       text not null,
  teacher_id    uuid references public.users on delete set null,
  capacity      integer default 30,
  students_count integer default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Add indexes for classes
create index if not exists idx_classes_school_id on public.classes(school_id);
create index if not exists idx_classes_teacher_id on public.classes(teacher_id);
create unique index if not exists idx_classes_grade_section_school 
  on public.classes(school_id, grade, section);

-- RLS for classes
alter table public.classes enable row level security;

create policy "Classes: same school"
  on public.classes
  for all using (
    (select role from public.users where id = auth.uid()) = 'super_admin'
    or school_id = (select school_id from public.users where id = auth.uid())
  );

-- Add unique constraint for employee_id per school
create unique index if not exists idx_users_employee_id_school 
  on public.users(school_id, employee_id) 
  where employee_id is not null;

-- Update RLS policies for users to allow same school access
drop policy if exists "Users: same school CRUD" on public.users;
create policy "Users: same school CRUD"
  on public.users
  for all using (
    (select role from public.users where id = auth.uid()) = 'super_admin'
    or school_id = (select school_id from public.users where id = auth.uid())
    or auth.uid() = id
  );

-- Update students RLS to allow CRUD operations
drop policy if exists "Students: same school CRUD" on public.students;
create policy "Students: same school CRUD"
  on public.students
  for all using (
    (select role from public.users where id = auth.uid()) = 'super_admin'
    or school_id = (select school_id from public.users where id = auth.uid())
  );

-- Add audit trigger for classes
drop trigger if exists audit_trigger on public.classes;
create trigger audit_trigger
  after insert or update or delete on public.classes
  for each row execute function public.audit_trigger_function();

-- Function to check admission number uniqueness
create or replace function check_admission_no_unique(
  p_school_id uuid,
  p_admission_no text,
  p_student_id uuid default null
)
returns boolean as $$
begin
  return not exists (
    select 1 from public.students 
    where school_id = p_school_id 
    and admission_no = p_admission_no 
    and (p_student_id is null or id != p_student_id)
  );
end;
$$ language plpgsql security definer;

-- Function to check employee ID uniqueness
create or replace function check_employee_id_unique(
  p_school_id uuid,
  p_employee_id text,
  p_user_id uuid default null
)
returns boolean as $$
begin
  return not exists (
    select 1 from public.users 
    where school_id = p_school_id 
    and employee_id = p_employee_id 
    and (p_user_id is null or id != p_user_id)
  );
end;
$$ language plpgsql security definer;

-- Function to update students count in classes
create or replace function update_class_students_count()
returns trigger as $$
begin
  -- Update the count for the affected class
  if TG_OP = 'INSERT' then
    update public.classes 
    set students_count = (
      select count(*) from public.students 
      where grade = NEW.grade and section = NEW.section and school_id = NEW.school_id
    )
    where school_id = NEW.school_id and grade = NEW.grade and section = NEW.section;
  elsif TG_OP = 'DELETE' then
    update public.classes 
    set students_count = (
      select count(*) from public.students 
      where grade = OLD.grade and section = OLD.section and school_id = OLD.school_id
    )
    where school_id = OLD.school_id and grade = OLD.grade and section = OLD.section;
  elsif TG_OP = 'UPDATE' then
    -- Update old class count
    if OLD.grade != NEW.grade or OLD.section != NEW.section then
      update public.classes 
      set students_count = (
        select count(*) from public.students 
        where grade = OLD.grade and section = OLD.section and school_id = OLD.school_id
      )
      where school_id = OLD.school_id and grade = OLD.grade and section = OLD.section;
    end if;
    
    -- Update new class count
    update public.classes 
    set students_count = (
      select count(*) from public.students 
      where grade = NEW.grade and section = NEW.section and school_id = NEW.school_id
    )
    where school_id = NEW.school_id and grade = NEW.grade and section = NEW.section;
  end if;
  
  return coalesce(NEW, OLD);
end;
$$ language plpgsql;

-- Add trigger to update class students count
drop trigger if exists update_class_count_trigger on public.students;
create trigger update_class_count_trigger
  after insert or update or delete on public.students
  for each row execute function update_class_students_count(); 