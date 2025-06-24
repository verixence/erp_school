-- Phase 3 - Attendance System
-- Migration: 0006_attendance.sql

-- Create attendance_records table for daily attendance tracking
create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  school_id   uuid references public.schools(id)   on delete cascade not null,
  student_id  uuid references public.students(id)  on delete cascade not null,
  date        date not null,
  status      text not null check (status in ('present','absent','late','excused')),
  recorded_by uuid references public.users(id),     -- teacher/admin who recorded
  notes       text,
  created_at  timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at  timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create unique index to prevent duplicate attendance records for same student on same date
create unique index if not exists attendance_records_student_date_idx 
  on public.attendance_records(student_id, date);

-- Create index for efficient querying by school and date
create index if not exists attendance_records_school_date_idx 
  on public.attendance_records(school_id, date);

-- Enable RLS
alter table public.attendance_records enable row level security;

-- RLS Policy: Users can only access attendance records for their school
create policy "Attendance: same school access" on public.attendance_records
  for all using (
    (select role from public.users where id = auth.uid()) = 'super_admin'
    or school_id = (select school_id from public.users where id = auth.uid())
  )
  with check (
    (select role from public.users where id = auth.uid()) = 'super_admin'
    or school_id = (select school_id from public.users where id = auth.uid())
  );

-- Create audit_logs table for tracking system activities
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete set null,
  action text not null, -- 'create', 'update', 'delete'
  table_name text not null,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index for efficient querying
create index if not exists audit_logs_school_created_idx 
  on public.audit_logs(school_id, created_at desc);

-- Enable RLS for audit logs
alter table public.audit_logs enable row level security;

-- RLS Policy: Users can only access audit logs for their school
create policy "Audit logs: same school access" on public.audit_logs
  for select using (
    (select role from public.users where id = auth.uid()) = 'super_admin'
    or school_id = (select school_id from public.users where id = auth.uid())
  );

-- Create function to get attendance pivot data
create or replace function public.attendance_pivot(
  start_date date,
  end_date date,
  school_id_param uuid
)
returns table (
  student_id uuid,
  student_name text,
  admission_no text,
  grade text,
  section text,
  attendance_data jsonb
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    s.id as student_id,
    s.full_name as student_name,
    s.admission_no,
    s.grade,
    s.section,
    coalesce(
      jsonb_object_agg(
        ar.date::text, 
        jsonb_build_object(
          'status', ar.status,
          'recorded_by', ar.recorded_by,
          'notes', ar.notes
        )
      ) filter (where ar.date is not null),
      '{}'::jsonb
    ) as attendance_data
  from public.students s
  left join public.attendance_records ar 
    on s.id = ar.student_id 
    and ar.date between start_date and end_date
    and ar.school_id = school_id_param
  where s.school_id = school_id_param
  group by s.id, s.full_name, s.admission_no, s.grade, s.section
  order by s.grade, s.section, s.full_name;
end;
$$;

-- Create function to get attendance statistics
create or replace function public.get_attendance_stats(
  start_date date,
  end_date date,
  school_id_param uuid
)
returns table (
  total_students bigint,
  total_records bigint,
  present_count bigint,
  absent_count bigint,
  late_count bigint,
  excused_count bigint,
  attendance_rate numeric
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    (select count(*) from public.students where school_id = school_id_param) as total_students,
    count(ar.id) as total_records,
    count(ar.id) filter (where ar.status = 'present') as present_count,
    count(ar.id) filter (where ar.status = 'absent') as absent_count,
    count(ar.id) filter (where ar.status = 'late') as late_count,
    count(ar.id) filter (where ar.status = 'excused') as excused_count,
    case 
      when count(ar.id) > 0 then
        round(
          (count(ar.id) filter (where ar.status in ('present', 'late'))::numeric / count(ar.id)::numeric) * 100,
          2
        )
      else 0
    end as attendance_rate
  from public.attendance_records ar
  where ar.school_id = school_id_param
    and ar.date between start_date and end_date;
end;
$$; 