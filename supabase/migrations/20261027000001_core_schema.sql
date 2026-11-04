-- =====================================================================
-- ইনকিলাব যুব সংগঠন — core schema
-- Tables, helper functions, triggers and Row-Level Security.
-- Every table has RLS enabled; anything not granted by a policy is denied.
-- =====================================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Bangladesh local "today" / year, used for numbering and date checks.
create or replace function private.bd_now()
returns timestamp
language sql
stable
set search_path = ''
as $$ select now() at time zone 'Asia/Dhaka' $$;

-- ---------------------------------------------------------------------
-- Roles & permissions
-- ---------------------------------------------------------------------
create table public.permissions (
  key         text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'),
  name_bn     text not null,
  description text,
  sort_order  int  not null default 0
);

create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique check (key ~ '^[a-z][a-z0-9_]{1,40}$'),
  name_bn     text not null check (char_length(name_bn) between 1 and 80),
  description text check (char_length(description) <= 500),
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger roles_updated_at before update on public.roles
  for each row execute function private.set_updated_at();

create table public.role_permissions (
  role_id    uuid not null references public.roles(id) on delete cascade,
  permission text not null references public.permissions(key) on delete cascade,
  primary key (role_id, permission)
);

-- Admin-panel accounts. Ordinary members/applicants never get accounts.
create table public.staff_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null check (char_length(full_name) between 1 and 120),
  role_id    uuid not null references public.roles(id),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index staff_profiles_role_idx on public.staff_profiles(role_id);
create trigger staff_profiles_updated_at before update on public.staff_profiles
  for each row execute function private.set_updated_at();

-- Is the current user an active super admin?
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_profiles sp
    join public.roles r on r.id = sp.role_id
    where sp.id = (select auth.uid()) and sp.is_active and r.key = 'super_admin'
  );
$$;

-- Does the current user hold a permission? Super admins hold every permission.
create or replace function public.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_profiles sp
    join public.roles r on r.id = sp.role_id
    left join public.role_permissions rp
      on rp.role_id = sp.role_id and rp.permission = p_permission
    where sp.id = (select auth.uid())
      and sp.is_active
      and (r.key = 'super_admin' or rp.permission is not null)
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_profiles sp
    where sp.id = (select auth.uid()) and sp.is_active
  );
$$;

-- Current user's permission list (used by the admin UI to show/hide menus;
-- the database still enforces every permission independently).
create or replace function public.my_permissions()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(p.key order by p.sort_order), '{}')
  from public.permissions p
  where public.has_permission(p.key);
$$;

-- Guard: system roles keep their key; super_admin is immutable; system roles
-- cannot be deleted.
create or replace function private.guard_roles()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_system then
      raise exception 'SYSTEM_ROLE_LOCKED' using errcode = 'P0001';
    end if;
    return old;
  end if;
  if old.is_system and (new.key <> old.key or new.is_system <> old.is_system) then
    raise exception 'SYSTEM_ROLE_LOCKED' using errcode = 'P0001';
  end if;
  if old.key = 'super_admin' and (select auth.uid()) is not null then
    raise exception 'SYSTEM_ROLE_LOCKED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger roles_guard before update or delete on public.roles
  for each row execute function private.guard_roles();

-- Guard: super_admin permissions are implicit and cannot be edited.
create or replace function private.guard_role_permissions()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_role uuid := coalesce(new.role_id, old.role_id);
begin
  if (select auth.uid()) is not null
     and exists (select 1 from public.roles r where r.id = v_role and r.key = 'super_admin') then
    raise exception 'SYSTEM_ROLE_LOCKED' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger role_permissions_guard before insert or update or delete on public.role_permissions
  for each row execute function private.guard_role_permissions();

-- Guard: only a super admin may grant/revoke super admin, and the last
-- active super admin can never be removed or deactivated.
create or replace function private.guard_staff_profiles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_super uuid := (select id from public.roles where key = 'super_admin');
  v_old_super boolean := tg_op in ('UPDATE', 'DELETE') and old.role_id = v_super and old.is_active;
  v_new_super boolean := tg_op in ('INSERT', 'UPDATE') and new.role_id = v_super and new.is_active;
  v_touches_super boolean := v_old_super or (tg_op in ('INSERT', 'UPDATE') and new.role_id = v_super);
