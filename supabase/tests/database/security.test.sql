-- Database security & workflow tests (pgTAP). Everything runs inside one
-- transaction that is rolled back, so it is safe on a shared dev database.
-- Run: npm run test:db   (or scripts/test-db.sh)
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

-- ---------------------------------------------------------------- helpers
create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;
create function pg_temp.act_as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
end $$;
create function pg_temp.act_as_service() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  execute 'set local role service_role';
end $$;
create function pg_temp.app_json(p_name text, p_nid text, p_consent boolean) returns jsonb language sql as $$
  select jsonb_build_object(
    'full_name', p_name, 'father_name', 'পিতা টেস্ট', 'mother_name', 'মাতা টেস্ট',
    'date_of_birth', '2001-01-15', 'nationality', 'বাংলাদেশী', 'religion', 'ইসলাম',
    'occupation', 'ছাত্র', 'permanent_address', 'কাশীপুর, ফতুল্লা', 'present_address', 'কাশীপুর, ফতুল্লা',
    'id_type', 'nid', 'id_number', p_nid, 'mobile', '01811111111', 'email', 'pgtap@example.com',
    'blood_group', 'O+', 'declaration_accepted', true, 'directory_consent', p_consent)
$$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

-- Test users (seed.sql): 1 super, 2 admin, 3 secretary, 4 content_editor, 5 committee_viewer
\set super     '''00000000-0000-4000-a000-000000000001'''
\set admin     '''00000000-0000-4000-a000-000000000002'''
\set secretary '''00000000-0000-4000-a000-000000000003'''
\set editor    '''00000000-0000-4000-a000-000000000004'''
\set viewer    '''00000000-0000-4000-a000-000000000005'''

-- ------------------------------------------------------- public submission
select pg_temp.act_as_anon();
select throws_ok(
  $$ select * from public.submit_membership_application(pg_temp.app_json('অ্যানন', '9990000000001', true), gen_random_uuid()) $$,
  '42501', null, 'anon cannot call submit_membership_application directly');
select throws_ok($$ select * from public.check_application_status('IJS-A-2026-0001', '01811111111') $$,
  '42501', null, 'anon cannot call check_application_status directly');
select throws_ok($$ select public.check_rate_limit('x', 'y', 1, 60) $$, '42501', null, 'anon cannot call check_rate_limit');
select throws_ok($$ select public.bootstrap_super_admin('a@b.c', 'x') $$, '42501', null, 'anon cannot bootstrap a super admin');
reset role;

select pg_temp.act_as_service();
create temp table t_apps as
  select 'consent'::text as k, * from public.submit_membership_application(pg_temp.app_json('পিজিট্যাপ সম্মত', '9990000000001', true), 'aaaaaaaa-0000-4000-8000-000000000001')
  union all
  select 'noconsent', * from public.submit_membership_application(pg_temp.app_json('পিজিট্যাপ অসম্মত', '9990000000002', false), 'aaaaaaaa-0000-4000-8000-000000000002')
  union all
  select 'reject', * from public.submit_membership_application(pg_temp.app_json('পিজিট্যাপ প্রত্যাখ্যান', '9990000000003', true), 'aaaaaaaa-0000-4000-8000-000000000003');
grant select on t_apps to anon, authenticated, service_role;
select ok((select bool_and(application_no ~ '^IJS-A-[0-9]{4}-[0-9]{4,}$') from t_apps), 'application numbers use IJS-A-YYYY-NNNN');
select ok((select bool_and(not already_submitted) from t_apps), 'new submissions are not flagged as duplicates');
select is(
  (select application_no from public.submit_membership_application(pg_temp.app_json('পিজিট্যাপ সম্মত', '9990000000001', true), 'aaaaaaaa-0000-4000-8000-000000000001')),
  (select application_no from t_apps where k = 'consent'),
  'resubmitting with the same token returns the same tracking number (idempotent)');
select throws_like(
  $$ select * from public.submit_membership_application(pg_temp.app_json('ডুপ্লিকেট', '9990000000001', true), gen_random_uuid()) $$,
  '%DUPLICATE_ID%', 'a second open application with the same NID is rejected');
select throws_like(
  $$ select * from public.submit_membership_application(pg_temp.app_json('অঙ্গীকার', '9990000000009', true) || '{"declaration_accepted": false}', gen_random_uuid()) $$,
  '%DECLARATION_REQUIRED%', 'declaration acceptance is required');
