-- =====================================================================
-- Membership workflow functions, public helpers and storage.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Public submission (called by the Next.js server with the secret key
-- after validation, honeypot and rate-limit checks; never by browsers).
-- ---------------------------------------------------------------------
create or replace function public.submit_membership_application(p jsonb, p_token uuid)
returns table (application_id uuid, application_no text, already_submitted boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id    uuid;
  v_no    text;
  v_dob   date;
  v_idnum text := btrim(coalesce(p ->> 'id_number', ''));
begin
  if p_token is null then
    raise exception 'TOKEN_REQUIRED' using errcode = '22023';
  end if;

  -- Idempotency: the same form submission (double click, retry) returns the
  -- original application instead of creating a second one.
  select a.id, a.application_no into v_id, v_no
  from public.membership_applications a where a.submission_token = p_token;
  if found then
    return query select v_id, v_no, true;
    return;
  end if;

  if coalesce((p ->> 'declaration_accepted')::boolean, false) is not true then
    raise exception 'DECLARATION_REQUIRED' using errcode = '22023';
  end if;

  v_dob := (p ->> 'date_of_birth')::date;
  if v_dob is null or v_dob > (private.bd_now())::date then
    raise exception 'INVALID_DOB' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.membership_applications a
    where a.id_number = v_idnum and a.status <> 'rejected'
  ) then
    raise exception 'DUPLICATE_ID' using errcode = '23505';
  end if;

  v_no := private.next_number('application');

  begin
    insert into public.membership_applications (
      application_no, full_name, father_name, mother_name, date_of_birth, nationality,
      religion, occupation, permanent_address, present_address, id_type, id_number,
      mobile, email, blood_group, declaration_accepted_at, directory_consent, submission_token
    ) values (
      v_no,
      btrim(p ->> 'full_name'),
      btrim(p ->> 'father_name'),
      btrim(p ->> 'mother_name'),
      v_dob,
      btrim(p ->> 'nationality'),
      btrim(p ->> 'religion'),
      btrim(p ->> 'occupation'),
      btrim(p ->> 'permanent_address'),
      btrim(p ->> 'present_address'),
      p ->> 'id_type',
      v_idnum,
      btrim(p ->> 'mobile'),
      nullif(lower(btrim(coalesce(p ->> 'email', ''))), ''),
      nullif(btrim(coalesce(p ->> 'blood_group', '')), ''),
      now(),
      coalesce((p ->> 'directory_consent')::boolean, false),
      p_token
    )
    returning id into v_id;
  exception when unique_violation then
    -- Concurrent duplicate: same token (retry race) or same ID number.
    select a.id, a.application_no into v_id, v_no
    from public.membership_applications a where a.submission_token = p_token;
    if found then
      return query select v_id, v_no, true;
      return;
    end if;
    raise exception 'DUPLICATE_ID' using errcode = '23505';
  end;

  return query select v_id, v_no, false;
end;
$$;

