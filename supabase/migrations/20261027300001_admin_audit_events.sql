-- =====================================================================
-- Admin panel core, part 2: trustworthy account events and readable
-- website-content audit entries.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Account events (password reset by a user manager, own password change)
--
-- The first version, log_account_event(text, uuid), was callable by any
-- signed-in user through the REST API. The database cannot see whether a
-- password was actually reset or changed (that happens in the Auth service),
-- so a user manager could write fake "password reset" entries — even for a
-- super admin whose password only another super admin may reset — and any
-- staff member could flood the log with "password change" entries.
--
-- The event is now written only by the server, right after its own
-- permission checks AND the successful Auth call (execute is granted to
-- service_role only). The rules are still checked here for the given actor,
-- as a second line of defence. Only ids are recorded — no names, no
-- passwords (the audit page shows the current staff name itself).
-- ---------------------------------------------------------------------
drop function if exists public.log_account_event(text, uuid);

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

  if p_action = 'password_change' then
    -- Only one's own password.
    if p_target is distinct from p_actor then
      raise exception 'PERMISSION_DENIED' using errcode = '42501';
    end if;
  elsif p_action = 'password_reset' then
    -- Someone else's password, by a user manager; a super admin's password
    -- only by another super admin (same rule as the server action).
    if p_target = p_actor or not v_actor_manage or (v_target_super and not v_actor_super) then
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

-- Entries written by the first version carried the target's name; names are
-- personal data and are no longer copied into the log (see audit_row_change).
update public.audit_logs
   set details = jsonb_set(details, '{values}', '{}'::jsonb)
 where action in ('password_reset', 'password_change')
   and entity_type = 'staff_profiles'
   and details -> 'values' ? 'full_name';

-- ---------------------------------------------------------------------
-- 2. Website content (site_settings) audit entries
--
-- The generic row audit records only that the jsonb column "value" changed
-- (its content is never copied), plus the bookkeeping column updated_by. So
-- an auditor could not tell whether the slogan, the phone number or the
-- declaration was edited, and a save without any change produced an entry
-- that said nothing. This table gets its own audit trigger: it records WHICH
-- fields inside "value" changed (names only, never the texts) and writes no
-- entry when only the bookkeeping columns changed.
-- ---------------------------------------------------------------------
create or replace function private.audit_site_settings_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor   uuid := (select auth.uid());
  v_name    text;
  v_old     jsonb := case when tg_op in ('UPDATE', 'DELETE') then old.value end;
  v_new     jsonb := case when tg_op in ('INSERT', 'UPDATE') then new.value end;
  v_key     text := case when tg_op = 'DELETE' then old.key else new.key end;
  v_changed text[] := '{}';
  v_fields  text[] := '{}';
  o         jsonb;
  n         jsonb;
begin
  if tg_op = 'UPDATE'
     and old.key is not distinct from new.key
     and old.value is not distinct from new.value then
    -- Only updated_at / updated_by moved: nothing for the audit trail.
    return new;
  end if;

  if tg_op = 'INSERT' then
    v_changed := array['key', 'value'];
  elsif tg_op = 'DELETE' then
    v_changed := array['key', 'value'];
  else
    if old.key is distinct from new.key then v_changed := v_changed || 'key'::text; end if;
    if old.value is distinct from new.value then v_changed := v_changed || 'value'::text; end if;
  end if;

  -- Names of the changed fields inside the section (objects only).
  o := case when jsonb_typeof(v_old) = 'object' then v_old else '{}'::jsonb end;
  n := case when jsonb_typeof(v_new) = 'object' then v_new else '{}'::jsonb end;
  select coalesce(array_agg(k order by k), '{}')
    into v_fields
    from (select jsonb_object_keys(o || n) as k) s
   where (o -> s.k) is distinct from (n -> s.k);

  if v_actor is not null then
    select full_name into v_name from public.staff_profiles where id = v_actor;
  end if;

  insert into public.audit_logs (actor_id, actor_name, action, entity_type, entity_id, details)
  values (
    v_actor,
    v_name,
    lower(tg_op),
    'site_settings',
    v_key,
    jsonb_build_object(
      'changed', to_jsonb(v_changed),
      'values', jsonb_build_object('key', v_key),
      'fields', to_jsonb(v_fields)
    )
  );
  return coalesce(new, old);
end;
$$;

-- Trigger functions run without an EXECUTE check; nobody calls this directly.
revoke execute on function private.audit_site_settings_change() from public, anon, authenticated;

drop trigger if exists site_settings_audit on public.site_settings;
create trigger site_settings_audit
  after insert or update or delete on public.site_settings
  for each row execute function private.audit_site_settings_change();
