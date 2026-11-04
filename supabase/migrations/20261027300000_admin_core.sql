-- =====================================================================
-- Admin panel core: helpers for the roles & permissions page.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Replace a role's permission set in ONE transaction (the roles page saves
-- a whole column of checkboxes at once, so a half-applied change is never
-- left behind). SECURITY INVOKER: the caller's Row-Level Security policies
-- (users.manage) and the guard trigger that locks super_admin both apply.
-- ---------------------------------------------------------------------
create or replace function public.set_role_permissions(p_role_id uuid, p_permissions text[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_perms text[] := coalesce(p_permissions, '{}');
begin
  if not public.has_permission('users.manage') then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  if not exists (select 1 from public.roles r where r.id = p_role_id) then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.roles r where r.id = p_role_id and r.key = 'super_admin') then
    raise exception 'SYSTEM_ROLE_LOCKED' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from unnest(v_perms) as x(p)
    where not exists (select 1 from public.permissions pm where pm.key = x.p)
  ) then
    raise exception 'UNKNOWN_PERMISSION' using errcode = '22023';
  end if;

  -- Serialise concurrent saves of the same role.
  perform 1 from public.roles r where r.id = p_role_id for update;

  delete from public.role_permissions rp
   where rp.role_id = p_role_id
     and not (rp.permission = any (v_perms));

  insert into public.role_permissions (role_id, permission)
  select p_role_id, x.p
  from (select distinct unnest(v_perms) as p) as x
  on conflict (role_id, permission) do nothing;
end;
$$;

revoke execute on function public.set_role_permissions(uuid, text[]) from public, anon;
grant execute on function public.set_role_permissions(uuid, text[]) to authenticated;

-- ---------------------------------------------------------------------
-- Account events that change no table row (auth.users is managed by the
-- Auth service) but belong in the audit trail: a staff password reset by a
-- user manager, and a staff member changing their own password. Called by
-- the admin server actions with the signed-in user's session. Only the
-- target's name is recorded — never the password.
-- ---------------------------------------------------------------------
create or replace function public.log_account_event(p_action text, p_target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_actor_name text;
  v_target_name text;
begin
  if v_actor is null then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  if p_action = 'password_change' then
    if p_target is distinct from v_actor or not public.is_staff() then
      raise exception 'PERMISSION_DENIED' using errcode = '42501';
    end if;
  elsif p_action = 'password_reset' then
    perform private.require_permission('users.manage');
  else
    raise exception 'INVALID_ACTION' using errcode = '22023';
  end if;

  select sp.full_name into v_target_name from public.staff_profiles sp where sp.id = p_target;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  select sp.full_name into v_actor_name from public.staff_profiles sp where sp.id = v_actor;

  insert into public.audit_logs (actor_id, actor_name, action, entity_type, entity_id, details)
  values (
    v_actor, v_actor_name, p_action, 'staff_profiles', p_target::text,
    jsonb_build_object('changed', '[]'::jsonb, 'values', jsonb_build_object('full_name', v_target_name))
  );
end;
$$;

revoke execute on function public.log_account_event(text, uuid) from public, anon;
grant execute on function public.log_account_event(text, uuid) to authenticated;
