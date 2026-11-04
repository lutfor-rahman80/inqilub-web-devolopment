-- =====================================================================
-- Gallery & activity-category helpers used by the admin gallery module.
--   * per-category counts and real bucket usage for the admin panel
--   * object metadata lookups (verify browser uploads before registering)
--   * one-step reordering inside a category
--   * deleting EMPTY categories (images block it via the FK)
--   * a category's cover image must belong to that category
-- =====================================================================

-- ---------------------------------------------------------------------
-- Per-category counts for the admin panel. SECURITY INVOKER, so the
-- caller's Row-Level Security decides which rows are counted.
-- ---------------------------------------------------------------------
create or replace function public.gallery_admin_stats()
returns table (category_id uuid, total bigint, published bigint, featured bigint, size_bytes bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select g.category_id,
         count(*)::bigint,
         count(*) filter (where g.is_published)::bigint,
         count(*) filter (where g.is_featured)::bigint,
         coalesce(sum(g.size_bytes), 0)::bigint
  from public.gallery_images g
  group by g.category_id;
$$;

-- ---------------------------------------------------------------------
-- Real usage of the "gallery" bucket (full images, thumbnails and files
-- not registered yet), to help stay inside the free-tier storage quota.
-- ---------------------------------------------------------------------
create or replace function public.gallery_storage_usage()
returns table (object_count bigint, total_bytes bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_permission('gallery.manage');
  return query
    select count(*)::bigint,
           coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint
    from storage.objects o
    where o.bucket_id = 'gallery'
      and o.name not like '%.emptyFolderPlaceholder';
end;
$$;

-- ---------------------------------------------------------------------
-- Metadata for specific objects of the "gallery" bucket. Used after a
-- browser upload to verify that the files really exist (and how big they
-- are) before they are registered, and to find which of a failed upload's
-- files were created by the caller and are still unregistered (only those
-- may be cleaned up by someone without gallery.delete).
-- ---------------------------------------------------------------------
create or replace function public.gallery_object_info(p_paths text[])
returns table (
  name          text,
  size_bytes    bigint,
  mime_type     text,
  created_at    timestamptz,
  is_mine       boolean,
  is_registered boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform private.require_permission('gallery.manage');
  if coalesce(cardinality(p_paths), 0) > 200 then
    raise exception 'TOO_MANY_PATHS' using errcode = '22023';
  end if;
  return query
    select o.name,
           (o.metadata ->> 'size')::bigint,
           o.metadata ->> 'mimetype',
           o.created_at,
           (o.owner_id is not null and o.owner_id = (select auth.uid())::text),
           exists (
             select 1 from public.gallery_images g
             where g.storage_path = o.name or g.thumb_path = o.name
           )
    from storage.objects o
    where o.bucket_id = 'gallery'
      and o.name = any (p_paths);
end;
$$;

-- ---------------------------------------------------------------------
-- Move an image one step up/down in its category's display order
-- (sort_order asc, newest first). The category is renumbered 10, 20, …
-- so ties never block a move. SECURITY INVOKER: RLS applies.
-- ---------------------------------------------------------------------
create or replace function public.gallery_move_image(p_image_id uuid, p_up boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_cat  uuid;
  v_ids  uuid[];
  v_pos  int;
  v_swap int;
begin
  if not public.has_permission('gallery.manage') then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  select g.category_id into v_cat from public.gallery_images g where g.id = p_image_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Serialise concurrent reorders of the same category.
  perform 1 from public.gallery_images g where g.category_id = v_cat for update;

  select array_agg(g.id order by g.sort_order, g.created_at desc, g.id) into v_ids
  from public.gallery_images g
  where g.category_id = v_cat;

  v_pos := array_position(v_ids, p_image_id);
  v_swap := case when p_up then v_pos - 1 else v_pos + 1 end;
  if v_pos is null or v_swap < 1 or v_swap > cardinality(v_ids) then
    return;
  end if;

  v_ids[v_pos] := v_ids[v_swap];
  v_ids[v_swap] := p_image_id;

  update public.gallery_images g
     set sort_order = (t.ord * 10)::int
    from unnest(v_ids) with ordinality as t(id, ord)
   where g.id = t.id
     and g.sort_order is distinct from (t.ord * 10)::int;
end;
$$;

-- ---------------------------------------------------------------------
-- Categories without images may be deleted by content managers. A category
-- that still has images cannot be deleted (gallery_images FK is RESTRICT);
-- the admin UI offers "deactivate" instead.
-- ---------------------------------------------------------------------
create policy activity_categories_manage_delete on public.activity_categories
  for delete to authenticated using ((select public.has_permission('content.manage')));

-- ---------------------------------------------------------------------
-- A category's cover image must be one of its own images.
-- ---------------------------------------------------------------------
create or replace function private.guard_category_cover()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.cover_image_id is not null and not exists (
    select 1 from public.gallery_images g
    where g.id = new.cover_image_id and g.category_id = new.id
  ) then
    raise exception 'CATEGORY_COVER_MISMATCH' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger activity_categories_cover_guard
  before insert or update of cover_image_id on public.activity_categories
  for each row execute function private.guard_category_cover();

-- Moving an image to another category removes it as the old category's cover.
create or replace function private.clear_moved_cover()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.category_id is distinct from old.category_id then
    update public.activity_categories
       set cover_image_id = null
     where id = old.category_id and cover_image_id = new.id;
  end if;
  return new;
end;
$$;
create trigger gallery_images_clear_moved_cover
  after update of category_id on public.gallery_images
  for each row execute function private.clear_moved_cover();

-- ---------------------------------------------------------------------
-- Privileges (functions are not executable by default; see migration 2).
-- ---------------------------------------------------------------------
revoke execute on function public.gallery_admin_stats() from public, anon;
revoke execute on function public.gallery_storage_usage() from public, anon;
revoke execute on function public.gallery_object_info(text[]) from public, anon;
revoke execute on function public.gallery_move_image(uuid, boolean) from public, anon;
revoke execute on function private.guard_category_cover() from public, anon, authenticated;
revoke execute on function private.clear_moved_cover() from public, anon, authenticated;

grant execute on function public.gallery_admin_stats() to authenticated;
grant execute on function public.gallery_storage_usage() to authenticated;
grant execute on function public.gallery_object_info(text[]) to authenticated;
grant execute on function public.gallery_move_image(uuid, boolean) to authenticated;
