-- =====================================================================
-- Gallery upload reservations keep their record for the whole reservation
-- day (follows 20261027100001_gallery_upload_reservations.sql).
--
-- Before: registering (claim) or discarding (release) DELETED the
-- reservation before the server inserted the gallery row / removed the
-- files. In that short window folder sync saw a file that was neither
-- reserved nor registered and could take it over (and, for a JPEG upload,
-- convert it and delete the original that was just being registered).
--
-- Now a reservation is only marked claimed/released. Uploads, claims and
-- releases still act on PENDING reservations only (each happens once), and
-- folder sync keeps away from every file name reserved in the last day,
-- whatever its state. Afterwards an unregistered leftover is an ordinary
-- orphan that folder sync registers (unpublished).
-- =====================================================================

alter table private.gallery_upload_reservations
  add column claimed_at  timestamptz,
  add column released_at timestamptz;

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

  -- Uploads still waiting to be registered or discarded.
  select count(*) into v_open
    from private.gallery_upload_reservations r
   where r.staff_id = v_uid
     and r.created_at > private.gallery_reservation_cutoff()
     and r.claimed_at is null
     and r.released_at is null;
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
-- PENDING reservations (full image or thumbnail, .webp or .jpg)?
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
       and r.claimed_at is null
       and r.released_at is null
  );
end;
$$;

-- Registration claims the caller's pending reservations (once each). The
-- record stays, so folder sync keeps away until the row is inserted.
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
    update private.gallery_upload_reservations r
       set claimed_at = now()
     where r.staff_id = (select auth.uid())
       and r.category_id = p_category_id
       and r.file_id = any (p_file_ids)
       and r.created_at > private.gallery_reservation_cutoff()
       and r.claimed_at is null
       and r.released_at is null
    returning r.file_id;
end;
$$;

-- After a failed upload: releases the caller's own pending, never-registered
-- reservations and returns them, so the server can remove exactly those
-- files (activities/<slug>/<file_id>.* and thumbs/<file_id>.*).
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
    update private.gallery_upload_reservations r
       set released_at = now()
     where r.staff_id = (select auth.uid())
       and r.file_id = any (p_file_ids)
       and r.created_at > private.gallery_reservation_cutoff()
       and r.claimed_at is null
       and r.released_at is null
       and not exists (
         select 1 from public.gallery_images g
          where g.storage_path like '%/' || r.file_id::text || '.%'
             or g.thumb_path like '%/' || r.file_id::text || '.%'
       )
    returning r.file_id, r.slug;
end;
$$;

-- File ids folder sync must leave alone: every name reserved in the last
-- day (pending, being registered, or being discarded).
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

-- Privileges: CREATE OR REPLACE keeps the grants of 20261027100001; restated
-- so this file is correct on its own.
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
