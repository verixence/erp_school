-- Exams, Report-cards, and Attendance Mode
-- Migration 0015_exams.sql

-- Exam Groups table
create table public.exam_groups (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools on delete cascade,
  name text not null,
  description text,
  exam_type text check (exam_type in ('monthly', 'quarterly', 'half_yearly', 'annual', 'unit_test', 'other')) default 'monthly',
  start_date date not null,
  end_date date not null,
  is_published boolean default false,
  created_by uuid references public.users on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Exam Papers table
create table public.exam_papers (
  id uuid primary key default gen_random_uuid(),
  exam_group_id uuid references public.exam_groups on delete cascade,
  school_id uuid references public.schools on delete cascade,
  section text not null,
  subject text not null,
  exam_date date,
  exam_time time,
  duration_minutes integer default 60,
  max_marks integer not null default 100,
  pass_marks integer default 35,
  instructions text,
  created_by uuid references public.users on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Marks table
create table public.marks (
  id uuid primary key default gen_random_uuid(),
  exam_paper_id uuid references public.exam_papers on delete cascade,
  student_id uuid references public.students on delete cascade,
  school_id uuid references public.schools on delete cascade,
  marks_obtained decimal(5,2),
  is_absent boolean default false,
  remarks text,
  entered_by uuid references public.users on delete set null,
  entered_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(exam_paper_id, student_id)
);

-- Add attendance_mode to schools table
alter table public.schools 
add column if not exists attendance_mode text 
check (attendance_mode in ('daily', 'per_period')) 
default 'daily';

-- Add media_urls to posts and announcements for file uploads
alter table public.posts 
add column if not exists media_urls text[] default '{}';

alter table public.announcements 
add column if not exists media_urls text[] default '{}';

-- Add indexes for performance
create index if not exists exam_groups_school_id_idx on public.exam_groups(school_id);
create index if not exists exam_groups_start_date_idx on public.exam_groups(start_date);

create index if not exists exam_papers_exam_group_id_idx on public.exam_papers(exam_group_id);
create index if not exists exam_papers_school_id_idx on public.exam_papers(school_id);
create index if not exists exam_papers_section_idx on public.exam_papers(section);

create index if not exists marks_exam_paper_id_idx on public.marks(exam_paper_id);
create index if not exists marks_student_id_idx on public.marks(student_id);
create index if not exists marks_school_id_idx on public.marks(school_id);

-- Enable RLS
alter table public.exam_groups enable row level security;
alter table public.exam_papers enable row level security;
alter table public.marks enable row level security;

-- RLS Policies for exam_groups
create policy "exam_groups_school_access" on public.exam_groups
  for all using (
    auth.uid() in (
      select id from public.users 
      where school_id = exam_groups.school_id 
      and role in ('school_admin', 'teacher')
    )
  );

-- RLS Policies for exam_papers
create policy "exam_papers_school_access" on public.exam_papers
  for all using (
    auth.uid() in (
      select id from public.users 
      where school_id = exam_papers.school_id 
      and role in ('school_admin', 'teacher')
    )
  );

-- RLS Policies for marks
create policy "marks_school_access" on public.marks
  for all using (
    auth.uid() in (
      select id from public.users 
      where school_id = marks.school_id 
      and role in ('school_admin', 'teacher')
    )
    or 
    -- Students can view their own marks
    (auth.uid() in (
      select s.parent_id from public.students s 
      where s.id = marks.student_id
    ) and current_setting('request.method', true) = 'GET')
  );

-- Create updated_at trigger function if it doesn't exist
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Add updated_at triggers
create trigger exam_groups_updated_at
  before update on public.exam_groups
  for each row execute function public.handle_updated_at();

create trigger exam_papers_updated_at
  before update on public.exam_papers
  for each row execute function public.handle_updated_at();

create trigger marks_updated_at
  before update on public.marks
  for each row execute function public.handle_updated_at(); 