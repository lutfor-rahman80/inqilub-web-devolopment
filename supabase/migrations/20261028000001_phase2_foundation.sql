-- =====================================================================
-- Phase 2 foundation (approved plan docs/04-phase2-analysis-and-plan.md §6)
--   1. programs (কর্মসূচি): dated activities with computed status
--   2. faqs: bilingual questions & answers
--   3. gallery_images.program_id (photos of a specific program)
--   4. English (_en) columns for categories, announcements, designations
--   5. members: private date of birth + guardian consent (under-18 rule)
--   6. site_settings: address "নারায়ণগঞ্জ", English texts, social links,
--      quiz link, committee term (+ validation)
-- English texts below are DRAFT translations awaiting the organization's
-- review; admins can edit all of them in the admin panel.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Programs
-- ---------------------------------------------------------------------
create table public.programs (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  category_id        uuid not null references public.activity_categories(id) on delete restrict,
  title_bn           text not null check (char_length(title_bn) between 2 and 200),
  title_en           text check (title_en is null or char_length(title_en) between 2 and 200),
  summary_bn         text not null default '' check (char_length(summary_bn) <= 500),
  summary_en         text check (char_length(summary_en) <= 500),
  body_bn            text not null default '' check (char_length(body_bn) <= 20000),
  body_en            text check (char_length(body_en) <= 20000),
  location_bn        text check (char_length(location_bn) <= 200),
  location_en        text check (char_length(location_en) <= 200),
  starts_on          date not null check (starts_on > date '2000-01-01'),
  ends_on            date,
  status_override    text check (status_override in ('postponed', 'cancelled')),
  cover_image_id     uuid references public.gallery_images(id) on delete set null,
  is_published       boolean not null default false,
  first_published_at timestamptz,
  sort_order         int not null default 0,
  created_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint programs_dates_order check (ends_on is null or ends_on >= starts_on)
);
create index programs_public_idx on public.programs(is_published, starts_on desc);
create index programs_category_idx on public.programs(category_id);
create trigger programs_updated_at before update on public.programs
  for each row execute function private.set_updated_at();

-- Status is computed from the dates (Asia/Dhaka), so it never goes stale.
-- Keep in sync with src/lib/programs/status.ts (tested).
create or replace function public.program_status(p_starts date, p_ends date, p_override text)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_override is not null then p_override
    when p_starts > (now() at time zone 'Asia/Dhaka')::date then 'upcoming'
    when coalesce(p_ends, p_starts) < (now() at time zone 'Asia/Dhaka')::date then 'completed'
    else 'ongoing'
  end;
$$;

-- Published URL stays stable: the slug cannot change once published, and
-- the cover image must belong to the program's category folder.
create or replace function private.guard_programs()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_published and new.first_published_at is null then
    new.first_published_at := now();
  end if;
  if tg_op = 'UPDATE' and old.first_published_at is not null and new.slug <> old.slug then
    raise exception 'PROGRAM_SLUG_LOCKED' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and new.first_published_at is distinct from old.first_published_at
     and old.first_published_at is not null then
    new.first_published_at := old.first_published_at;
  end if;
  if new.cover_image_id is not null and not exists (
    select 1 from public.gallery_images g
    where g.id = new.cover_image_id and g.category_id = new.category_id
  ) then
    raise exception 'PROGRAM_COVER_MISMATCH' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger programs_guard before insert or update on public.programs
  for each row execute function private.guard_programs();

-- ---------------------------------------------------------------------
-- 3. Photos linked to a program (must be in the same category folder)
-- ---------------------------------------------------------------------
alter table public.gallery_images
  add column program_id uuid references public.programs(id) on delete set null;
create index gallery_images_program_idx on public.gallery_images(program_id) where program_id is not null;

create or replace function private.guard_image_program()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_cat uuid;
begin
  if new.program_id is null then
    return new;
  end if;
  select category_id into v_cat from public.programs where id = new.program_id;
  if v_cat is distinct from new.category_id then
    -- Moving a photo to another category unlinks it from the program.
    if tg_op = 'UPDATE' and old.category_id is distinct from new.category_id then
      new.program_id := null;
    else
      raise exception 'PROGRAM_CATEGORY_MISMATCH' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