select throws_like(
  $$ select * from public.submit_membership_application(pg_temp.app_json('ভবিষ্যৎ', '9990000000008', true) || '{"date_of_birth": "2999-01-01"}', gen_random_uuid()) $$,
  '%INVALID_DOB%', 'future date of birth is rejected');
select throws_ok(
  $$ select * from public.submit_membership_application(pg_temp.app_json('মোবাইল', '9990000000007', true) || '{"mobile": "12345"}', gen_random_uuid()) $$,
  '23514', null, 'invalid mobile number violates the check constraint');
select is((select status from public.membership_applications where application_no = (select application_no from t_apps where k = 'consent')),
  'pending', 'new applications start as pending');
select is((select count(*)::int from public.check_application_status((select lower(application_no) from t_apps where k = 'consent'), '01811111111')),
  1, 'status lookup works with tracking number (case-insensitive) + mobile');
select is((select count(*)::int from public.check_application_status((select application_no from t_apps where k = 'consent'), '01800000000')),
  0, 'status lookup with the wrong mobile reveals nothing');
reset role;

-- -------------------------------------------------- anonymous read access
select pg_temp.act_as_anon();
select is_empty($$ select 1 from public.membership_applications $$, 'anon cannot read applications');
select is_empty($$ select 1 from public.members $$, 'anon cannot read the members table');
select is_empty($$ select 1 from public.staff_profiles $$, 'anon cannot read staff profiles');
select is_empty($$ select 1 from public.contact_messages $$, 'anon cannot read contact messages');
select is_empty($$ select 1 from public.audit_logs $$, 'anon cannot read the audit log');
select is_empty($$ select 1 from public.application_status_history $$, 'anon cannot read status history');
select is_empty($$ select 1 from public.notification_log $$, 'anon cannot read notification log');
select is_empty($$ select 1 from public.roles $$, 'anon cannot read roles');
select throws_ok($$ insert into public.contact_messages (name, mobile, subject, message) values ('x', '01811111111', 'yy', 'hello there') $$,
  '42501', null, 'anon cannot insert contact messages directly');
select throws_ok($$ insert into public.announcements (title, body, is_published) values ('হ্যাক', 'x', true) $$,
  '42501', null, 'anon cannot create announcements');
select throws_ok($$ update public.site_settings set value = '{}' where key = 'about' $$, '42501', null, 'anon has no UPDATE privilege on site settings');
select throws_ok($$ truncate public.membership_applications $$, '42501', null, 'anon cannot TRUNCATE (not covered by RLS)');
select is((select count(*)::int from public.activity_categories), 13, 'anon sees the 13 active categories');
reset role;

-- The public directory view exposes only safe columns.
select is(
  (select array_agg(column_name::text order by column_name::text) from information_schema.columns
    where table_schema = 'public' and table_name = 'public_members'),
  array['designation', 'designation_en', 'designation_id', 'designation_rank', 'full_name', 'id', 'joined_on', 'member_no', 'photo_path', 'public_phone', 'sort_order'],
  'public_members exposes only directory-safe columns');

-- ------------------------------------------------------- review workflow
select pg_temp.act_as(:editor);
select is_empty($$ select 1 from public.membership_applications $$, 'content editor cannot read applications');
select throws_like($$ select * from public.approve_application((select application_id from t_apps where k = 'consent')) $$,
  '%PERMISSION_DENIED%', 'content editor cannot approve');
reset role;

select pg_temp.act_as(:viewer);
select isnt_empty($$ select 1 from public.membership_applications $$, 'committee viewer can read applications');
select throws_like($$ select * from public.approve_application((select application_id from t_apps where k = 'consent')) $$,
  '%PERMISSION_DENIED%', 'committee viewer cannot approve');
select throws_like($$ select public.reject_application((select application_id from t_apps where k = 'consent'), 'কারণ আছে') $$,
  '%PERMISSION_DENIED%', 'committee viewer cannot reject');
select throws_ok($$ update public.membership_applications set status = 'approved' $$, '42501', null,
  'staff cannot change application status by direct UPDATE');
reset role;

select pg_temp.act_as(:secretary);
select lives_ok($$ select public.start_application_review((select application_id from t_apps where k = 'consent')) $$, 'secretary can start review');
select throws_like($$ select public.start_application_review((select application_id from t_apps where k = 'consent')) $$,
  '%INVALID_TRANSITION%', 'cannot start review twice');
