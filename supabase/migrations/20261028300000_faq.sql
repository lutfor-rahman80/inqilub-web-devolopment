-- =====================================================================
-- FAQ (প্রশ্নোত্তর) — pages module, approved plan docs/04 §10 F10
--   1. public.move_faq(): move an entry one place up/down (atomic renumber)
--   2. Suggested entries as DRAFTS (is_published = false) for the
--      organization to review before publishing. Every answer states only
--      verified facts: the organization's own texts (site settings: non-
--      political identity, লক্ষ্য, উদ্দেশ্য, activity areas) and how this
--      website actually works (membership form, status check, directory
--      rules). English texts are DRAFT translations awaiting review.
-- The faqs table and its RLS come from 20261028000001_phase2_foundation.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Reordering
-- ---------------------------------------------------------------------
-- Runs as the caller (security invoker): RLS on faqs applies, and the
-- explicit permission check gives a clear error. All rows are locked first,
-- so two editors moving entries at the same time cannot interleave. Entries
-- are renumbered 10, 20, 30… in their current order (sort_order, then
-- creation time, then id — the same order the public page uses), with the
-- moved entry swapped with its neighbour; only rows whose number changes
-- are written (and audited).
create or replace function public.move_faq(p_id uuid, p_direction text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ids  uuid[];
  v_pos  int;
  v_swap int;
begin
  if not public.has_permission('content.manage') then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;
  if p_direction is null or p_direction not in ('up', 'down') then
    raise exception 'INVALID_DIRECTION' using errcode = '22023';
  end if;

  perform 1 from public.faqs order by id for update;

  select array_agg(f.id order by f.sort_order, f.created_at, f.id)
    into v_ids
    from public.faqs f;

  v_pos := array_position(v_ids, p_id);
  if v_pos is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  v_swap := case when p_direction = 'up' then v_pos - 1 else v_pos + 1 end;
  if v_swap < 1 or v_swap > coalesce(array_length(v_ids, 1), 0) then
    return; -- already first / last: nothing to do
  end if;

  v_ids[v_pos] := v_ids[v_swap];
  v_ids[v_swap] := p_id;

  update public.faqs f
     set sort_order = (x.ord * 10)::int
    from unnest(v_ids) with ordinality as x(id, ord)
   where f.id = x.id
     and f.sort_order is distinct from (x.ord * 10)::int;
end;
$$;

revoke execute on function public.move_faq(uuid, text) from public, anon;
grant execute on function public.move_faq(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 2. Suggested entries (drafts — not visible on the website until an
--    admin reviews and publishes them). Reference content inserted by the
--    migration itself, like the other seed data: no audit entries (there is
--    no acting staff member; later edits by admins are audited as usual).
-- ---------------------------------------------------------------------
alter table public.faqs disable trigger faqs_audit;

insert into public.faqs (question_bn, answer_bn, question_en, answer_en, sort_order, is_published)
select v.question_bn, v.answer_bn, v.question_en, v.answer_en, v.sort_order, false
from (values
  (
    'সংগঠন কি কোনো রাজনৈতিক দলের সাথে যুক্ত?',
    'না। ইনকিলাব যুব সংগঠন সম্পূর্ণ অরাজনৈতিক একটি সামাজিক যুব সংগঠন; এটি কোনো রাজনৈতিক দলের সাথে সম্পৃক্ত নয়।',
    'Is the organization political?',
    'No. Inqilab Jubo Sangathan is a completely non-political social youth organization; it is not affiliated with any political party.',
    10
  ),
  (
    'সংগঠনের লক্ষ্য ও উদ্দেশ্য কী?',
    E'লক্ষ্য: আদর্শবান যুবদের সুসংগঠিত করার মাধ্যমে ইসলামিক, সামাজিক কল্যাণ, সেবা ও শিক্ষামূলক কার্যক্রম পরিচালনা করা।\n\nউদ্দেশ্য: একমাত্র মহান আল্লাহ পাকের সন্তুষ্টি অর্জন করা।',
    'What are the goal and objective of the organization?',
    E'Goal: to carry out Islamic, social welfare, service and educational activities by organizing principled young people.\n\nObjective: solely to earn the pleasure of Almighty Allah.',
    20
  ),
  (
    'সংগঠন কোন কোন কাজ করে?',
    'সংগঠন ইসলামিক, সামাজিক কল্যাণ, সেবা ও শিক্ষামূলক কার্যক্রম পরিচালনা করে — যেমন স্বেচ্ছাসেবা ও স্বেচ্ছাশ্রম, দুর্যোগে মানবসেবা, রক্তের গ্রুপ নির্ণয়, শিক্ষামূলক প্রশিক্ষণ, শিক্ষা সামগ্রী বিতরণ, রমজানে ইফতার আয়োজন, শীতবস্ত্র বিতরণ ও অসহায়দের চিকিৎসা সহায়তা। সব ক্ষেত্রের তালিকা ও ছবি ওয়েবসাইটের “কার্যক্রমের ক্ষেত্র” পাতায়, আর তারিখসহ আয়োজনগুলো “কর্মসূচি” পাতায় দেখা যাবে।',
    'What does the organization do?',
    'The organization carries out Islamic, social welfare, service and educational activities — for example volunteering, humanitarian service in disasters, blood group testing, educational training, distribution of educational materials, iftar in Ramadan, winter clothing distribution and medical assistance for the destitute. The full list of areas with photos is on the “Areas of work” page, and individual events with their dates are on the “Programs” page.',
    30
  ),
  (
    'কীভাবে সদস্য হব?',
    'ওয়েবসাইটের “সদস্য হোন” পাতায় অনলাইন ফর্মটি চারটি ধাপে পূরণ করুন: ব্যক্তিগত তথ্য, ঠিকানা, পরিচয় ও যোগাযোগ, এবং অঙ্গীকারনামা ও পর্যালোচনা। অঙ্গীকারনামায় সম্মতি দিয়ে জমা দিলে একটি ট্র্যাকিং নম্বর পাবেন। সংগঠনের দায়িত্বপ্রাপ্তরা আবেদন যাচাই করে অনুমোদন বা প্রত্যাখ্যানের সিদ্ধান্ত নেন; অনুমোদিত হলে একটি সদস্য নম্বর দেওয়া হয়।',
    'How can I become a member?',
    'Fill in the online form on the “Become a member” page in four steps: personal information, address, identity and contact, and pledge and review. After you agree to the pledge and submit, you receive a tracking number. The organization''s responsible members review the application and approve or reject it; approved members receive a member number.',
    40
  ),
  (
    'আবেদনের অবস্থা কীভাবে জানব?',
    'ওয়েবসাইটের “আবেদনের অবস্থা” পাতায় আবেদন জমা দেওয়ার সময় পাওয়া ট্র্যাকিং নম্বর এবং আবেদনে দেওয়া মোবাইল নম্বর লিখুন। দুটোই মিললে আবেদনের বর্তমান অবস্থা (অপেক্ষমাণ, যাচাই চলছে, অনুমোদিত বা প্রত্যাখ্যাত) দেখা যাবে; অনুমোদিত হলে সদস্য নম্বরও দেখানো হয়।',
    'How can I check the status of my application?',
    'On the “Application status” page, enter the tracking number you received when you submitted the application and the mobile number given in the application. If both match, the current status (pending, under review, approved or rejected) is shown; for approved applications the member number is shown as well.',
    50
  ),
  (
    'সদস্য তালিকায় আমার কোন তথ্য দেখানো হয়?',
    'আবেদনের সময় সম্মতি দিলে শুধু আপনার নাম, পদবী, সদস্য নম্বর এবং সংগঠন ছবি যুক্ত করলে সেই ছবি দেখানো হয়। জাতীয় পরিচয়পত্র/জন্ম নিবন্ধন নম্বর, ঠিকানা ও আবেদনের মোবাইল নম্বর কখনো প্রকাশ করা হয় না। ১৮ বছরের কম বয়সী সদস্যের নাম অভিভাবকের সম্মতি সংগঠনের রেকর্ডে না থাকলে তালিকায় দেখানো হয় না। বিস্তারিত গোপনীয়তা নীতিতে দেখুন।',
    'What does the member directory show about me?',
    'If you consented when applying, only your name, position, member number and — if the organization adds one — your photo are shown. National ID / birth registration numbers, addresses and the mobile number from the application are never published. Members under 18 are listed only when their guardian''s consent is recorded by the organization. See the privacy policy for details.',
    60
  ),
  (
    'সংগঠনের সাথে কীভাবে যোগাযোগ করব?',
    'ওয়েবসাইটের “যোগাযোগ” পাতার ফর্মে বার্তা পাঠান, অথবা আমাদের ফেসবুক পেজে বার্তা দিন। সংগঠনের পক্ষ থেকে যোগাযোগ ও যেকোনো লেনদেন শুধুমাত্র এই ওয়েবসাইটে দেওয়া মাধ্যমগুলোতে হয়।',
    'How can I contact the organization?',
    'Send a message using the form on the “Contact” page, or message us on our Facebook page. The organization communicates and handles any transaction only through the channels listed on this website.',
    70
  )
) as v(question_bn, answer_bn, question_en, answer_en, sort_order)
where not exists (select 1 from public.faqs f where f.question_bn = v.question_bn);

alter table public.faqs enable trigger faqs_audit;