create trigger gallery_images_program_guard before insert or update on public.gallery_images
  for each row execute function private.guard_image_program();

-- Changing a program's category unlinks photos (and the cover) from the old folder.
create or replace function private.unlink_program_images()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.category_id is distinct from old.category_id then
    update public.gallery_images set program_id = null
     where program_id = new.id and category_id <> new.category_id;
  end if;
  return new;
end;
$$;
create trigger programs_unlink_images after update of category_id on public.programs
  for each row execute function private.unlink_program_images();

-- Staff may set program_id through the existing column-level grant.
grant update (program_id) on public.gallery_images to authenticated;

-- ---------------------------------------------------------------------
-- 2. FAQ
-- ---------------------------------------------------------------------
create table public.faqs (
  id           uuid primary key default gen_random_uuid(),
  question_bn  text not null check (char_length(question_bn) between 3 and 300),
  answer_bn    text not null check (char_length(answer_bn) between 1 and 5000),
  question_en  text check (question_en is null or char_length(question_en) between 3 and 300),
  answer_en    text check (char_length(answer_en) <= 5000),
  sort_order   int not null default 0,
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index faqs_public_idx on public.faqs(is_published, sort_order);
create trigger faqs_updated_at before update on public.faqs
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- 4. English columns
-- ---------------------------------------------------------------------
alter table public.activity_categories
  add column name_en        text check (name_en is null or char_length(name_en) between 1 and 120),
  add column summary_en     text check (char_length(summary_en) <= 400),
  add column description_en text check (char_length(description_en) <= 5000);

alter table public.announcements
  add column title_en text check (title_en is null or char_length(title_en) between 2 and 200),
  add column body_en  text check (char_length(body_en) <= 20000);

alter table public.designations
  add column name_en text check (name_en is null or char_length(name_en) between 1 and 80);

-- ---------------------------------------------------------------------
-- 5. Members: private date of birth + guardian consent
-- ---------------------------------------------------------------------
alter table public.members
  add column date_of_birth    date check (date_of_birth is null or date_of_birth > date '1920-01-01'),
  add column guardian_consent boolean not null default false;

grant insert (date_of_birth, guardian_consent) on public.members to authenticated;
grant update (date_of_birth, guardian_consent) on public.members to authenticated;

-- Approval copies the applicant's date of birth to the member record.
create or replace function private.copy_member_dob()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.application_id is not null and new.date_of_birth is null then
    select a.date_of_birth into new.date_of_birth
    from public.membership_applications a where a.id = new.application_id;
  end if;
  return new;
end;
$$;
create trigger members_copy_dob before insert on public.members
  for each row execute function private.copy_member_dob();

update public.members m
   set date_of_birth = a.date_of_birth
  from public.membership_applications a
 where a.id = m.application_id and m.date_of_birth is null;

-- Directory: adds English designation; minors (under 18 by date of birth)
-- are listed only with recorded guardian consent.
create or replace view public.public_members
with (security_invoker = false, security_barrier = true)
as
select
  m.id,
  m.member_no,
  m.full_name,
  m.photo_path,
  d.id         as designation_id,
  d.name_bn    as designation,
  d.rank_order as designation_rank,
  case when m.public_phone_consent then m.public_phone end as public_phone,
  m.sort_order,
  m.joined_on,
  d.name_en    as designation_en
from public.members m
join public.designations d on d.id = m.designation_id
where m.status = 'active'
  and m.show_in_directory
  and m.directory_consent
  and (
    m.date_of_birth is null
    or m.date_of_birth <= ((now() at time zone 'Asia/Dhaka')::date - interval '18 years')
    or m.guardian_consent
  );
grant select on public.public_members to anon, authenticated;

-- ---------------------------------------------------------------------
-- RLS, audit, grants for the new tables
-- ---------------------------------------------------------------------
alter table public.programs enable row level security;
alter table public.faqs     enable row level security;

create policy programs_public_read on public.programs
  for select to anon, authenticated using (
    (is_published and exists (
      select 1 from public.activity_categories c where c.id = category_id and c.is_active))
    or (select public.has_permission('content.manage'))
  );
create policy programs_manage_insert on public.programs
  for insert to authenticated with check ((select public.has_permission('content.manage')));
create policy programs_manage_update on public.programs
  for update to authenticated using ((select public.has_permission('content.manage')))
  with check ((select public.has_permission('content.manage')));
create policy programs_manage_delete on public.programs
  for delete to authenticated using ((select public.has_permission('content.manage')));

create policy faqs_public_read on public.faqs
  for select to anon, authenticated using (is_published or (select public.has_permission('content.manage')));
create policy faqs_manage_insert on public.faqs
  for insert to authenticated with check ((select public.has_permission('content.manage')));
create policy faqs_manage_update on public.faqs
  for update to authenticated using ((select public.has_permission('content.manage')))
  with check ((select public.has_permission('content.manage')));
create policy faqs_manage_delete on public.faqs
  for delete to authenticated using ((select public.has_permission('content.manage')));

create trigger programs_audit after insert or update or delete on public.programs
  for each row execute function private.audit_row_change();
create trigger faqs_audit after insert or update or delete on public.faqs
  for each row execute function private.audit_row_change();

-- first_published_at / created_by are set by the server, never rewritten by clients.
revoke update on public.programs from authenticated;
grant update (slug, category_id, title_bn, title_en, summary_bn, summary_en, body_bn, body_en,
              location_bn, location_en, starts_on, ends_on, status_override, cover_image_id,
              is_published, sort_order)
  on public.programs to authenticated;

revoke execute on function public.program_status(date, date, text) from public;
grant execute on function public.program_status(date, date, text) to anon, authenticated, service_role;
revoke execute on all functions in schema private from public, anon, authenticated;

-- Defense in depth (as in 20261027900000): anonymous visitors never write.
revoke insert, update, delete, truncate, references, trigger on public.programs, public.faqs from anon;
revoke truncate, references, trigger on public.programs, public.faqs from authenticated;

-- ---------------------------------------------------------------------
-- English reference data (DRAFT translations for review)
-- ---------------------------------------------------------------------
update public.activity_categories c set name_en = v.name_en, summary_en = v.summary_en
from (values
  ('volunteering',            'Volunteering & Voluntary Service',      'Developing principled and skilled volunteers for voluntary service.'),
  ('disaster-response',       'Humanitarian Service in Disasters',     'Extending a helping hand to people in crises and disasters.'),
  ('blood-group',             'Blood Group Testing',                   'Running blood group testing programmes.'),
  ('educational-training',    'Educational Training',                  'Arranging educational training.'),
  ('educational-materials',   'Educational Materials Distribution',    'Distributing educational materials.'),
  ('ramadan-iftar',           'Iftar in Ramadan',                      'Arranging iftar during the month of Ramadan.'),
  ('winter-clothing',         'Winter Clothing Distribution',          'Distributing winter clothes among the poor in winter.'),
  ('medical-assistance',      'Medical Assistance for the Destitute',  'Arranging medical treatment for helpless and destitute people.'),
  ('awareness-campaigns',     'Public Awareness Activities',           'Running public awareness activities.'),
  ('special-days',            'Competitions & Prizes on Special Days', 'Organizing educational competitions and awarding prizes on various special days.'),
  ('islamic-cultural-events', 'Mahfil, Qirat & Cultural Programmes',   'Organizing mahfils, Qirat conferences and cultural programmes.'),
  ('eid-distribution',        'Eid Gift Distribution',                 'Distributing Eid gifts at Eid.'),
  ('other-activities',        'Other Social Activities',               'The organization''s other social and welfare activities.')
) as v(slug, name_en, summary_en)
where c.slug = v.slug and c.name_en is null;

update public.designations d set name_en = v.name_en
from (values
  ('সভাপতি', 'President'),
  ('সহ সভাপতি', 'Vice President'),
  ('সাধারণ সম্পাদক', 'General Secretary'),
  ('অর্থ সম্পাদক', 'Finance Secretary'),
  ('সহ অর্থ সম্পাদক', 'Assistant Finance Secretary'),
  ('সাংগঠনিক সম্পাদক', 'Organizing Secretary'),
  ('প্রচার ও প্রকাশনা বিষয়ক সম্পাদক', 'Publicity & Publication Secretary'),
  ('যুব কল্যাণ বিষয়ক সম্পাদক', 'Youth Welfare Secretary'),
  ('ধর্ম বিষয়ক সম্পাদক', 'Religious Affairs Secretary'),
  ('সমাজ কল্যাণ সম্পাদক', 'Social Welfare Secretary'),
  ('শিক্ষা বিষয়ক সম্পাদক', 'Education Secretary'),
  ('সদস্য', 'Member')
) as v(name_bn, name_en)
where d.name_bn = v.name_bn and d.name_en is null;

-- ---------------------------------------------------------------------
-- 6. Site settings: validation for new keys and English sub-objects
-- ---------------------------------------------------------------------
create or replace function private.validate_site_settings_v2()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v    jsonb := new.value;
  item jsonb;
  k    text;
  t    text;
  host text;
  allowed jsonb := '{
    "facebook":  "^https://((www|m)\\.)?facebook\\.com/",
    "youtube":   "^https://((www|m)\\.)?youtube\\.com/|^https://youtu\\.be/",
    "instagram": "^https://(www\\.)?instagram\\.com/",
    "tiktok":    "^https://(www\\.)?tiktok\\.com/",
    "x":         "^https://(www\\.)?(x|twitter)\\.com/",
    "whatsapp":  "^https://(www\\.)?(whatsapp\\.com/channel/|wa\\.me/)",
    "telegram":  "^https://t\\.me/",
    "linkedin":  "^https://(www\\.)?linkedin\\.com/"
  }';
