-- =====================================================================
-- Review fixes (2026-10-28), admin area.
--
-- 1. Staff-only READ access follows the two-step login rule as well.
--
--    20261028500000_admin_mfa.sql added the two-step rule
--    (private.mfa_satisfied()) to public.has_permission(), which covers every
--    write and every permission-gated read. The policies that only ask "is
--    this an active staff member?" use public.is_staff(), which did not have
--    the rule. So a password-only (aal1) session of a super admin, or of staff
--    with an authenticator app, could still read through the Supabase API:
--    every staff member's name, role and active flag, the roles, the
--    permission list and the role/permission matrix, and inactive
--    designations and activity categories.
--
--    is_staff() (and is_super_admin(), for consistency) now include the same
--    rule as has_permission(). Two things stay readable in a one-step
--    session, because the sign-in and two-step pages need them before the
--    second step (signIn() and getStaffSession() in src/lib/auth.ts):
--      * one's own staff_profiles row (already: "or id = auth.uid()");
--      * one's own role (roles_staff_read below).
--    Everything else (other staff, the permission matrix, inactive
--    designations/categories) needs the second step.
--
-- 2. Published FAQ "সদস্য তালিকায় আমার কোন তথ্য দেখানো হয়?" said that ONLY
--    name, position, member number and photo are shown, and that members
--    under 18 are never listed without guardian consent. The directory also
--    shows a phone number when the member gave explicit consent for it, and
--    the under-18 rule works from the date of birth on record. The answer
--    now says both, in the privacy policy's words. Only an answer that still
--    has the original text is changed, so an admin's own edit is kept.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Two-step rule for staff-only reads
-- ---------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_profiles sp
    where sp.id = (select auth.uid()) and sp.is_active
  )
  and private.mfa_satisfied();
$$;

create or replace function public.is_super_admin()
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
    where sp.id = (select auth.uid()) and sp.is_active and r.key = 'super_admin'
  )
  and private.mfa_satisfied();
$$;

-- create or replace keeps the existing grants; repeated here for clarity.
grant execute on function public.is_staff() to anon, authenticated, service_role;
grant execute on function public.is_super_admin() to anon, authenticated, service_role;

-- Roles: all staff (after the second step) read every role; anyone signed in
-- reads the role of their own staff profile (needed before the second step).
drop policy if exists roles_staff_read on public.roles;
create policy roles_staff_read on public.roles
  for select to authenticated using (
    (select public.is_staff())
    or id in (select sp.role_id from public.staff_profiles sp where sp.id = (select auth.uid()))
  );

-- permissions_staff_read, role_permissions_staff_read, staff_profiles_read
-- ("is_staff() or id = auth.uid()"), designations_public_read and
-- activity_categories_public_read ("is_active or is_staff()") call
-- public.is_staff() and so follow the rule above without changes.

-- ---------------------------------------------------------------------
-- 2. FAQ answer about the member directory
-- ---------------------------------------------------------------------
alter table public.faqs disable trigger faqs_audit;

update public.faqs
   set answer_bn = 'আবেদনের সময় সম্মতি দিলে সদস্য তালিকায় আপনার নাম, পদবী, সদস্য নম্বর এবং সংগঠন ছবি যুক্ত করলে সেই ছবি দেখানো হয়। জাতীয় পরিচয়পত্র/জন্ম নিবন্ধন নম্বর, ঠিকানা, জন্ম তারিখ ও আবেদনে দেওয়া মোবাইল নম্বর কখনো প্রকাশ করা হয় না। একমাত্র ব্যতিক্রম ফোন নম্বর: আপনি আলাদাভাবে সুস্পষ্ট সম্মতি দিলে তালিকায় আপনার একটি ফোন নম্বর দেখানো হতে পারে। জন্ম তারিখ অনুযায়ী যে সদস্যের বয়স ১৮ বছরের কম, অভিভাবকের সম্মতি সংগঠনের রেকর্ডে সংরক্ষিত না থাকলে তাঁর নাম তালিকায় দেখানো হয় না। বিস্তারিত গোপনীয়তা নীতিতে দেখুন।'
 where question_bn = 'সদস্য তালিকায় আমার কোন তথ্য দেখানো হয়?'
   and answer_bn = 'আবেদনের সময় সম্মতি দিলে শুধু আপনার নাম, পদবী, সদস্য নম্বর এবং সংগঠন ছবি যুক্ত করলে সেই ছবি দেখানো হয়। জাতীয় পরিচয়পত্র/জন্ম নিবন্ধন নম্বর, ঠিকানা ও আবেদনের মোবাইল নম্বর কখনো প্রকাশ করা হয় না। ১৮ বছরের কম বয়সী সদস্যের নাম অভিভাবকের সম্মতি সংগঠনের রেকর্ডে না থাকলে তালিকায় দেখানো হয় না। বিস্তারিত গোপনীয়তা নীতিতে দেখুন।';

update public.faqs
   set answer_en = 'If you consented when applying, the directory shows your name, position and member number, and your photo if the organization adds one. National ID / birth registration numbers, addresses, dates of birth and the mobile number from the application are never published. The only exception is a phone number: if you give separate, explicit consent, one phone number of yours may be shown in the directory. A member who is under 18 according to the date of birth on record is listed only when their guardian''s consent is recorded by the organization. See the privacy policy for details.'
 where question_bn = 'সদস্য তালিকায় আমার কোন তথ্য দেখানো হয়?'
   and answer_en = 'If you consented when applying, only your name, position, member number and — if the organization adds one — your photo are shown. National ID / birth registration numbers, addresses and the mobile number from the application are never published. Members under 18 are listed only when their guardian''s consent is recorded by the organization. See the privacy policy for details.';

alter table public.faqs enable trigger faqs_audit;
