-- FAQ tests: reordering function public.move_faq (permissions, swap,
-- no-ops, errors) and visibility of drafts. Rolled back.
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
-- Order of the three test entries as the public page sorts them.
create function pg_temp.test_order() returns text language sql as $$
  select string_agg(question_bn, ',' order by sort_order, created_at, id)
  from public.faqs where question_bn like 'পিজিট্যাপ-প্রশ্ন-%';
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

\set editor '''00000000-0000-4000-a000-000000000004'''
\set viewer '''00000000-0000-4000-a000-000000000005'''

insert into public.faqs (question_bn, answer_bn, sort_order, is_published) values
  ('পিজিট্যাপ-প্রশ্ন-ক', 'উত্তর ক', 900000, true),
  ('পিজিট্যাপ-প্রশ্ন-খ', 'উত্তর খ', 900010, false),
  ('পিজিট্যাপ-প্রশ্ন-গ', 'উত্তর গ', 900020, true);

select pg_temp.act_as(:editor);
select is(pg_temp.test_order(), 'পিজিট্যাপ-প্রশ্ন-ক,পিজিট্যাপ-প্রশ্ন-খ,পিজিট্যাপ-প্রশ্ন-গ', 'initial order');
select lives_ok($$ select public.move_faq((select id from public.faqs where question_bn = 'পিজিট্যাপ-প্রশ্ন-গ'), 'up') $$,
  'content manager can move an entry up');
select is(pg_temp.test_order(), 'পিজিট্যাপ-প্রশ্ন-ক,পিজিট্যাপ-প্রশ্ন-গ,পিজিট্যাপ-প্রশ্ন-খ', 'moving up swaps with the previous entry');
select lives_ok($$ select public.move_faq((select id from public.faqs where question_bn = 'পিজিট্যাপ-প্রশ্ন-ক'), 'down') $$,
  'content manager can move an entry down');
select is(pg_temp.test_order(), 'পিজিট্যাপ-প্রশ্ন-গ,পিজিট্যাপ-প্রশ্ন-ক,পিজিট্যাপ-প্রশ্ন-খ', 'moving down swaps with the next entry');
select is((select count(distinct sort_order)::int from public.faqs), (select count(*)::int from public.faqs),
  'after a move every entry has its own sort order');
select is((select min(sort_order) from public.faqs), 10, 'entries are renumbered from 10 in steps of 10');

-- The last entry cannot move further down (no-op, no error).
select lives_ok($$ select public.move_faq((select id from public.faqs order by sort_order desc, created_at desc, id desc limit 1), 'down') $$,
  'moving the last entry down is a no-op');
select is(pg_temp.test_order(), 'পিজিট্যাপ-প্রশ্ন-গ,পিজিট্যাপ-প্রশ্ন-ক,পিজিট্যাপ-প্রশ্ন-খ', 'order unchanged by the no-op');

select throws_like($$ select public.move_faq('00000000-0000-4000-8000-000000000000', 'up') $$,
  '%NOT_FOUND%', 'unknown entry is reported');
select throws_like($$ select public.move_faq((select id from public.faqs where question_bn = 'পিজিট্যাপ-প্রশ্ন-ক'), 'sideways') $$,
  '%INVALID_DIRECTION%', 'unknown direction is rejected');
select lives_ok($$ update public.faqs set is_published = true, question_en = 'pgTAP question?' where question_bn = 'পিজিট্যাপ-প্রশ্ন-খ' $$,
  'content manager can publish and translate an entry');
reset role;

select pg_temp.act_as(:viewer);
select throws_ok($$ select public.move_faq((select id from public.faqs where question_bn = 'পিজিট্যাপ-প্রশ্ন-ক'), 'up') $$,
  '42501', null, 'committee viewer cannot reorder');
select is((select count(*)::int from public.faqs where question_bn like 'পিজিট্যাপ-প্রশ্ন-%'), 3,
  'staff without content.manage see only published entries (all three are published now)');
select throws_ok($$ insert into public.faqs (question_bn, answer_bn) values ('দর্শকের প্রশ্ন?', 'উত্তর') $$,
  '42501', null, 'committee viewer cannot add entries');
reset role;

update public.faqs set is_published = false where question_bn = 'পিজিট্যাপ-প্রশ্ন-খ';
select pg_temp.act_as_anon();
select throws_ok($$ select public.move_faq((select id from public.faqs limit 1), 'up') $$,
  '42501', null, 'anonymous visitors cannot call move_faq');
select is((select count(*)::int from public.faqs where question_bn like 'পিজিট্যাপ-প্রশ্ন-%'), 2,
  'anonymous visitors see only published entries');
select is((select count(*)::int from public.faqs where not is_published), 0, 'no draft is visible to anonymous visitors');
reset role;

-- Organization decision 2026-10-28 (migration 20261028600000_faq_publish.sql):
-- the 8 suggested questions (one added by that migration) are published.
create temp table t_suggested(q text primary key);
insert into t_suggested values
  ('সংগঠন কি কোনো রাজনৈতিক দলের সাথে যুক্ত?'), ('সংগঠনের লক্ষ্য ও উদ্দেশ্য কী?'), ('সংগঠন কোন কোন কাজ করে?'),
  ('সংগঠনের কর্মসূচি ও খবর কোথায় জানতে পারব?'), ('কীভাবে সদস্য হব?'), ('আবেদনের অবস্থা কীভাবে জানব?'),
  ('সদস্য তালিকায় আমার কোন তথ্য দেখানো হয়?'), ('সংগঠনের সাথে কীভাবে যোগাযোগ করব?');
grant select on t_suggested to anon;
select is((select count(*)::int from public.faqs where question_bn in (select q from t_suggested)), 8,
  'the 8 suggested FAQ entries exist');
select is((select count(*)::int from public.faqs where is_published and question_bn in (select q from t_suggested)), 8,
  'the 8 suggested FAQ entries are published');
select ok((select bool_and(question_en is not null and answer_en is not null) from public.faqs where question_bn in (select q from t_suggested)),
  'the suggested entries have English drafts');
select pg_temp.act_as_anon();
select is((select count(*)::int from public.faqs where question_bn in (select q from t_suggested)), 8,
  'anonymous visitors see the 8 suggested entries');
reset role;

-- Review fix (migration 20261028900000_admin_review_fixes.sql): the directory
-- answer no longer claims that ONLY name/position/number/photo are shown or
-- that every minor is hidden (the consented phone number and the
-- date-of-birth condition were missing).
select is((select count(*)::int from public.faqs
            where question_bn = 'সদস্য তালিকায় আমার কোন তথ্য দেখানো হয়?'
              and (answer_bn like 'আবেদনের সময় সম্মতি দিলে শুধু আপনার নাম%'
                   or answer_en like 'If you consented when applying, only your name%')), 0,
  'the directory FAQ answer no longer has the original, incomplete wording');
select ok((select answer_bn like '%ফোন নম্বর%' and answer_bn like '%জন্ম তারিখ অনুযায়ী%'
             and answer_en like '%phone number%' and answer_en like '%according to the date of birth%'
           from public.faqs where question_bn = 'সদস্য তালিকায় আমার কোন তথ্য দেখানো হয়?'),
  'the directory FAQ answer mentions the consented phone number and the date-of-birth rule (BN + EN)');

select * from finish();
rollback;