begin
  if v is null or jsonb_typeof(v) <> 'object' then
    return new; -- shape of known keys is enforced by validate_site_settings()
  end if;

  -- Optional English sub-object: { "en": { "<field>": "text" | null, ... } }
  if v ? 'en' then
    if jsonb_typeof(v -> 'en') <> 'object' then
      raise exception 'INVALID_SETTINGS: %.en must be an object', new.key using errcode = 'check_violation';
    end if;
    for k, item in select * from jsonb_each(v -> 'en') loop
      t := jsonb_typeof(item);
      if t = 'array' then
        if exists (select 1 from jsonb_array_elements(item) e where jsonb_typeof(e) <> 'string') then
          raise exception 'INVALID_SETTINGS: %.en.% must contain text', new.key, k using errcode = 'check_violation';
        end if;
      elsif t not in ('string', 'null') then
        raise exception 'INVALID_SETTINGS: %.en.% must be text', new.key, k using errcode = 'check_violation';
      end if;
    end loop;
  end if;

  if new.key = 'social' then
    if jsonb_typeof(v -> 'links') is distinct from 'array' then
      raise exception 'INVALID_SETTINGS: social.links must be a list' using errcode = 'check_violation';
    end if;
    for item in select jsonb_array_elements(v -> 'links') loop
      if jsonb_typeof(item) <> 'object'
         or not (allowed ? coalesce(item ->> 'platform', ''))
         or coalesce(item ->> 'url', '') !~* (allowed ->> (item ->> 'platform'))
         or (item ->> 'url') ~ '[[:space:][:cntrl:]<>"]' then
        raise exception 'INVALID_SETTINGS: social link % is not an allowed https address', coalesce(item ->> 'platform', '?')
          using errcode = 'check_violation';
      end if;
    end loop;

  elsif new.key = 'quiz' then
    if coalesce(v ->> 'url', '') <> '' and (v ->> 'url') !~* '^https://[a-z0-9.-]+\.[a-z]{2,}(/[^[:space:][:cntrl:]<>"]*)?$' then
      raise exception 'INVALID_SETTINGS: quiz.url must be an https address' using errcode = 'check_violation';
    end if;
    foreach k in array array['label_bn', 'label_en'] loop
      t := jsonb_typeof(v -> k);
      if t is not null and t not in ('string', 'null') then
        raise exception 'INVALID_SETTINGS: quiz.% must be text', k using errcode = 'check_violation';
      end if;
    end loop;

  elsif new.key = 'directory' then
    foreach k in array array['committee_term_bn', 'committee_term_en'] loop
      t := jsonb_typeof(v -> k);
      if t is not null and t not in ('string', 'null') then
        raise exception 'INVALID_SETTINGS: directory.% must be text', k using errcode = 'check_violation';
      end if;
    end loop;
  end if;

  return new;