create temp table t_member as
  select * from public.approve_application((select application_id from t_apps where k = 'consent'),
    (select id from public.designations where name_bn = 'সাংগঠনিক সম্পাদক'), 'অনুমোদিত', true);
select ok((select member_no ~ '^IJS-[0-9]{4}-[0-9]{4,}$' from t_member), 'approval creates a member number IJS-YYYY-NNNN');
select throws_like($$ select * from public.approve_application((select application_id from t_apps where k = 'consent')) $$,
  '%INVALID_TRANSITION%', 'an application cannot be approved twice');
create temp table t_member2 as
  select * from public.approve_application((select application_id from t_apps where k = 'noconsent'), null, null, true);
select throws_like($$ select public.reject_application((select application_id from t_apps where k = 'reject'), '') $$,
  '%NOTE_REQUIRED%', 'rejection requires a reason');
select lives_ok($$ select public.reject_application((select application_id from t_apps where k = 'reject'), 'তথ্য অসম্পূর্ণ') $$,
  'secretary can reject with a reason');
select lives_ok($$ select public.reopen_application((select application_id from t_apps where k = 'reject'), 'পুনর্বিবেচনা') $$,
  'secretary can reopen a rejected application');
reset role;

grant select on t_member, t_member2 to anon, authenticated;
select is((select count(*)::int from public.members where application_id = (select application_id from t_apps where k = 'consent')),
  1, 'exactly one member record per approved application');
select is((select designation from public.public_members where id = (select member_id from t_member)),
  'সাংগঠনিক সম্পাদক', 'approved consenting member appears in the directory with the chosen designation');
select is((select show_in_directory from public.members where id = (select member_id from t_member2)),
  false, 'a member who did not consent is not shown even if the reviewer asked for it');
select is((select array_agg(to_status order by id) from public.application_status_history
           where application_id = (select application_id from t_apps where k = 'consent')),
  array['pending', 'under_review', 'approved'], 'status history records every transition');
select ok((select changed_by = :secretary::uuid from public.application_status_history
           where application_id = (select application_id from t_apps where k = 'consent') and to_status = 'approved'),
  'status history records who approved');
select is_empty($$ select 1 from public.audit_logs where details::text like '%9990000000001%' or details::text like '%01811111111%' $$,
  'audit log never stores NID or mobile values');
-- Only the membership records hold personal data; content tables (programs,
-- FAQ, announcements…) may legitimately contain words like 'ইসলামিক'.
select is_empty($$ select 1 from public.audit_logs
                   where entity_type in ('membership_applications', 'members')
                     and (details::text like '%পিজিট্যাপ%' or details::text like '%পিতা টেস্ট%' or details::text like '%ইসলাম%') $$,
  'audit log never stores names, religion or other personal values');

-- Privacy constraints hold even for staff with members.manage.
select pg_temp.act_as(:secretary);
select throws_ok($$ update public.members set show_in_directory = true where id = (select member_id from t_member2) $$,
  '23514', null, 'directory visibility requires consent (DB constraint)');
select throws_ok($$ update public.members set public_phone = '01811111111' where id = (select member_id from t_member) $$,
  '23514', null, 'public phone requires phone consent (DB constraint)');
select throws_ok($$ update public.members set member_no = 'IJS-2026-9999' where id = (select member_id from t_member) $$,
  '42501', null, 'member number cannot be rewritten');
reset role;

select pg_temp.act_as_anon();
select is_empty($$ select 1 from public.public_members where id = (select member_id from t_member2) $$,
  'non-consenting member is not in the public directory');
reset role;
select pg_temp.act_as(:secretary);
select lives_ok($$ update public.members set status = 'archived' where id = (select member_id from t_member) $$, 'secretary can archive a member');
reset role;
select pg_temp.act_as_anon();
select is_empty($$ select 1 from public.public_members where id = (select member_id from t_member) $$,
  'archived members disappear from the public directory');
reset role;

-- ----------------------------------------------- roles & privilege escalation
select pg_temp.act_as(:admin);
select is_empty($$ update public.staff_profiles set role_id = (select id from public.roles where key = 'super_admin')
                   where id = auth.uid() returning 1 $$, 'admin cannot change their own role (no users.manage)');
select throws_ok($$ insert into public.role_permissions (role_id, permission)
                    values ((select id from public.roles where key = 'admin'), 'users.manage') $$,
  '42501', null, 'admin cannot grant itself users.manage');
reset role;

