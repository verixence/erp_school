-- ---------- core tables ----------
create table public.schools (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  domain            text unique,
  enabled_features  jsonb default '{}',
  custom_modules    jsonb default '[]',
  status            text default 'active',
  created_at        timestamptz default now()
);

create type public.user_role as enum ('super_admin','school_admin','teacher','parent');

create table public.users (
  id         uuid primary key,
  email      text unique not null,
  role       public.user_role not null,
  school_id  uuid references public.schools on delete cascade,
  created_at timestamptz default now()
);

create table public.students (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid references public.schools on delete cascade,
  full_name  text,
  grade      text,
  section    text,
  parent_id  uuid references public.users on delete set null,
  created_at timestamptz default now()
);

-- ---------- indexes ----------
create index on public.users(school_id);
create index on public.students(school_id);

-- ---------- RLS ----------
alter table public.schools  enable row level security;
alter table public.users    enable row level security;
alter table public.students enable row level security;

-- Super admin can see all schools
create policy "Schools: super admin can see all"
  on public.schools
  for select using (
    (select role from public.users where id = auth.uid()) = 'super_admin'
  );

-- Super admin can update all schools  
create policy "Schools: super admin can update all"
  on public.schools
  for update using (
    (select role from public.users where id = auth.uid()) = 'super_admin'
  );

-- Users can see themselves
create policy "Users: self only"
  on public.users
  for select using (auth.uid() = id);

-- Super admin can see all users
create policy "Users: super admin can see all"
  on public.users
  for select using (
    (select role from public.users where id = auth.uid()) = 'super_admin'
  );

-- Students: same school or super admin
create policy "Students: same school"
  on public.students
  for select using (
    (select role from public.users where id = auth.uid()) = 'super_admin'
    or school_id = (select school_id from public.users where id = auth.uid())
  ); 