-- =====================================================================
-- Gallery upload hardening (follows 20261027100000_gallery_admin.sql).
--
-- 1. Staff sessions can no longer overwrite (upsert) or move objects in
--    the "gallery" bucket. Overwriting or moving a registered photo is a
--    way to destroy it without gallery.delete. Category moves and folder
--    sync are done by the server with the service key, after an explicit
--    permission check (see src/app/admin/(panel)/gallery/actions.ts).
--
-- 2. Upload reservations: the server hands out the file names a browser
--    upload may use (activities/<slug>/<uuid>.<webp|jpg> + thumbs/). Staff
--    sessions can only create objects at reserved names, and only the
--    caller's own, never-registered reservations can be registered or
--    cleaned up after a failed upload. Folder sync skips reserved names so
--    an upload in progress is never taken over.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. No UPDATE (upsert / move) of gallery objects with a staff session.
-- ---------------------------------------------------------------------
drop policy if exists gallery_objects_staff_update on storage.objects;

-- ---------------------------------------------------------------------
-- 2. Reservations (reached only through the functions below).
-- ---------------------------------------------------------------------
create table private.gallery_upload_reservations (
  file_id     uuid primary key,
  category_id uuid not null references public.activity_categories(id) on delete cascade,
  -- Category slugs are immutable (CATEGORY_SLUG_IMMUTABLE), so the folder is stable.
  slug        text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  staff_id    uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index gallery_upload_reservations_staff_idx
  on private.gallery_upload_reservations (staff_id, created_at);
alter table private.gallery_upload_reservations enable row level security;
revoke all on private.gallery_upload_reservations from public, anon, authenticated;

-- A reservation is valid for one day. Afterwards its (unregistered) files
-- are treated like any other unregistered file: folder sync registers them.
create or replace function private.gallery_reservation_cutoff()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select now() - interval '1 day';
$$;

-- Reserve 1..30 new file names in a category folder for the caller.
create or replace function public.gallery_reserve_uploads(p_category_id uuid, p_count integer)
returns table (file_id uuid, slug text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid  uuid := (select auth.uid());
  v_slug text;
  v_open integer;
begin
  perform private.require_permission('gallery.manage');
  if p_count is null or p_count < 1 or p_count > 30 then
    raise exception 'INVALID_COUNT' using errcode = '22023';
  end if;

  select c.slug into v_slug from public.activity_categories c where c.id = p_category_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Housekeeping: reservations older than two days are no longer needed.
  delete from private.gallery_upload_reservations r
   where r.created_at < now() - interval '2 days';

  select count(*) into v_open
    from private.gallery_upload_reservations r
   where r.staff_id = v_uid and r.created_at > private.gallery_reservation_cutoff();
  if v_open + p_count > 300 then
    raise exception 'TOO_MANY_PENDING_UPLOADS' using errcode = '54000';
  end if;

  return query
    insert into private.gallery_upload_reservations as r (file_id, category_id, slug, staff_id)
    select gen_random_uuid(), p_category_id, v_slug, v_uid
      from generate_series(1, p_count)
    returning r.file_id, r.slug;
end;
$$;

-- Storage INSERT policy helper: is this object name one of the caller's
-- valid reservations (full image or thumbnail, .webp or .jpg)?
create or replace function public.gallery_upload_is_reserved(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  m text[];
begin
  m := regexp_match(
    p_name,
    '^activities/([a-z0-9]+(?:-[a-z0-9]+)*)/(?:thumbs/)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(?:webp|jpg)$'
  );
  if m is null then
    return false;
  end if;
  return exists (
    select 1 from private.gallery_upload_reservations r
     where r.file_id = m[2]::uuid
       and r.slug = m[1]
       and r.staff_id = (select auth.uid())
       and r.created_at > private.gallery_reservation_cutoff()
  );
end;
$$;

-- Registration consumes the caller's reservations (one transaction each;
-- a reservation can be claimed or released only once).
create or replace function public.gallery_claim_uploads(p_category_id uuid, p_file_ids uuid[])
returns setof uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform private.require_permission('gallery.manage');
  if coalesce(cardinality(p_file_ids), 0) > 30 then
    raise exception 'TOO_MANY_PATHS' using errcode = '22023';
  end if;
  return query
    delete from private.gallery_upload_reservations r
     where r.staff_id = (select auth.uid())
       and r.category_id = p_category_id
       and r.file_id = any (p_file_ids)
       and r.created_at > private.gallery_reservation_cutoff()
    returning r.file_id;
end;
$$;

-- After a failed upload: releases the caller's own reservations that were
-- never registered and returns them, so the server can remove exactly
-- those files (activities/<slug>/<file_id>.* and thumbs/<file_id>.*).
create or replace function public.gallery_release_uploads(p_file_ids uuid[])
returns table (file_id uuid, slug text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform private.require_permission('gallery.manage');
  if coalesce(cardinality(p_file_ids), 0) > 60 then
    raise exception 'TOO_MANY_PATHS' using errcode = '22023';
  end if;
  return query
    delete from private.gallery_upload_reservations r
     where r.staff_id = (select auth.uid())
       and r.file_id = any (p_file_ids)
       and r.created_at > private.gallery_reservation_cutoff()
       and not exists (
         select 1 from public.gallery_images g
          where g.storage_path like '%/' || r.file_id::text || '.%'
             or g.thumb_path like '%/' || r.file_id::text || '.%'
       )
    returning r.file_id, r.slug;
end;
$$;

-- File ids of uploads that are still in progress (folder sync skips them).
create or replace function public.gallery_reserved_file_ids()
returns setof uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_permission('gallery.manage');
  return query
    select r.file_id from private.gallery_upload_reservations r
     where r.created_at > private.gallery_reservation_cutoff();
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Staff sessions may create gallery objects only at reserved names.
-- ---------------------------------------------------------------------
drop policy if exists gallery_objects_staff_insert on storage.objects;
create policy gallery_objects_staff_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'gallery'
    and (select public.has_permission('gallery.manage'))
    and public.gallery_upload_is_reserved(name)
  );

-- ---------------------------------------------------------------------
-- Privileges (functions are not executable by default; see migration 2).
-- ---------------------------------------------------------------------
revoke execute on function private.gallery_reservation_cutoff() from public, anon, authenticated;
revoke execute on function public.gallery_reserve_uploads(uuid, integer) from public, anon;
revoke execute on function public.gallery_upload_is_reserved(text) from public, anon;
revoke execute on function public.gallery_claim_uploads(uuid, uuid[]) from public, anon;
revoke execute on function public.gallery_release_uploads(uuid[]) from public, anon;
revoke execute on function public.gallery_reserved_file_ids() from public, anon;

grant execute on function public.gallery_reserve_uploads(uuid, integer) to authenticated, service_role;
grant execute on function public.gallery_upload_is_reserved(text) to authenticated, service_role;
grant execute on function public.gallery_claim_uploads(uuid, uuid[]) to authenticated, service_role;
grant execute on function public.gallery_release_uploads(uuid[]) to authenticated, service_role;
grant execute on function public.gallery_reserved_file_ids() to authenticated, service_role;
