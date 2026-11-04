-- =====================================================================
-- Two-step login (TOTP, Supabase Auth MFA) for the admin panel —
-- database side.
--
-- The admin pages and server actions already refuse sessions that have not
-- completed the second step (src/lib/auth.ts). But the Supabase API is
-- reachable directly with the public (publishable) key, so a stolen password
-- alone must not be enough to use staff permissions there either:
--
--   * a staff member who has a verified authenticator factor holds their
--     permissions only in a two-step session (JWT claim aal = 'aal2');
--   * a super admin holds permissions only in a two-step session, whether
--     or not a factor is enrolled yet (a super admin without a factor is sent
--     to the enrolment page, which needs no database permission).
--
-- Every permission check (RLS policies, workflow functions, storage
-- policies) goes through public.has_permission(), so adding the rule there
-- covers all of them. Sessions issued by Supabase Auth always carry the
-- "aal" claim; a request without the claim is not a user session (service
-- role, or SQL run by the database owner, e.g. the pgTAP tests) and is
-- treated as satisfied.
-- =====================================================================

create or replace function private.mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.jwt()) ->> 'aal' is null then true
    when (select auth.jwt()) ->> 'aal' = 'aal2' then true
    else not exists (
           select 1 from auth.mfa_factors f
           where f.user_id = (select auth.uid()) and f.status = 'verified'
         )
         and not exists (
           select 1
           from public.staff_profiles sp
           join public.roles r on r.id = sp.role_id
           where sp.id = (select auth.uid()) and r.key = 'super_admin'
         )
  end;
$$;

revoke execute on function private.mfa_satisfied() from public, anon, authenticated;

-- Same as before (core schema) plus the two-step rule above.
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
  )
  and private.mfa_satisfied();
$$;

grant execute on function public.has_permission(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Audit entries for two-step login events, written by the server only
-- (service role) after the Auth call succeeded — same function as in
-- 20261027300001_admin_audit_events.sql plus three actions:
--   mfa_enrol / mfa_remove  one's own authenticator app added / removed
--   mfa_reset               a super admin removed another staff member's
--                           authenticator apps (lost phone)
-- ---------------------------------------------------------------------
create or replace function public.log_account_event(p_actor uuid, p_action text, p_target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_name   text;
  v_actor_super  boolean;
  v_actor_manage boolean;
  v_target_super boolean;
begin
  -- The actor must be an active staff member.
  select sp.full_name,
         r.key = 'super_admin',
         r.key = 'super_admin' or exists (
           select 1 from public.role_permissions rp
           where rp.role_id = sp.role_id and rp.permission = 'users.manage'
         )
    into v_actor_name, v_actor_super, v_actor_manage
    from public.staff_profiles sp
    join public.roles r on r.id = sp.role_id
   where sp.id = p_actor and sp.is_active;
  if not found then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  select r.key = 'super_admin'
    into v_target_super
    from public.staff_profiles sp
    join public.roles r on r.id = sp.role_id
   where sp.id = p_target;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  if p_action in ('password_change', 'mfa_enrol', 'mfa_remove') then
    -- Only one's own account.
    if p_target is distinct from p_actor then
      raise exception 'PERMISSION_DENIED' using errcode = '42501';
    end if;
  elsif p_action = 'password_reset' then
    -- Someone else's password, by a user manager; a super admin's password
    -- only by another super admin (same rule as the server action).
    if p_target = p_actor or not v_actor_manage or (v_target_super and not v_actor_super) then
      raise exception 'PERMISSION_DENIED' using errcode = '42501';
    end if;
  elsif p_action = 'mfa_reset' then
    -- Someone else's two-step login, by a super admin only.
    if p_target = p_actor or not v_actor_super then
      raise exception 'PERMISSION_DENIED' using errcode = '42501';
    end if;
  else
    raise exception 'INVALID_ACTION' using errcode = '22023';
  end if;

  insert into public.audit_logs (actor_id, actor_name, action, entity_type, entity_id, details)
  values (
    p_actor, v_actor_name, p_action, 'staff_profiles', p_target::text,
    jsonb_build_object('changed', '[]'::jsonb, 'values', '{}'::jsonb)
  );
end;
$$;

revoke execute on function public.log_account_event(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.log_account_event(uuid, text, uuid) to service_role;
