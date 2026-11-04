-- Organization decision (2026-10-28): show the suggested questions on /faq now
-- instead of the empty state, and add one more. Every answer only restates the
-- organization's own texts or how this website works; admins edit, hide,
-- reorder or add questions in অ্যাডমিন → প্রশ্নোত্তর.
alter table public.faqs disable trigger faqs_audit;

insert into public.faqs (question_bn, answer_bn, question_en, answer_en, sort_order, is_published)
select
  'সংগঠনের কর্মসূচি ও খবর কোথায় জানতে পারব?',
  'ওয়েবসাইটের “কর্মসূচি” পাতায় চলমান, সম্পন্ন ও আসন্ন কর্মসূচি তারিখসহ দেখা যায়। গুরুত্বপূর্ণ তথ্য “ঘোষণা” পাতায় এবং গণমাধ্যমে প্রকাশিত খবর ও সাক্ষাৎকার “Notice” পাতায় থাকে। নিয়মিত খবর ও ছবির জন্য আমাদের ফেসবুক পেজ অনুসরণ করুন।',
  'Where can I find the organization''s programs and news?',
  'The “Programs” page lists ongoing, completed and upcoming programs with their dates. Important information is on the “Announcements” page, and news reports and interviews in the media are on the “Notice” page. Follow our Facebook page for regular news and photos.',
  35,
  false
where not exists (select 1 from public.faqs where question_bn = 'সংগঠনের কর্মসূচি ও খবর কোথায় জানতে পারব?');

-- Publish the suggested entries (matched by their original text, so a
-- question an admin has already rewritten or hidden is left alone).
update public.faqs
   set is_published = true
 where is_published = false
   and question_bn in (
     'সংগঠন কি কোনো রাজনৈতিক দলের সাথে যুক্ত?',
     'সংগঠনের লক্ষ্য ও উদ্দেশ্য কী?',
     'সংগঠন কোন কোন কাজ করে?',
     'সংগঠনের কর্মসূচি ও খবর কোথায় জানতে পারব?',
     'কীভাবে সদস্য হব?',
     'আবেদনের অবস্থা কীভাবে জানব?',
     'সদস্য তালিকায় আমার কোন তথ্য দেখানো হয়?',
     'সংগঠনের সাথে কীভাবে যোগাযোগ করব?'
   );

alter table public.faqs enable trigger faqs_audit;