begin
  if v_touches_super and (select auth.uid()) is not null and not public.is_super_admin() then
    raise exception 'SUPER_ADMIN_ONLY' using errcode = '42501';
  end if;
  if v_old_super and not v_new_super then
    if not exists (
      select 1 from public.staff_profiles
      where role_id = v_super and is_active and id <> old.id
    ) then
      raise exception 'LAST_SUPER_ADMIN' using errcode = 'P0001';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
create trigger staff_profiles_guard before insert or update or delete on public.staff_profiles
  for each row execute function private.guard_staff_profiles();

-- ---------------------------------------------------------------------
-- Designations (পদবী)
-- ---------------------------------------------------------------------
create table public.designations (
  id         smallint generated by default as identity primary key,
  name_bn    text not null unique check (char_length(name_bn) between 1 and 80),
  rank_order int  not null default 100,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Activity categories (each one owns a storage folder activities/<slug>/)
-- ---------------------------------------------------------------------
create table public.activity_categories (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name_bn        text not null check (char_length(name_bn) between 1 and 120),
  summary        text not null default '' check (char_length(summary) <= 400),
  description    text not null default '' check (char_length(description) <= 5000),
  icon           text not null default 'heart-handshake' check (icon ~ '^[a-z0-9-]{1,40}$'),
  sort_order     int  not null default 0,
  is_active      boolean not null default true,
  cover_image_id uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger activity_categories_updated_at before update on public.activity_categories
  for each row execute function private.set_updated_at();

-- The slug is the storage folder name; renaming it would orphan files.
create or replace function private.guard_category_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug <> old.slug then
    raise exception 'CATEGORY_SLUG_IMMUTABLE' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger activity_categories_slug_guard before update on public.activity_categories
  for each row execute function private.guard_category_slug();

-- ---------------------------------------------------------------------
-- Gallery images (registry of files in the "gallery" bucket)
-- ---------------------------------------------------------------------
create table public.gallery_images (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.activity_categories(id) on delete restrict,
  storage_path text not null unique check (storage_path ~ '^activities/[a-z0-9-]+/[^/]+$'),
  thumb_path   text unique check (thumb_path ~ '^activities/[a-z0-9-]+/thumbs/[^/]+$'),
  width        int check (width > 0),
  height       int check (height > 0),
  size_bytes   int check (size_bytes >= 0),
  caption      text not null default '' check (char_length(caption) <= 300),
  event_date   date,
  is_published boolean not null default true,
  is_featured  boolean not null default false,
  sort_order   int not null default 0,
  source       text not null default 'upload' check (source in ('upload', 'sync')),
  uploaded_by  uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index gallery_images_category_idx on public.gallery_images(category_id, is_published, sort_order, created_at desc);
create index gallery_images_featured_idx on public.gallery_images(is_featured) where is_featured;
create trigger gallery_images_updated_at before update on public.gallery_images
  for each row execute function private.set_updated_at();

-- Keep storage folders and the database in sync: a file must live in the
-- folder of the category it is registered under.
create or replace function private.guard_gallery_path()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_slug text;
begin
  select slug into v_slug from public.activity_categories where id = new.category_id;
  if new.storage_path not like 'activities/' || v_slug || '/%'
     or (new.thumb_path is not null and new.thumb_path not like 'activities/' || v_slug || '/thumbs/%') then
    raise exception 'GALLERY_PATH_MISMATCH' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger gallery_images_path_guard before insert or update on public.gallery_images
  for each row execute function private.guard_gallery_path();

alter table public.activity_categories
  add constraint activity_categories_cover_fk
  foreign key (cover_image_id) references public.gallery_images(id) on delete set null;

-- ---------------------------------------------------------------------
-- Yearly numbering: IJS-A-2026-0001 (applications), IJS-2026-0001 (members)
-- ---------------------------------------------------------------------
create table private.id_counters (
  kind       text not null check (kind in ('application', 'member')),
  year       int  not null,
  last_value int  not null default 0,
  primary key (kind, year)
);

create or replace function private.next_number(p_kind text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year int := extract(year from private.bd_now())::int;
  v_val  int;
  v_no   text;
begin
  loop
    insert into private.id_counters as c (kind, year, last_value)
    values (p_kind, v_year, 1)
    on conflict (kind, year) do update set last_value = c.last_value + 1
    returning last_value into v_val;

    v_no := case p_kind
      when 'application' then format('IJS-A-%s-%s', v_year, lpad(v_val::text, 4, '0'))
      else format('IJS-%s-%s', v_year, lpad(v_val::text, 4, '0'))
    end;

    -- Skip numbers already taken manually (e.g. legacy paper members).
    exit when p_kind = 'application'
      and not exists (select 1 from public.membership_applications where application_no = v_no);
    exit when p_kind = 'member'
      and not exists (select 1 from public.members where member_no = v_no);
  end loop;
  return v_no;
end;
$$;

-- ---------------------------------------------------------------------
-- Membership applications (private)
-- ---------------------------------------------------------------------
create table public.membership_applications (
  id                      uuid primary key default gen_random_uuid(),
  application_no          text not null unique,
  full_name               text not null check (char_length(full_name) between 2 and 120),
  father_name             text not null check (char_length(father_name) between 2 and 120),
  mother_name             text not null check (char_length(mother_name) between 2 and 120),
  date_of_birth           date not null check (date_of_birth > date '1920-01-01'),
  nationality             text not null check (char_length(nationality) between 2 and 60),
  religion                text not null check (char_length(religion) between 2 and 60),
  occupation              text not null check (char_length(occupation) between 2 and 120),
  permanent_address       text not null check (char_length(permanent_address) between 5 and 500),
  present_address         text not null check (char_length(present_address) between 5 and 500),
  id_type                 text not null check (id_type in ('nid', 'birth_reg')),
  id_number               text not null,
  mobile                  text not null check (mobile ~ '^01[3-9][0-9]{8}$'),
  email                   text check (email is null or (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  blood_group             text check (blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  declaration_accepted_at timestamptz not null,
  directory_consent       boolean not null default false,
  status                  text not null default 'pending'
                          check (status in ('pending', 'under_review', 'approved', 'rejected')),
  decision_note           text check (char_length(decision_note) <= 1000),
  reviewed_by             uuid references auth.users(id) on delete set null,
  reviewed_at             timestamptz,
  submission_token        uuid unique,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint membership_applications_id_number_format check (
    (id_type = 'nid' and id_number ~ '^([0-9]{10}|[0-9]{13}|[0-9]{17})$')
    or (id_type = 'birth_reg' and id_number ~ '^[0-9]{17}$')
  )
);
-- One open/approved application per NID / birth-registration number.
create unique index membership_applications_open_id_number_uniq
  on public.membership_applications(id_number) where status <> 'rejected';
create index membership_applications_status_idx
  on public.membership_applications(status, created_at desc);
create trigger membership_applications_updated_at before update on public.membership_applications
  for each row execute function private.set_updated_at();

create table public.application_status_history (
  id             bigint generated always as identity primary key,
  application_id uuid not null references public.membership_applications(id) on delete cascade,
  from_status    text,
  to_status      text not null,
  note           text,
  changed_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index application_status_history_app_idx on public.application_status_history(application_id, created_at);

create or replace function private.log_application_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.application_status_history (application_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, (select auth.uid()));
  elsif new.status is distinct from old.status then
    insert into public.application_status_history (application_id, from_status, to_status, note, changed_by)
    values (new.id, old.status, new.status, new.decision_note, (select auth.uid()));
  end if;
  return new;
end;
$$;
create trigger membership_applications_status_log
  after insert or update of status on public.membership_applications
  for each row execute function private.log_application_status();

-- ---------------------------------------------------------------------
-- Members (approved). Public data is exposed ONLY via public_members view.
-- ---------------------------------------------------------------------
create table public.members (
  id                    uuid primary key default gen_random_uuid(),
  member_no             text not null unique check (member_no ~ '^IJS-[0-9]{4}-[0-9]{4,}$'),
  application_id        uuid unique references public.membership_applications(id) on delete set null,
  full_name             text not null check (char_length(full_name) between 2 and 120),
  designation_id        smallint not null references public.designations(id),
  photo_path            text check (photo_path ~ '^photos/[^/]+$'),
  status                text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  -- private contact (staff only)
  mobile                text check (mobile is null or mobile ~ '^01[3-9][0-9]{8}$'),
  email                 text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  blood_group           text check (blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  -- publication controls
  directory_consent     boolean not null default false,
  show_in_directory     boolean not null default false,
  public_phone_consent  boolean not null default false,
  public_phone          text check (public_phone is null or public_phone ~ '^01[3-9][0-9]{8}$'),
  joined_on             date not null default ((now() at time zone 'Asia/Dhaka')::date),
  sort_order            int  not null default 0,
  notes                 text check (char_length(notes) <= 1000),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- Privacy is enforced by the database, not only by the UI.
  constraint members_directory_requires_consent check (not show_in_directory or directory_consent),
  constraint members_phone_requires_consent check (public_phone is null or public_phone_consent)
);
create index members_directory_idx on public.members(status, show_in_directory);
create index members_designation_idx on public.members(designation_id);
create trigger members_updated_at before update on public.members
  for each row execute function private.set_updated_at();

create or replace function private.assign_member_no()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.member_no is null or new.member_no = '' then
    new.member_no := private.next_number('member');
  end if;
  return new;
end;
$$;
create trigger members_assign_no before insert on public.members
  for each row execute function private.assign_member_no();

-- Directory: only safe columns, only active + consented members.
create view public.public_members
with (security_invoker = false, security_barrier = true)
as
select
  m.id,
  m.member_no,
  m.full_name,
  m.photo_path,
  d.id         as designation_id,
  d.name_bn    as designation,
  d.rank_order as designation_rank,
  case when m.public_phone_consent then m.public_phone end as public_phone,
  m.sort_order,
  m.joined_on
from public.members m
join public.designations d on d.id = m.designation_id
where m.status = 'active' and m.show_in_directory and m.directory_consent;

-- ---------------------------------------------------------------------
-- Announcements, site settings, contact messages
-- ---------------------------------------------------------------------
create table public.announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 2 and 200),
  body         text not null default '' check (char_length(body) <= 20000),
  is_published boolean not null default false,
  is_pinned    boolean not null default false,
  published_at timestamptz,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index announcements_public_idx on public.announcements(is_published, is_pinned desc, published_at desc);
create trigger announcements_updated_at before update on public.announcements
  for each row execute function private.set_updated_at();

create or replace function private.set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_published and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;
create trigger announcements_published_at before insert or update on public.announcements
  for each row execute function private.set_published_at();

create table public.site_settings (
  key        text primary key check (key ~ '^[a-z_]+$'),
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function private.set_updated_at();

create table public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 2 and 120),
  mobile     text check (mobile is null or mobile ~ '^01[3-9][0-9]{8}$'),
  email      text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  subject    text not null check (char_length(subject) between 2 and 200),
  message    text not null check (char_length(message) between 5 and 5000),
  is_read    boolean not null default false,
  created_at timestamptz not null default now(),
  constraint contact_messages_reply_channel check (mobile is not null or email is not null)
);
create index contact_messages_created_idx on public.contact_messages(is_read, created_at desc);

-- Outgoing email log (application received / approved / rejected).
create table public.notification_log (
  id             bigint generated always as identity primary key,
  application_id uuid references public.membership_applications(id) on delete cascade,
  kind           text not null check (kind in ('application_received', 'application_approved', 'application_rejected')),
  recipient      text not null,
  status         text not null check (status in ('sent', 'failed', 'skipped')),
  error          text,
  created_at     timestamptz not null default now()
);
create index notification_log_app_idx on public.notification_log(application_id);

-- ---------------------------------------------------------------------
-- Rate limiting (service role only)
-- ---------------------------------------------------------------------
create table private.rate_limits (
  bucket       text not null,
  key          text not null,
  window_start timestamptz not null,
  hits         int not null default 0,
  primary key (bucket, key, window_start)
);

create or replace function public.check_rate_limit(
  p_bucket text, p_key text, p_max int, p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits int;
begin
  insert into private.rate_limits as r (bucket, key, window_start, hits)
  values (p_bucket, p_key, v_window, 1)
  on conflict (bucket, key, window_start) do update set hits = r.hits + 1
  returning hits into v_hits;

  -- Opportunistic cleanup of old windows.
  if random() < 0.02 then
    delete from private.rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_hits <= p_max;
end;
$$;

-- ---------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references auth.users(id) on delete set null,
  actor_name  text,
  action      text not null,
  entity_type text not null,
  entity_id   text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs(created_at desc);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);

-- Generic row-change audit. Personal data columns are never copied into the
-- log; only the fact that they changed is recorded.
create or replace function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor   uuid := (select auth.uid());
  v_name    text;
  v_old     jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new     jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row     jsonb := coalesce(v_new, v_old);
  -- Personal data: only the fact that the column changed is logged, never the
  -- value, so an erasure request is satisfied by deleting the source record.
  v_private text[] := array[
    'full_name', 'father_name', 'mother_name', 'date_of_birth', 'nationality', 'religion',
    'occupation', 'permanent_address', 'present_address', 'id_number', 'mobile', 'email',
    'blood_group', 'public_phone', 'decision_note', 'notes', 'body', 'description', 'value'
  ];
  v_skip    text[] := array['updated_at', 'created_at'];
  v_changed text[] := '{}';
  v_values  jsonb := '{}'::jsonb;
  k         text;
begin
  if v_actor is not null then
    select full_name into v_name from public.staff_profiles where id = v_actor;
  end if;

  for k in select jsonb_object_keys(v_row) loop
    continue when k = any(v_skip);
    if tg_op = 'UPDATE' and (v_old -> k) is not distinct from (v_new -> k) then
      continue;
    end if;
    v_changed := v_changed || k;
    if not (k = any(v_private)) then
      v_values := v_values || jsonb_build_object(k, v_row -> k);
    end if;
  end loop;

  if tg_op = 'UPDATE' and cardinality(v_changed) = 0 then
    return new;
  end if;

  insert into public.audit_logs (actor_id, actor_name, action, entity_type, entity_id, details)
  values (
    v_actor,
    v_name,
    lower(tg_op),
    tg_table_name,
    coalesce(v_row ->> 'id', v_row ->> 'key', v_row ->> 'role_id'),
    jsonb_build_object('changed', to_jsonb(v_changed), 'values', v_values)
  );
  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'roles', 'role_permissions', 'staff_profiles', 'designations', 'activity_categories',
    'gallery_images', 'membership_applications', 'members', 'announcements', 'site_settings'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function private.audit_row_change()',
      t || '_audit', t
    );
  end loop;
end;
$$;

-- =====================================================================
-- Row-Level Security
-- =====================================================================
alter table public.permissions                enable row level security;
alter table public.roles                      enable row level security;
alter table public.role_permissions           enable row level security;
alter table public.staff_profiles             enable row level security;
alter table public.designations               enable row level security;
alter table public.activity_categories        enable row level security;
alter table public.gallery_images             enable row level security;
alter table public.membership_applications    enable row level security;
alter table public.application_status_history enable row level security;
alter table public.members                    enable row level security;
alter table public.announcements              enable row level security;
alter table public.site_settings              enable row level security;
alter table public.contact_messages           enable row level security;
alter table public.notification_log           enable row level security;
alter table public.audit_logs                 enable row level security;

-- Permissions / roles: readable by staff; editable by users.manage.
create policy permissions_staff_read on public.permissions
  for select to authenticated using ((select public.is_staff()));

create policy roles_staff_read on public.roles
  for select to authenticated using ((select public.is_staff()));
create policy roles_manage_insert on public.roles
  for insert to authenticated with check ((select public.has_permission('users.manage')));
create policy roles_manage_update on public.roles
  for update to authenticated using ((select public.has_permission('users.manage')))
  with check ((select public.has_permission('users.manage')));
create policy roles_manage_delete on public.roles
  for delete to authenticated using ((select public.has_permission('users.manage')));

create policy role_permissions_staff_read on public.role_permissions
  for select to authenticated using ((select public.is_staff()));
create policy role_permissions_manage_insert on public.role_permissions
  for insert to authenticated with check ((select public.has_permission('users.manage')));
create policy role_permissions_manage_delete on public.role_permissions
  for delete to authenticated using ((select public.has_permission('users.manage')));

-- Staff profiles: everyone sees their own row; users.manage sees/edits all.
-- Staff names are readable by all staff (shown in audit/decision history).
create policy staff_profiles_read on public.staff_profiles
  for select to authenticated using ((select public.is_staff()) or id = (select auth.uid()));
create policy staff_profiles_manage_insert on public.staff_profiles
  for insert to authenticated with check ((select public.has_permission('users.manage')));
create policy staff_profiles_manage_update on public.staff_profiles
  for update to authenticated using ((select public.has_permission('users.manage')))
  with check ((select public.has_permission('users.manage')));
create policy staff_profiles_manage_delete on public.staff_profiles
  for delete to authenticated using ((select public.has_permission('users.manage')));

-- Designations: public read (active); members.manage edits.
create policy designations_public_read on public.designations
  for select to anon, authenticated using (is_active or (select public.is_staff()));
create policy designations_manage_insert on public.designations
  for insert to authenticated with check ((select public.has_permission('members.manage')));
create policy designations_manage_update on public.designations
  for update to authenticated using ((select public.has_permission('members.manage')))
  with check ((select public.has_permission('members.manage')));

-- Activity categories: public read (active); content.manage edits.
create policy activity_categories_public_read on public.activity_categories
  for select to anon, authenticated using (is_active or (select public.is_staff()));
create policy activity_categories_manage_insert on public.activity_categories
  for insert to authenticated with check ((select public.has_permission('content.manage')));
create policy activity_categories_manage_update on public.activity_categories
  for update to authenticated using ((select public.has_permission('content.manage')))
  with check ((select public.has_permission('content.manage')));

-- Gallery images: public sees published images in active categories.
create policy gallery_images_public_read on public.gallery_images
  for select to anon, authenticated using (
    (is_published and exists (
      select 1 from public.activity_categories c where c.id = category_id and c.is_active))
    or (select public.has_permission('gallery.manage'))
  );
create policy gallery_images_manage_insert on public.gallery_images
  for insert to authenticated with check ((select public.has_permission('gallery.manage')));
create policy gallery_images_manage_update on public.gallery_images
  for update to authenticated using ((select public.has_permission('gallery.manage')))
  with check ((select public.has_permission('gallery.manage')));
create policy gallery_images_delete on public.gallery_images
  for delete to authenticated using ((select public.has_permission('gallery.delete')));

-- Applications: never public. Read by applications.view; status changes
-- only through the review functions below; delete only applications.delete.
create policy membership_applications_staff_read on public.membership_applications
  for select to authenticated using ((select public.has_permission('applications.view')));
create policy membership_applications_delete on public.membership_applications
  for delete to authenticated using ((select public.has_permission('applications.delete')));

create policy application_status_history_read on public.application_status_history
  for select to authenticated using ((select public.has_permission('applications.view')));

-- Members: private table. members.view reads; members.manage edits.
create policy members_staff_read on public.members
  for select to authenticated using (
    (select public.has_permission('members.view')) or (select public.has_permission('members.manage'))
  );
create policy members_manage_insert on public.members
  for insert to authenticated with check ((select public.has_permission('members.manage')));
create policy members_manage_update on public.members
  for update to authenticated using ((select public.has_permission('members.manage')))
  with check ((select public.has_permission('members.manage')));

-- Announcements: public read published; content.manage edits.
create policy announcements_public_read on public.announcements
  for select to anon, authenticated using (is_published or (select public.has_permission('content.manage')));
create policy announcements_manage_insert on public.announcements
  for insert to authenticated with check ((select public.has_permission('content.manage')));
create policy announcements_manage_update on public.announcements
  for update to authenticated using ((select public.has_permission('content.manage')))
  with check ((select public.has_permission('content.manage')));
create policy announcements_manage_delete on public.announcements
  for delete to authenticated using ((select public.has_permission('content.manage')));

-- Site settings: public read; content.manage edits.
create policy site_settings_public_read on public.site_settings
  for select to anon, authenticated using (true);
create policy site_settings_manage_insert on public.site_settings
  for insert to authenticated with check ((select public.has_permission('content.manage')));
create policy site_settings_manage_update on public.site_settings
  for update to authenticated using ((select public.has_permission('content.manage')))
  with check ((select public.has_permission('content.manage')));

-- Contact messages: inserted by the server (service role); messages.view reads.
create policy contact_messages_read on public.contact_messages
  for select to authenticated using ((select public.has_permission('messages.view')));
create policy contact_messages_update on public.contact_messages
  for update to authenticated using ((select public.has_permission('messages.view')))
  with check ((select public.has_permission('messages.view')));
create policy contact_messages_delete on public.contact_messages
  for delete to authenticated using ((select public.has_permission('messages.view')));

create policy notification_log_read on public.notification_log
  for select to authenticated using ((select public.has_permission('applications.view')));

create policy audit_logs_read on public.audit_logs
  for select to authenticated using ((select public.has_permission('audit.view')));

-- Column-level hardening: authenticated users may only update the columns the
-- admin UI edits (immutable keys/numbers cannot be rewritten even by staff).
revoke update on public.members from authenticated;
grant update (full_name, designation_id, photo_path, status, mobile, email, blood_group,
              directory_consent, show_in_directory, public_phone_consent, public_phone,
              joined_on, sort_order, notes)
  on public.members to authenticated;

revoke update on public.gallery_images from authenticated;
grant update (category_id, storage_path, thumb_path, caption, event_date, is_published,
              is_featured, sort_order)
  on public.gallery_images to authenticated;

revoke update on public.contact_messages from authenticated;
grant update (is_read) on public.contact_messages to authenticated;

revoke insert, update, delete on public.audit_logs, public.application_status_history,
  public.notification_log, public.permissions from anon, authenticated;
revoke insert, update on public.membership_applications from anon, authenticated;
revoke insert on public.contact_messages from anon, authenticated;

grant select on public.public_members to anon, authenticated;
