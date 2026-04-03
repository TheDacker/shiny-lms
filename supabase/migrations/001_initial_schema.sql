-- ============================================================
-- Shiny Shell LMS — Initial Schema
-- ============================================================

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------

create type user_role     as enum ('learner', 'manager', 'admin');
create type course_status as enum ('draft', 'published');
create type media_type    as enum ('video', 'audio', 'text', 'flashcard');
create type question_type as enum ('multiple_choice', 'true_false', 'fill_blank');

-- ------------------------------------------------------------
-- Locations  (no FK deps)
-- ------------------------------------------------------------

create table locations (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  state      char(2)     not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Users  (extends auth.users)
-- ------------------------------------------------------------

create table users (
  id           uuid       primary key references auth.users(id) on delete cascade,
  first_name   text       not null,
  last_name    text       not null,
  email        text       not null unique,
  phone        text,
  role         user_role  not null default 'learner',
  location_id  uuid       references locations(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Auto-create public.users row when Supabase Auth creates a new user.
-- Expects user_metadata keys: first_name, last_name, role, location_id (optional).
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, first_name, last_name, email, role, location_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name',  ''),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'learner'),
    nullif(new.raw_user_meta_data->>'location_id', '')::uuid
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ------------------------------------------------------------
-- Courses
-- ------------------------------------------------------------

create table courses (
  id                uuid          primary key default gen_random_uuid(),
  title             text          not null,
  description       text,
  cover_image_url   text,
  open_enrollment   boolean       not null default false,
  status            course_status not null default 'draft',
  created_by        uuid          references users(id) on delete set null,
  created_at        timestamptz   not null default now()
);

-- Junction: which locations can see a course
create table course_locations (
  course_id   uuid not null references courses(id)   on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  primary key (course_id, location_id)
);

-- ------------------------------------------------------------
-- Paths
-- ------------------------------------------------------------

create table paths (
  id               uuid        primary key default gen_random_uuid(),
  title            text        not null,
  description      text,
  cover_image_url  text,
  created_by       uuid        references users(id) on delete set null,
  created_at       timestamptz not null default now()
);

-- Junction: ordered courses within a path
create table path_courses (
  path_id   uuid    not null references paths(id)   on delete cascade,
  course_id uuid    not null references courses(id) on delete cascade,
  "order"   integer not null,
  primary key (path_id, course_id)
);

-- ------------------------------------------------------------
-- Assignments  (sections within a course)
-- ------------------------------------------------------------

create table assignments (
  id          uuid       primary key default gen_random_uuid(),
  course_id   uuid       not null references courses(id) on delete cascade,
  title       text       not null,
  media_type  media_type not null,
  media_url   text,
  embed_url   text,
  "order"     integer    not null,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Questions  (attached to an assignment)
-- ------------------------------------------------------------

create table questions (
  id             uuid          primary key default gen_random_uuid(),
  assignment_id  uuid          not null references assignments(id) on delete cascade,
  type           question_type not null,
  prompt         text          not null,
  options        jsonb,          -- array of strings for MC; null for fill_blank
  correct_answer text          not null,
  "order"        integer       not null
);

-- ------------------------------------------------------------
-- Enrollments  (user enrolled in a course OR a path, not both)
-- ------------------------------------------------------------

create table enrollments (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references users(id) on delete cascade,
  course_id   uuid        references courses(id) on delete cascade,
  path_id     uuid        references paths(id)   on delete cascade,
  enrolled_by uuid        references users(id)   on delete set null,
  enrolled_at timestamptz not null default now(),
  constraint enrollment_target check (
    (course_id is not null and path_id is null) or
    (course_id is null     and path_id is not null)
  ),
  unique (user_id, course_id),
  unique (user_id, path_id)
);

-- ------------------------------------------------------------
-- Progress  (per-assignment completion)
-- ------------------------------------------------------------

create table progress (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references users(id)       on delete cascade,
  assignment_id  uuid        not null references assignments(id) on delete cascade,
  completed      boolean     not null default false,
  score          integer,
  completed_at   timestamptz,
  unique (user_id, assignment_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table locations      enable row level security;
alter table users          enable row level security;
alter table courses        enable row level security;
alter table course_locations enable row level security;
alter table paths          enable row level security;
alter table path_courses   enable row level security;
alter table assignments    enable row level security;
alter table questions      enable row level security;
alter table enrollments    enable row level security;
alter table progress       enable row level security;

-- Helper: current user's role
create or replace function my_role()
returns user_role
language sql
security definer
stable
as $$
  select role from public.users where id = auth.uid()
$$;

-- Helper: current user's location
create or replace function my_location_id()
returns uuid
language sql
security definer
stable
as $$
  select location_id from public.users where id = auth.uid()
$$;

-- ------------------------------------------------------------
-- locations policies
-- ------------------------------------------------------------

create policy "authenticated users can read locations"
  on locations for select
  to authenticated
  using (true);

create policy "admins manage locations"
  on locations for all
  to authenticated
  using     (my_role() = 'admin')
  with check (my_role() = 'admin');

-- ------------------------------------------------------------
-- users policies
-- ------------------------------------------------------------

create policy "users read own row"
  on users for select
  to authenticated
  using (id = auth.uid());

create policy "managers read users at same location"
  on users for select
  to authenticated
  using (
    my_role() in ('manager', 'admin')
    and (location_id = my_location_id() or my_role() = 'admin')
  );

create policy "admins manage all users"
  on users for all
  to authenticated
  using     (my_role() = 'admin')
  with check (my_role() = 'admin');

create policy "users update own profile"
  on users for update
  to authenticated
  using     (id = auth.uid())
  with check (id = auth.uid());

-- ------------------------------------------------------------
-- courses policies
-- ------------------------------------------------------------

create policy "authenticated users read published courses"
  on courses for select
  to authenticated
  using (status = 'published');

create policy "admins read all courses"
  on courses for select
  to authenticated
  using (my_role() = 'admin');

create policy "admins manage courses"
  on courses for all
  to authenticated
  using     (my_role() = 'admin')
  with check (my_role() = 'admin');

-- ------------------------------------------------------------
-- course_locations policies
-- ------------------------------------------------------------

create policy "authenticated users read course_locations"
  on course_locations for select
  to authenticated
  using (true);

create policy "admins manage course_locations"
  on course_locations for all
  to authenticated
  using     (my_role() = 'admin')
  with check (my_role() = 'admin');

-- ------------------------------------------------------------
-- paths policies
-- ------------------------------------------------------------

create policy "authenticated users read paths"
  on paths for select
  to authenticated
  using (true);

create policy "admins manage paths"
  on paths for all
  to authenticated
  using     (my_role() = 'admin')
  with check (my_role() = 'admin');

-- ------------------------------------------------------------
-- path_courses policies
-- ------------------------------------------------------------

create policy "authenticated users read path_courses"
  on path_courses for select
  to authenticated
  using (true);

create policy "admins manage path_courses"
  on path_courses for all
  to authenticated
  using     (my_role() = 'admin')
  with check (my_role() = 'admin');

-- ------------------------------------------------------------
-- assignments policies
-- ------------------------------------------------------------

create policy "authenticated users read assignments of published courses"
  on assignments for select
  to authenticated
  using (
    exists (
      select 1 from courses
      where courses.id = assignments.course_id
        and courses.status = 'published'
    )
  );

create policy "admins read all assignments"
  on assignments for select
  to authenticated
  using (my_role() = 'admin');

create policy "admins manage assignments"
  on assignments for all
  to authenticated
  using     (my_role() = 'admin')
  with check (my_role() = 'admin');

-- ------------------------------------------------------------
-- questions policies
-- ------------------------------------------------------------

create policy "authenticated users read questions of published courses"
  on questions for select
  to authenticated
  using (
    exists (
      select 1 from assignments a
      join courses c on c.id = a.course_id
      where a.id = questions.assignment_id
        and c.status = 'published'
    )
  );

create policy "admins manage questions"
  on questions for all
  to authenticated
  using     (my_role() = 'admin')
  with check (my_role() = 'admin');

-- ------------------------------------------------------------
-- enrollments policies
-- ------------------------------------------------------------

create policy "users read own enrollments"
  on enrollments for select
  to authenticated
  using (user_id = auth.uid());

create policy "managers read enrollments in their location"
  on enrollments for select
  to authenticated
  using (
    my_role() in ('manager', 'admin')
    and (
      my_role() = 'admin'
      or exists (
        select 1 from users u
        where u.id = enrollments.user_id
          and u.location_id = my_location_id()
      )
    )
  );

create policy "managers and admins create enrollments"
  on enrollments for insert
  to authenticated
  with check (my_role() in ('manager', 'admin'));

create policy "managers and admins delete enrollments"
  on enrollments for delete
  to authenticated
  using (my_role() in ('manager', 'admin'));

-- ------------------------------------------------------------
-- progress policies
-- ------------------------------------------------------------

create policy "users read and write own progress"
  on progress for all
  to authenticated
  using     (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "managers and admins read progress"
  on progress for select
  to authenticated
  using (my_role() in ('manager', 'admin'));

-- ============================================================
-- Storage buckets
-- ============================================================

insert into storage.buckets (id, name, public)
values ('course-media', 'course-media', false);

create policy "authenticated users read course media"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'course-media');

create policy "admins upload course media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'course-media' and my_role() = 'admin');

create policy "admins delete course media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'course-media' and my_role() = 'admin');
