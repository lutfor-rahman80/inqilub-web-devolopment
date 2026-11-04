-- Phase 2 foundation tests: programs, FAQ, photo↔program links, under-18
-- directory rule, settings validation. Rolled back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

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
grant execute on all functions in schema pg_temp to anon, authenticated;

\set editor '''00000000-0000-4000-a000-000000000004'''
\set viewer '''00000000-0000-4000-a000-000000000005'''

-- ------------------------------------------------------------ programs
select pg_temp.act_as(:editor);
select lives_ok($$
  insert into public.programs (slug, category_id, title_bn, starts_on, ends_on, is_published)
  values ('pgtap-winter-2026', (select id from public.activity_categories where slug = 'winter-clothing'),
          'পিজিট্যাপ শীতবস্ত্র', current_date - 1, current_date + 1, true),
         ('pgtap-draft', (select id from public.activity_categories where slug = 'winter-clothing'),
          'পিজিট্যাপ খসড়া', current_date + 10, null, false) $$,
  'content manager can create programs');
select throws_ok($$ insert into public.programs (slug, category_id, title_bn, starts_on, ends_on)
  values ('pgtap-bad-dates', (select id from public.activity_categories where slug = 'winter-clothing'), 'ভুল তারিখ', current_date, current_date - 3) $$,
  '23514', null, 'end date before start date is rejected');
select throws_like($$ update public.programs set slug = 'pgtap-renamed' where slug = 'pgtap-winter-2026' $$,
  '%PROGRAM_SLUG_LOCKED%', 'a published program keeps its URL');
select lives_ok($$ update public.programs set slug = 'pgtap-draft-2' where slug = 'pgtap-draft' $$,
  'an unpublished program can still be renamed');
select throws_ok($$ update public.programs set first_published_at = null where slug = 'pgtap-winter-2026' $$,
  '42501', null, 'first_published_at cannot be rewritten by staff');
reset role;

select pg_temp.act_as(:viewer);
select throws_ok($$ insert into public.programs (slug, category_id, title_bn, starts_on)
  values ('pgtap-viewer', (select id from public.activity_categories where slug = 'winter-clothing'), 'দর্শক', current_date) $$,
  '42501', null, 'committee viewer cannot create programs');
reset role;

select pg_temp.act_as_anon();
select isnt_empty($$ select 1 from public.programs where slug = 'pgtap-winter-2026' $$, 'anon sees published programs');
select is_empty($$ select 1 from public.programs where slug = 'pgtap-draft-2' $$, 'anon does not see unpublished programs');
select is((select public.program_status(starts_on, ends_on, status_override) from public.programs where slug = 'pgtap-winter-2026'),
  'ongoing', 'status is computed from the dates');
select throws_ok($$ insert into public.programs (slug, category_id, title_bn, starts_on)
  values ('pgtap-anon', (select id from public.activity_categories where slug = 'winter-clothing'), 'অ্যানন', current_date) $$,
  '42501', null, 'anon cannot create programs');
reset role;

-- ------------------------------------------------- photo ↔ program link
insert into public.gallery_images (category_id, storage_path, is_published)
values ((select id from public.activity_categories where slug = 'winter-clothing'), 'activities/winter-clothing/pgtap-a.webp', true),
       ((select id from public.activity_categories where slug = 'volunteering'), 'activities/volunteering/pgtap-b.webp', true);
select lives_ok($$ update public.gallery_images set program_id = (select id from public.programs where slug = 'pgtap-winter-2026')
                   where storage_path = 'activities/winter-clothing/pgtap-a.webp' $$,
  'a photo in the same category can be linked to a program');
select throws_like($$ update public.gallery_images set program_id = (select id from public.programs where slug = 'pgtap-winter-2026')
                      where storage_path = 'activities/volunteering/pgtap-b.webp' $$,
  '%PROGRAM_CATEGORY_MISMATCH%', 'a photo from another category cannot be linked');
select throws_like($$ update public.programs set cover_image_id = (select id from public.gallery_images where storage_path = 'activities/volunteering/pgtap-b.webp')
                      where slug = 'pgtap-winter-2026' $$,
  '%PROGRAM_COVER_MISMATCH%', 'the cover must come from the program''s category');
update public.gallery_images set category_id = (select id from public.activity_categories where slug = 'volunteering'),
       storage_path = 'activities/volunteering/pgtap-a.webp'
 where storage_path = 'activities/winter-clothing/pgtap-a.webp';
select is((select program_id from public.gallery_images where storage_path = 'activities/volunteering/pgtap-a.webp'),
  null, 'moving a photo to another category unlinks it from the program');

-- ---------------------------------------------------------------- FAQ
insert into public.faqs (question_bn, answer_bn, is_published) values ('পিজিট্যাপ প্রশ্ন?', 'উত্তর', true), ('খসড়া প্রশ্ন?', 'উত্তর', false);
select pg_temp.act_as_anon();
select is((select count(*)::int from public.faqs where question_bn in ('পিজিট্যাপ প্রশ্ন?', 'খসড়া প্রশ্ন?')), 1, 'anon sees only published FAQ entries');
reset role;