end;
$$;
revoke execute on function private.validate_site_settings_v2() from public, anon, authenticated;
create trigger site_settings_validate_v2
  before insert or update of key, value on public.site_settings
  for each row execute function private.validate_site_settings_v2();

-- General address → "নারায়ণগঞ্জ" (brief §5.7), English drafts, new keys.
update public.site_settings
   set value = value
     || jsonb_build_object('location', 'নারায়ণগঞ্জ')
     || jsonb_build_object('en', jsonb_build_object(
          'name', 'Inqilab Jubo Sangathan',
          'tagline', 'A non-political social youth organization',
          'slogan', 'To bring a new dawn, Inqilab will lead the way',
          'location', 'Narayanganj'))
 where key = 'organization';

update public.site_settings
   set value = value || jsonb_build_object('address', 'নারায়ণগঞ্জ')
                     || jsonb_build_object('en', jsonb_build_object('address', 'Narayanganj', 'office_hours', null))
 where key = 'contact'
   and coalesce(value ->> 'address', '') in ('', 'কাশীপুর, ফতুল্লা, নারায়ণগঞ্জ');

update public.site_settings
   set value = value || jsonb_build_object('en', jsonb_build_object(
     'what_is',   'Inqilab Jubo Sangathan is a completely non-political organization. It is a social youth organization.',
     'goal',      'To carry out Islamic, social welfare, service and educational activities by organizing principled young people. It is a completely non-political organization.',
     'objective', 'Solely to earn the pleasure of Almighty Allah.',
     'why',       'We know that principled young people are the helmsmen of a nation; they lead it. With the mercy of Allah, they develop their talent and intellect. We founded this organization so that young people do not go astray in the turbulent waves of youth, so that — staying with principled companions — they can lead their personal, family, social and national lives well, and so that various Islamic, social, service and educational activities can be arranged. We want to work as helpers of one another. We want to direct the energy of youth towards the welfare of Islam, the country and humanity.'))
 where key = 'about';

update public.site_settings
   set value = value || jsonb_build_object('en', jsonb_build_object('declaration', jsonb_build_array(
     'I, {name}, hereby pledge that I will abide by all the rules and regulations of “Inqilab Jubo Sangathan”. I will not take part in any activity contrary to the organization''s discipline. I will not be involved in any activity against Islam, humanity or the state. I will not do anything that harms the organization''s reputation. Insha''Allah.',
     'I wish to be a proud member and a principled volunteer of “Inqilab Jubo Sangathan”. I am eager to take part wholeheartedly in all of the organization''s activities, including its Islamic, social welfare, service and educational work. I therefore humbly request to be made a proud member and principled volunteer of the organization.',
     'Pledging to abide by all the rules and regulations of the organization, I am submitting this membership form.')))
 where key = 'membership';

update public.site_settings
   set value = value || jsonb_build_object('committee_term_bn', null, 'committee_term_en', null)
 where key = 'directory';

insert into public.site_settings (key, value) values
  ('social', jsonb_build_object('links', '[]'::jsonb)),
  ('quiz',   jsonb_build_object('url', null, 'label_bn', 'সীরাত কুইজ', 'label_en', 'Seerat Quiz'))
on conflict (key) do nothing;
