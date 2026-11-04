-- Two-step login at the database level (migration 20261028500000_admin_mfa):
-- staff with a verified authenticator factor, and every super admin, hold
-- their permissions only in an aal2 session — and, since
-- 20261028900000_admin_review_fixes, also the staff-only reads (other staff,
-- roles, permission matrix, inactive reference data); before the second step
-- only their own staff row and role. Uses its own throw-away users;
-- everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

create function pg_temp.act_as(p_uid uuid, p_aal text) returns void language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    (case when p_aal is null then json_build_object('sub', p_uid, 'role', 'authenticated')
          else json_build_object('sub', p_uid, 'role', 'authenticated', 'aal', p_aal) end)::text,
    true);
  execute 'set local role authenticated';
end $$;
create function pg_temp.act_as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
end $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Throw-away accounts: an editor and a super admin.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-a000-0000000000e1', 'authenticated', 'authenticated',
   'pgtap-mfa-editor@test.local', '', now(), '{}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-a000-0000000000a1', 'authenticated', 'authenticated',
   'pgtap-mfa-super@test.local', '', now(), '{}', '{}', now(), now(), '', '', '', '');
insert into public.staff_profiles (id, full_name, role_id) values
  ('aaaaaaaa-0000-4000-a000-0000000000e1', 'পিজিট্যাপ সম্পাদক', (select id from public.roles where key = 'content_editor')),
  ('aaaaaaaa-0000-4000-a000-0000000000a1', 'পিজিট্যাপ সুপার', (select id from public.roles where key = 'super_admin'));

\set editor '''aaaaaaaa-0000-4000-a000-0000000000e1'''
\set super  '''aaaaaaaa-0000-4000-a000-0000000000a1'''

-- An inactive designation and category: visible to the public only while
-- active, to staff always — after the second step where it is required.
insert into public.designations (name_bn, rank_order, is_active) values ('পিজিট্যাপ নিষ্ক্রিয় পদ', 999, false);
insert into public.activity_categories (slug, name_bn, is_active) values ('pgtap-mfa-inactive', 'পিজিট্যাপ নিষ্ক্রিয় বিভাগ', false);

-- What a session can read of the staff-only tables (staff list, roles,
-- permission matrix, inactive reference data), as one comparable row.
create function pg_temp.staff_reads() returns table (
  is_staff boolean, staff_rows int, others_rows int, roles_rows int, own_role_rows int,
  permission_rows int, role_permission_rows int, inactive_designation int, inactive_category int
) language sql as $$
  select public.is_staff(),
         (select count(*)::int from public.staff_profiles),
         (select count(*)::int from public.staff_profiles where id <> auth.uid()),
         (select count(*)::int from public.roles),
         (select count(*)::int from public.roles r
           where r.id = (select sp.role_id from public.staff_profiles sp where sp.id = auth.uid())),
         (select count(*)::int from public.permissions),
         (select count(*)::int from public.role_permissions),
         (select count(*)::int from public.designations where name_bn = 'পিজিট্যাপ নিষ্ক্রিয় পদ'),
         (select count(*)::int from public.activity_categories where slug = 'pgtap-mfa-inactive');
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- ---------------------------------------------------------- no factor yet
select pg_temp.act_as(:editor, 'aal1');
select ok(public.has_permission('content.manage'), 'staff without a factor: permissions in a one-step session');
select is(cardinality(public.my_permissions()) > 0, true, 'staff without a factor: my_permissions is not empty');
select ok((select is_staff and others_rows > 0 and roles_rows > 1 and permission_rows > 0 and role_permission_rows > 0
                  and inactive_designation = 1 and inactive_category = 1 from pg_temp.staff_reads()),
  'staff without a factor: staff list, roles, permission matrix and inactive reference data in a one-step session');
reset role;

select pg_temp.act_as(:super, 'aal1');
select ok(not public.has_permission('users.manage'), 'super admin without a factor: no permissions in a one-step session');
select is(public.my_permissions(), '{}'::text[], 'super admin one-step session: my_permissions is empty');
select is_empty($$ update public.site_settings set value = value where key = 'organization' returning key $$,
  'super admin one-step session: Row-Level Security refuses a content write');
select ok(not public.is_staff(), 'super admin one-step session: is_staff() is false');
select ok(not public.is_super_admin(), 'super admin one-step session: is_super_admin() is false');
select is((select row(staff_rows, others_rows, roles_rows, own_role_rows, permission_rows, role_permission_rows,
                      inactive_designation, inactive_category)::text from pg_temp.staff_reads()),
  row(1, 0, 1, 1, 0, 0, 0, 0)::text,
  'super admin one-step session: only their own staff row and own role; no other staff, permissions, role matrix or inactive reference data');
select is((select r.key from public.staff_profiles sp join public.roles r on r.id = sp.role_id where sp.id = auth.uid()), 'super_admin',
  'super admin one-step session: own profile with role key is readable (sign-in / two-step pages)');
reset role;