-- ------------------------------------------------- under-18 directory rule
insert into public.members (full_name, designation_id, directory_consent, show_in_directory, date_of_birth)
values ('পিজিট্যাপ কিশোর', (select id from public.designations where name_bn = 'সদস্য'), true, true, current_date - interval '15 years'),
       ('পিজিট্যাপ প্রাপ্তবয়স্ক', (select id from public.designations where name_bn = 'সদস্য'), true, true, current_date - interval '25 years');
select pg_temp.act_as_anon();
select is_empty($$ select 1 from public.public_members where full_name = 'পিজিট্যাপ কিশোর' $$, 'members under 18 are hidden without guardian consent');
select isnt_empty($$ select 1 from public.public_members where full_name = 'পিজিট্যাপ প্রাপ্তবয়স্ক' $$, 'adult consenting members are listed');
reset role;
update public.members set guardian_consent = true where full_name = 'পিজিট্যাপ কিশোর';
select pg_temp.act_as_anon();
select isnt_empty($$ select 1 from public.public_members where full_name = 'পিজিট্যাপ কিশোর' $$, 'guardian consent makes a minor listable');
select is((select designation_en from public.public_members where full_name = 'পিজিট্যাপ প্রাপ্তবয়স্ক'), 'Member', 'directory exposes the English designation');
reset role;

-- --------------------------------------------------------------- press
select pg_temp.act_as(:editor);
select lives_ok($$ insert into public.press_items (kind, title_bn, outlet_bn, url, published_on, is_published)
                   values ('news', 'পিজিট্যাপ প্রতিবেদন', 'পরীক্ষা পত্রিকা', 'https://news.example.com/a?id=1', current_date, true),
                          ('interview', 'পিজিট্যাপ খসড়া সাক্ষাৎকার', 'পরীক্ষা টিভি', 'https://www.youtube.com/watch?v=abc123', current_date, false) $$,
  'content manager can add press items');
select throws_ok($$ insert into public.press_items (kind, title_bn, outlet_bn, url, published_on)
                    values ('news', 'খারাপ লিংক', 'পত্রিকা', 'javascript:alert(1)', current_date) $$,
  '23514', null, 'press links must be https URLs');
select throws_ok($$ insert into public.press_items (kind, title_bn, outlet_bn, url, published_on)
                    values ('news', 'এইচটিটিপি', 'পত্রিকা', 'http://news.example.com/a', current_date) $$,
  '23514', null, 'plain http press links are rejected');
select throws_ok($$ insert into public.press_items (kind, title_bn, outlet_bn, url, published_on)
                    values ('news', 'উদ্ধৃতি', 'পত্রিকা', 'https://news.example.com/a"onmouseover=x', current_date) $$,
  '23514', null, 'press links cannot contain quotes or markup');
reset role;
select pg_temp.act_as(:viewer);
select throws_ok($$ insert into public.press_items (kind, title_bn, outlet_bn, url, published_on)
                    values ('news', 'দর্শক', 'পত্রিকা', 'https://news.example.com/b', current_date) $$,
  '42501', null, 'committee viewer cannot add press items');
reset role;
select pg_temp.act_as_anon();
select is((select count(*)::int from public.press_items where title_bn like 'পিজিট্যাপ%'), 1, 'anon sees only published press items');
reset role;

-- ------------------------------------------------- settings validation
select pg_temp.act_as(:editor);
select lives_ok($$ update public.site_settings set value = jsonb_build_object('links', jsonb_build_array(
                     jsonb_build_object('platform', 'youtube', 'url', 'https://www.youtube.com/@example'))) where key = 'social' $$,
  'an allowed social link is accepted');
select throws_like($$ update public.site_settings set value = jsonb_build_object('links', jsonb_build_array(
                        jsonb_build_object('platform', 'youtube', 'url', 'javascript:alert(1)'))) where key = 'social' $$,
  '%INVALID_SETTINGS%', 'a javascript: social link is rejected');
select throws_like($$ update public.site_settings set value = jsonb_build_object('links', jsonb_build_array(
                        jsonb_build_object('platform', 'youtube', 'url', 'https://evil.example/youtube.com/'))) where key = 'social' $$,
  '%INVALID_SETTINGS%', 'a link to another host is rejected');
select throws_like($$ update public.site_settings set value = jsonb_build_object('links', jsonb_build_array(
                        jsonb_build_object('platform', 'myspace', 'url', 'https://myspace.com/x'))) where key = 'social' $$,
  '%INVALID_SETTINGS%', 'unknown platforms are rejected');
select throws_like($$ update public.site_settings set value = jsonb_build_object('url', 'http://quiz.example.org') where key = 'quiz' $$,
  '%INVALID_SETTINGS%', 'the quiz link must be https');
select throws_like($$ update public.site_settings set value = value || '{"en": {"goal": 5}}' where key = 'about' $$,
  '%INVALID_SETTINGS%', 'English settings must be text');
reset role;
select is((select value ->> 'location' from public.site_settings where key = 'organization'), 'নারায়ণগঞ্জ', 'general address is নারায়ণগঞ্জ');

select * from finish();
rollback;
