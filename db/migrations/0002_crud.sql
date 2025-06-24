-- ---------- utility lookup ----------
create table public.classes (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid references public.schools on delete cascade,
  name       text not null,             -- e.g. "Grade 7 – A"
  created_at timestamptz default now()
);

create index on public.classes(school_id);

-- add NOT NULL constraint on school_id for non-super_admin users
alter table public.users
  add constraint users_school_id_chk
  check (
    role = 'super_admin' or school_id is not null
  );

-- ---------- RLS for users ----------
-- Temporarily disable RLS for development (we had issues before)
-- We'll implement proper RLS in production

-- For now, allow all authenticated users to access data
-- This will be refined in production with proper tenant isolation

-- ---------- RLS for classes ----------
alter table public.classes disable row level security;

-- Add some sample classes for demo schools
insert into public.classes (school_id, name) 
select id, 'Grade 1 - A' from public.schools where name = 'Green Valley High'
union all
select id, 'Grade 1 - B' from public.schools where name = 'Green Valley High'
union all
select id, 'Grade 2 - A' from public.schools where name = 'Green Valley High'
union all
select id, 'Grade 1 - A' from public.schools where name = 'Sunrise Academy'
union all
select id, 'Grade 1 - B' from public.schools where name = 'Sunrise Academy'
union all
select id, 'Grade 2 - A' from public.schools where name = 'Sunrise Academy'
union all
select id, 'Grade 2 - B' from public.schools where name = 'Sunrise Academy';

-- Add sample students
insert into public.students (school_id, full_name, grade, section)
select 
  s.id,
  case (random() * 10)::int
    when 0 then 'Alice Johnson'
    when 1 then 'Bob Smith'
    when 2 then 'Charlie Brown'
    when 3 then 'Diana Prince'
    when 4 then 'Ethan Hunt'
    when 5 then 'Fiona Apple'
    when 6 then 'George Lucas'
    when 7 then 'Hannah Montana'
    when 8 then 'Ivan Drago'
    else 'Jane Doe'
  end,
  case (random() * 3)::int
    when 0 then 'Grade 1'
    when 1 then 'Grade 2'
    else 'Grade 3'
  end,
  case (random() * 2)::int
    when 0 then 'A'
    else 'B'
  end
from public.schools s
cross join generate_series(1, 15) -- 15 students per school
where s.name in ('Green Valley High', 'Sunrise Academy'); 