select pg_temp.act_as(:super, 'aal2');
select ok(public.has_permission('users.manage'), 'super admin: permissions in a two-step session');
select isnt_empty($$ update public.site_settings set value = value where key = 'organization' returning key $$,
  'super admin two-step session: the same content write is allowed');
select ok(public.is_staff() and public.is_super_admin(), 'super admin two-step session: is_staff() and is_super_admin()');
select ok((select others_rows > 0 and roles_rows > 1 and permission_rows > 0 and role_permission_rows > 0
                  and inactive_designation = 1 and inactive_category = 1 from pg_temp.staff_reads()),
  'super admin two-step session: staff list, roles, permission matrix and inactive reference data');
reset role;

-- ------------------------------------------------- an unverified factor
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret)
values (gen_random_uuid(), :editor, 'pgtap-unverified', 'totp', 'unverified', now(), now(), 'JBSWY3DPEHPK3PXP');
select pg_temp.act_as(:editor, 'aal1');
select ok(public.has_permission('content.manage'), 'an unverified (abandoned) enrolment does not require the second step');
reset role;

-- --------------------------------------------------- a verified factor
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret)
values (gen_random_uuid(), :editor, 'pgtap-verified', 'totp', 'verified', now(), now(), 'JBSWY3DPEHPK3PXP');
select pg_temp.act_as(:editor, 'aal1');
select ok(not public.has_permission('content.manage'), 'staff with a verified factor: no permissions in a one-step session');
select throws_ok($$ select private.mfa_satisfied() $$, '42501', null, 'the helper itself is not callable by users');
select is((select row(is_staff, staff_rows, others_rows, roles_rows, own_role_rows, permission_rows, role_permission_rows,
                      inactive_designation, inactive_category)::text from pg_temp.staff_reads()),
  row(false, 1, 0, 1, 1, 0, 0, 0, 0)::text,
  'staff with a verified factor, one-step session: only their own staff row and own role');
reset role;

select pg_temp.act_as(:editor, 'aal2');
select ok(public.has_permission('content.manage'), 'staff with a verified factor: permissions in a two-step session');
select ok(not public.has_permission('users.manage'), 'the two-step session does not add permissions the role lacks');
select ok((select is_staff and others_rows > 0 and roles_rows > 1 and permission_rows > 0 and role_permission_rows > 0
                  and inactive_designation = 1 and inactive_category = 1 from pg_temp.staff_reads()),
  'staff with a verified factor, two-step session: staff-only reads are back');
reset role;

-- Anonymous visitors: no staff data, only active reference data.
select pg_temp.act_as_anon();
select is((select row(is_staff, staff_rows, roles_rows, permission_rows, role_permission_rows, inactive_designation, inactive_category)::text
           from pg_temp.staff_reads()),
  row(false, 0, 0, 0, 0, 0, 0)::text, 'anonymous visitors read no staff data and no inactive reference data');
reset role;

-- A request without the aal claim is not an Auth session (owner/service SQL).
select pg_temp.act_as(:editor, null);
select ok(public.has_permission('content.manage'), 'requests without an aal claim (not Auth sessions) are unaffected');
reset role;

-- ------------------------------------------- audit entries (server only)
select lives_ok($$ select public.log_account_event('aaaaaaaa-0000-4000-a000-0000000000e1', 'mfa_enrol', 'aaaaaaaa-0000-4000-a000-0000000000e1') $$, 'own enrolment can be logged');
select throws_ok($$ select public.log_account_event('aaaaaaaa-0000-4000-a000-0000000000e1', 'mfa_remove', 'aaaaaaaa-0000-4000-a000-0000000000a1') $$, '42501', null,
  'mfa_remove only for one''s own account');
select throws_ok($$ select public.log_account_event('aaaaaaaa-0000-4000-a000-0000000000e1', 'mfa_reset', 'aaaaaaaa-0000-4000-a000-0000000000a1') $$, '42501', null,
  'only a super admin can reset someone''s two-step login');
select throws_ok($$ select public.log_account_event('aaaaaaaa-0000-4000-a000-0000000000a1', 'mfa_reset', 'aaaaaaaa-0000-4000-a000-0000000000a1') $$, '42501', null,
  'a super admin cannot "reset" their own two-step login');
select lives_ok($$ select public.log_account_event('aaaaaaaa-0000-4000-a000-0000000000a1', 'mfa_reset', 'aaaaaaaa-0000-4000-a000-0000000000e1') $$, 'a super admin reset is logged');
select is((select count(*)::int from public.audit_logs where entity_id = 'aaaaaaaa-0000-4000-a000-0000000000e1' and action in ('mfa_enrol', 'mfa_reset')), 2,
  'both events are in the audit log');
select pg_temp.act_as(:super, 'aal2');
select throws_ok($$ select public.log_account_event(auth.uid(), 'mfa_enrol', auth.uid()) $$, '42501', null,
  'users cannot write account events themselves');
reset role;

select * from finish();
rollback;