-- Public status lookup: requires BOTH tracking number and mobile number;
-- reveals only status-level information.
create or replace function public.check_application_status(p_application_no text, p_mobile text)
returns table (
  application_no text,
  full_name      text,
  status         text,
  submitted_at   timestamptz,
  reviewed_at    timestamptz,
  member_no      text
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.application_no, a.full_name, a.status, a.created_at, a.reviewed_at, m.member_no
  from public.membership_applications a
  left join public.members m on m.application_id = a.id
  where a.application_no = upper(btrim(p_application_no))
    and a.mobile = btrim(p_mobile)
  limit 1;
$$;

-- Data needed to send a notification email after a submission/decision
-- (server-side only).
create or replace function public.application_contact(p_application_id uuid)
returns table (application_no text, full_name text, email text, status text, member_no text, decision_note text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.application_no, a.full_name, a.email, a.status, m.member_no, a.decision_note
  from public.membership_applications a
  left join public.members m on m.application_id = a.id
  where a.id = p_application_id;
$$;

-- ---------------------------------------------------------------------
-- Review workflow (called by signed-in staff; permission checked here).
-- ---------------------------------------------------------------------
create or replace function private.require_permission(p_permission text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission(p_permission) then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.start_application_review(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  perform private.require_permission('applications.review');
  select status into v_status from public.membership_applications
  where id = p_application_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_status <> 'pending' then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001';
  end if;
  update public.membership_applications
     set status = 'under_review', decision_note = null,
         reviewed_by = (select auth.uid()), reviewed_at = now()
   where id = p_application_id;
end;
$$;

create or replace function public.approve_application(
  p_application_id    uuid,
  p_designation_id    smallint default null,
  p_note              text default null,
  p_show_in_directory boolean default true
)
returns table (member_id uuid, member_no text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app    public.membership_applications;
  v_desig  smallint;
  v_member public.members;
begin
  perform private.require_permission('applications.review');

  select * into v_app from public.membership_applications
  where id = p_application_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_app.status not in ('pending', 'under_review') then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.members m where m.application_id = v_app.id) then
    raise exception 'ALREADY_MEMBER' using errcode = 'P0001';
  end if;

  v_desig := coalesce(
    p_designation_id,
    (select d.id from public.designations d where d.name_bn = 'সদস্য' limit 1)
  );
  if v_desig is null or not exists (select 1 from public.designations d where d.id = v_desig) then
    raise exception 'INVALID_DESIGNATION' using errcode = '22023';
  end if;

  update public.membership_applications
     set status = 'approved',
         decision_note = nullif(btrim(coalesce(p_note, '')), ''),
         reviewed_by = (select auth.uid()),
         reviewed_at = now()
   where id = v_app.id;

  insert into public.members (
    application_id, full_name, designation_id, mobile, email, blood_group,
    directory_consent, show_in_directory
  ) values (
    v_app.id, v_app.full_name, v_desig, v_app.mobile, v_app.email, v_app.blood_group,
    v_app.directory_consent,
    v_app.directory_consent and coalesce(p_show_in_directory, true)
  )
  returning * into v_member;

  return query select v_member.id, v_member.member_no;
end;
$$;

create or replace function public.reject_application(p_application_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  perform private.require_permission('applications.review');
  if char_length(btrim(coalesce(p_note, ''))) < 3 then
    raise exception 'NOTE_REQUIRED' using errcode = '22023';
  end if;
  select status into v_status from public.membership_applications
  where id = p_application_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_status not in ('pending', 'under_review') then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001';
  end if;
  update public.membership_applications
     set status = 'rejected', decision_note = btrim(p_note),
         reviewed_by = (select auth.uid()), reviewed_at = now()
   where id = p_application_id;
end;
$$;

-- Re-open a rejected application (e.g. rejected by mistake).
create or replace function public.reopen_application(p_application_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app public.membership_applications;
begin
  perform private.require_permission('applications.review');
  select * into v_app from public.membership_applications
  where id = p_application_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_app.status <> 'rejected' then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.membership_applications a
    where a.id_number = v_app.id_number and a.status <> 'rejected' and a.id <> v_app.id
  ) then
    raise exception 'DUPLICATE_ID' using errcode = '23505';
  end if;
  update public.membership_applications
     set status = 'under_review',
         decision_note = nullif(btrim(coalesce(p_note, '')), ''),
         reviewed_by = (select auth.uid()), reviewed_at = now()
   where id = p_application_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Public aggregate statistics (counts only, no personal data).
-- ---------------------------------------------------------------------
create or replace function public.public_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'active_members', (select count(*) from public.members where status = 'active'),
    'published_photos', (
      select count(*) from public.gallery_images g
      join public.activity_categories c on c.id = g.category_id
      where g.is_published and c.is_active),
    'activity_categories', (select count(*) from public.activity_categories where is_active)
  );
$$;

-- Category list with published photo counts (public gallery filters).
create or replace function public.category_photo_counts()
returns table (category_id uuid, photo_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, count(g.id)
  from public.activity_categories c
  left join public.gallery_images g on g.category_id = c.id and g.is_published
  where c.is_active
  group by c.id;
$$;

-- ---------------------------------------------------------------------
-- First super admin (run once from the Supabase SQL editor after creating
-- the user under Authentication → Users). Refuses if one already exists.
-- ---------------------------------------------------------------------
create or replace function public.bootstrap_super_admin(p_email text, p_full_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user  uuid;
  v_super uuid := (select id from public.roles where key = 'super_admin');
begin
  if exists (select 1 from public.staff_profiles where role_id = v_super and is_active) then
    raise exception 'SUPER_ADMIN_EXISTS' using errcode = 'P0001';
  end if;
  select id into v_user from auth.users where lower(email) = lower(btrim(p_email));
  if v_user is null then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
  end if;
  insert into public.staff_profiles (id, full_name, role_id)
  values (v_user, btrim(p_full_name), v_super)
  on conflict (id) do update set role_id = excluded.role_id, is_active = true, full_name = excluded.full_name;
end;
$$;

-- ---------------------------------------------------------------------
-- Function privileges. Supabase grants EXECUTE to anon/authenticated by
-- default, so every function is locked down explicitly.
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

-- Server-only (secret key): submissions, status lookups, rate limiting,
-- notification data, bootstrap.
grant execute on function public.submit_membership_application(jsonb, uuid) to service_role;
grant execute on function public.check_application_status(text, text) to service_role;
grant execute on function public.application_contact(uuid) to service_role;
grant execute on function public.check_rate_limit(text, text, int, int) to service_role;
grant execute on function public.bootstrap_super_admin(text, text) to service_role;

-- Public read helpers.
grant execute on function public.public_stats() to anon, authenticated, service_role;
grant execute on function public.category_photo_counts() to anon, authenticated, service_role;

-- Used inside RLS policies (must be callable by the querying role).
grant execute on function public.has_permission(text) to anon, authenticated, service_role;
grant execute on function public.is_staff() to anon, authenticated, service_role;
grant execute on function public.is_super_admin() to anon, authenticated, service_role;
grant execute on function public.my_permissions() to authenticated;

-- Staff workflow (permission enforced inside each function).
grant execute on function public.start_application_review(uuid) to authenticated;
grant execute on function public.approve_application(uuid, smallint, text, boolean) to authenticated;
grant execute on function public.reject_application(uuid, text) to authenticated;
grant execute on function public.reopen_application(uuid, text) to authenticated;

-- Future functions must be granted explicitly too.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- =====================================================================
-- Storage
--   gallery : activities/<category-slug>/<uuid>.webp (+ thumbs/<uuid>.webp)
--   members : photos/<uuid>.webp
-- Both buckets are public-read (files are served by CDN URL; names are
-- random UUIDs). Writes are restricted by permission.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('gallery', 'gallery', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('members', 'members', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy gallery_objects_staff_read on storage.objects
  for select to authenticated
  using (bucket_id = 'gallery' and (select public.has_permission('gallery.manage')));
create policy gallery_objects_staff_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'gallery'
    and (storage.foldername(name))[1] = 'activities'
    and (select public.has_permission('gallery.manage'))
  );
create policy gallery_objects_staff_update on storage.objects
  for update to authenticated
  using (bucket_id = 'gallery' and (select public.has_permission('gallery.manage')))
  with check (
    bucket_id = 'gallery'
    and (storage.foldername(name))[1] = 'activities'
    and (select public.has_permission('gallery.manage'))
  );
create policy gallery_objects_staff_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'gallery' and (select public.has_permission('gallery.delete')));

create policy members_objects_staff_read on storage.objects
  for select to authenticated
  using (bucket_id = 'members' and (select public.has_permission('members.manage')));
create policy members_objects_staff_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'members'
    and (storage.foldername(name))[1] = 'photos'
    and (select public.has_permission('members.manage'))
  );
create policy members_objects_staff_update on storage.objects
  for update to authenticated
  using (bucket_id = 'members' and (select public.has_permission('members.manage')))
  with check (bucket_id = 'members' and (select public.has_permission('members.manage')));
create policy members_objects_staff_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'members' and (select public.has_permission('members.manage')));