-- A non-super role that holds users.manage still cannot create super admins.
insert into public.roles (key, name_bn) values ('pgtap_user_manager', 'টেস্ট ইউজার ম্যানেজার');
insert into public.role_permissions (role_id, permission)
  select id, 'users.manage' from public.roles where key = 'pgtap_user_manager';
update public.staff_profiles set role_id = (select id from public.roles where key = 'pgtap_user_manager') where id = :admin;
select pg_temp.act_as(:admin);
select throws_like($$ update public.staff_profiles set role_id = (select id from public.roles where key = 'super_admin') where id = auth.uid() $$,
  '%SUPER_ADMIN_ONLY%', 'only a super admin can grant the super admin role');
select throws_like($$ update public.staff_profiles set is_active = false where id = '00000000-0000-4000-a000-000000000001' $$,
  '%SUPER_ADMIN_ONLY%', 'a non-super user manager cannot deactivate a super admin');
select throws_like($$ insert into public.role_permissions (role_id, permission)
                      values ((select id from public.roles where key = 'super_admin'), 'audit.view') $$,
  '%SYSTEM_ROLE_LOCKED%', 'super admin permissions are locked');
select throws_ok($$ truncate public.audit_logs $$, '42501', null, 'staff cannot TRUNCATE tables');
reset role;

select pg_temp.act_as(:super);
select throws_like($$ update public.staff_profiles set is_active = false where id = auth.uid() $$,
  '%LAST_SUPER_ADMIN%', 'the last active super admin cannot be deactivated');
select throws_like($$ delete from public.roles where key = 'secretary' $$, '%SYSTEM_ROLE_LOCKED%', 'system roles cannot be deleted');
reset role;

-- ---------------------------------------------------------- gallery rules
select throws_like($$ update public.activity_categories set slug = 'renamed' where slug = 'volunteering' $$,
  '%CATEGORY_SLUG_IMMUTABLE%', 'category folder names are immutable');
select throws_like($$ insert into public.gallery_images (category_id, storage_path)
                      values ((select id from public.activity_categories where slug = 'volunteering'), 'activities/winter-clothing/x.webp') $$,
  '%GALLERY_PATH_MISMATCH%', 'an image must live in its category folder');
insert into public.gallery_images (category_id, storage_path, is_published)
values ((select id from public.activity_categories where slug = 'volunteering'), 'activities/volunteering/pgtap-hidden.webp', false),
       ((select id from public.activity_categories where slug = 'volunteering'), 'activities/volunteering/pgtap-shown.webp', true);
select pg_temp.act_as_anon();
select is_empty($$ select 1 from public.gallery_images where storage_path = 'activities/volunteering/pgtap-hidden.webp' $$,
  'unpublished images are hidden from the public');
select isnt_empty($$ select 1 from public.gallery_images where storage_path = 'activities/volunteering/pgtap-shown.webp' $$,
  'published images are public');
reset role;
select pg_temp.act_as(:editor);
select isnt_empty($$ select 1 from public.gallery_images where storage_path = 'activities/volunteering/pgtap-hidden.webp' $$,
  'gallery managers see unpublished images');
select is_empty($$ delete from public.gallery_images where storage_path like 'activities/volunteering/pgtap-%' returning 1 $$,
  'content editor cannot delete images (needs gallery.delete)');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('gallery', 'activities/volunteering/pgtap-unreserved.webp') $$,
  '42501', null, 'uploads to an unreserved file name are rejected');
create temp table t_res as
  select * from public.gallery_reserve_uploads((select id from public.activity_categories where slug = 'volunteering'), 1);
select lives_ok($$ insert into storage.objects (bucket_id, name)
                   values ('gallery', 'activities/volunteering/' || (select file_id from t_res) || '.webp') $$,
  'gallery manager can upload to a reserved name in the activity folder');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('gallery', 'elsewhere/pgtap.webp') $$,
  '42501', null, 'uploads outside activities/ are rejected');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('members', 'photos/pgtap.webp') $$,
  '42501', null, 'content editor cannot upload member photos');
reset role;
select pg_temp.act_as(:viewer);
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('gallery', 'activities/volunteering/pgtap-viewer.webp') $$,
  '42501', null, 'committee viewer cannot upload gallery images');
reset role;
select pg_temp.act_as_anon();
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('gallery', 'activities/volunteering/pgtap-anon.webp') $$,
  '42501', null, 'anonymous uploads are rejected');
reset role;

select * from finish();
rollback;
