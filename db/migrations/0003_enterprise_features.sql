-- ---------- Audit logs table ----------
create table public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid references public.schools on delete cascade,
  user_id       uuid references public.users on delete set null,
  action        text not null,                    -- 'create', 'update', 'delete'
  entity_type   text not null,                    -- 'student', 'teacher', 'school', etc.
  entity_id     uuid,                             -- ID of the affected entity
  old_data      jsonb,                            -- Previous state (for updates/deletes)
  new_data      jsonb,                            -- New state (for creates/updates)
  metadata      jsonb default '{}',               -- Additional context
  created_at    timestamptz default now()
);

-- Add indexes for performance
create index on public.audit_logs(school_id);
create index on public.audit_logs(user_id);
create index on public.audit_logs(entity_type);
create index on public.audit_logs(created_at);

-- ---------- Enhanced students table ----------
-- Add more student fields for better management
alter table public.students add column if not exists email text;
alter table public.students add column if not exists phone text;
alter table public.students add column if not exists date_of_birth date;
alter table public.students add column if not exists address text;
alter table public.students add column if not exists guardian_name text;
alter table public.students add column if not exists guardian_phone text;
alter table public.students add column if not exists guardian_email text;
alter table public.students add column if not exists admission_date date default current_date;
alter table public.students add column if not exists status text default 'active' check (status in ('active', 'inactive', 'graduated', 'transferred'));

-- Add index for student email
create index if not exists idx_students_email on public.students(email) where email is not null;

-- ---------- Enhanced teachers table (promote from users) ----------
create table if not exists public.teachers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.users on delete cascade,
  school_id     uuid references public.schools on delete cascade,
  employee_id   text,
  first_name    text not null,
  last_name     text not null,
  email         text unique not null,
  phone         text,
  address       text,
  date_of_birth date,
  hire_date     date default current_date,
  department    text,
  subjects      text[], -- Array of subjects they teach
  qualifications text,
  salary        decimal(10,2),
  status        text default 'active' check (status in ('active', 'inactive', 'on_leave')),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Add indexes
create index if not exists idx_teachers_school_id on public.teachers(school_id);
create index if not exists idx_teachers_user_id on public.teachers(user_id);
create index if not exists idx_teachers_email on public.teachers(email);

-- ---------- RLS for new tables ----------
alter table public.audit_logs enable row level security;
alter table public.teachers enable row level security;

-- Audit logs: school members can see their school's logs, super admin sees all
create policy "Audit logs: school access"
  on public.audit_logs
  for select using (
    (select role from public.users where id = auth.uid()) = 'super_admin'
    or school_id = (select school_id from public.users where id = auth.uid())
  );

-- Teachers: same school or super admin
create policy "Teachers: same school"
  on public.teachers
  for all using (
    (select role from public.users where id = auth.uid()) = 'super_admin'
    or school_id = (select school_id from public.users where id = auth.uid())
  );

-- ---------- Trigger function for audit logs ----------
create or replace function public.audit_trigger_function()
returns trigger as $$
declare
  school_id_val uuid;
  user_id_val uuid;
begin
  -- Get current user ID
  user_id_val := auth.uid();
  
  -- Get school_id from the affected record or current user
  if TG_TABLE_NAME = 'schools' then
    school_id_val := coalesce(NEW.id, OLD.id);
  else
    school_id_val := coalesce(NEW.school_id, OLD.school_id);
  end if;

  -- Insert audit log
  insert into public.audit_logs (
    school_id,
    user_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data,
    metadata
  ) values (
    school_id_val,
    user_id_val,
    lower(TG_OP),
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(OLD) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(NEW) else null end,
    jsonb_build_object('timestamp', now(), 'operation', TG_OP)
  );

  return coalesce(NEW, OLD);
end;
$$ language plpgsql security definer;

-- Add audit triggers to key tables
drop trigger if exists audit_trigger on public.schools;
create trigger audit_trigger
  after insert or update or delete on public.schools
  for each row execute function public.audit_trigger_function();

drop trigger if exists audit_trigger on public.users;
create trigger audit_trigger
  after insert or update or delete on public.users
  for each row execute function public.audit_trigger_function();

drop trigger if exists audit_trigger on public.students;
create trigger audit_trigger
  after insert or update or delete on public.students
  for each row execute function public.audit_trigger_function();

drop trigger if exists audit_trigger on public.teachers;
create trigger audit_trigger
  after insert or update or delete on public.teachers
  for each row execute function public.audit_trigger_function(); 