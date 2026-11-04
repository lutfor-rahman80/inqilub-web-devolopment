# ইনকিলাব যুব সংগঠন — Website Requirements, Architecture & Plan

Status: **APPROVED (with changes, 2026-10-27)**  ·  Date: 2026-10-27

---

## 1. Confirmed decisions

| Topic | Decision |
|---|---|
| Hosting | Vercel (free) + Supabase (free): Postgres, Auth, Storage |
| Language | Bengali only (Bengali numerals on public pages) |
| Applicant notification | Tracking number + mobile → public "status check" page; plus automatic emails (received / approved / rejected) via Resend when configured |
| Form additions | Optional email field + directory-consent checkbox (no applicant photo) |
| Gallery categories | 13 (Eid distribution is its own category) |
| ID formats | Application `IJS-A-2026-0001`, Member `IJS-2026-0001` (numbering resets yearly) |
| Approvers | Admin and Secretary; more can be added later from the admin panel (see §5) |
| Build/test | Built and fully tested locally (local Supabase in Docker); deployment guide for you |

## 2. Source-material findings

- **Identity:** non-political social youth organization; slogan "আনতে সুপ্রভাত, পথ দেখাবে ইনকিলাব"; address কাশীপুর, ফতুল্লা, নারায়ণগঞ্জ (from form image — more specific than text file).
- **লক্ষ্য:** আদর্শবান যুবদের সুসংগঠিত করার মাধ্যমে ইসলামিক, সামাজিক কল্যাণ, সেবা ও শিক্ষামূলক কার্যক্রম পরিচালনা করা।
- **উদ্দেশ্য:** একমাত্র মহান আল্লাহ পাকের সন্তুষ্টি অর্জন করা।
- **Activity 10 wording:** text file says "শিক্ষামূলক প্রতিযোগিতার", image says "প্রতিযোগিতার". Using the text-file version (editable later in admin).
- **Positions (provided by organization, in rank order):** সভাপতি, সহ সভাপতি, সাধারণ সম্পাদক, অর্থ সম্পাদক, সহ অর্থ সম্পাদক, সাংগঠনিক সম্পাদক, প্রচার ও প্রকাশনা বিষয়ক সম্পাদক, যুব কল্যাণ বিষয়ক সম্পাদক, ধর্ম বিষয়ক সম্পাদক, সমাজ কল্যাণ সম্পাদক, শিক্ষা বিষয়ক সম্পাদক, সদস্য. Designation only (no department field). List is admin-editable.
- **Facebook Page:** https://www.facebook.com/profile.php?id=61566432706839

## 3. Activity categories (gallery folders)

| # | Folder (`activities/…`) | Public name | Source activity |
|---|---|---|---|
| 1 | `volunteering` | স্বেচ্ছাসেবা ও স্বেচ্ছাশ্রম | ১ |
| 2 | `disaster-response` | দুর্যোগে মানবসেবা | ২ |
| 3 | `educational-training` | শিক্ষামূলক প্রশিক্ষণ | ৪ |
| 4 | `educational-materials` | শিক্ষা সামগ্রী বিতরণ | ৫ |
| 5 | `ramadan-iftar` | রমজানে ইফতার আয়োজন | ৬ |
| 6 | `eid-distribution` | ঈদ সামগ্রী বিতরণ | ১২ |
| 7 | `winter-clothing` | শীতবস্ত্র বিতরণ | ৭ |
| 8 | `medical-assistance` | অসহায়দের চিকিৎসা সহায়তা | ৮ |
| 9 | `blood-group` | রক্তের গ্রুপ নির্ণয় | ৩ |
| 10 | `awareness-campaigns` | জনসচেতনতামূলক কার্যক্রম | ৯ |
| 11 | `special-days` | বিভিন্ন দিবসে প্রতিযোগিতা ও পুরস্কার বিতরণ | ১০ |
| 12 | `islamic-cultural-events` | মাহফিল, ক্বেরাত সম্মেলন ও সাংস্কৃতিক অনুষ্ঠান | ১১ |
| 13 | `other-activities` | অন্যান্য সামাজিক কার্যক্রম | — |

Note: the original activity is "রক্তের গ্রুপ নির্ণয়" (blood grouping). The brief also mentions blood *donation*; the category is named only for what the organization states. Admins can rename any category.

## 4. Pages

**Public:** হোম · আমাদের সম্পর্কে (পরিচিতি, লক্ষ্য ও উদ্দেশ্য, কেন) · কার্যক্রম (list) · কার্যক্রম বিস্তারিত (description + its photos) · গ্যালারি (category filter, lightbox) · সদস্যবৃন্দ (approved & consented members; search + designation filter) · ঘোষণা · যোগাযোগ (form + Facebook link + QR) · সদস্য হোন (multi-step form) · আবেদনের অবস্থা যাচাই · অঙ্গীকারনামা ও শর্তাবলি · গোপনীয়তা নীতি.

Individual member profile pages are **not** built: the only public fields are photo/name/designation/ID, which a card already shows.

**Admin (`/admin`):** ড্যাশবোর্ড · আবেদনসমূহ · সদস্য · গ্যালারি · কার্যক্রম/ক্যাটাগরি · ঘোষণা · ওয়েবসাইট কনটেন্ট ও সেটিংস · বার্তা (contact) · ব্যবহারকারী · ভূমিকা ও অনুমতি · অডিট লগ.

## 5. Roles & permissions

Permissions are checked in the database (Row-Level Security + secure functions), not just by hiding buttons.

| Permission | Super Admin | Admin | Secretary | Content Editor | Committee Viewer |
|---|:-:|:-:|:-:|:-:|:-:|
| View applications (private data) | ✓ | ✓ | ✓ | | ✓ |
| Approve / reject applications | ✓ | ✓ | ✓ | | |
| Manage members (ID, designation, photo, archive) | ✓ | ✓ | ✓ | | |
| Manage gallery (upload/edit/publish) | ✓ | ✓ | | ✓ | |
| Delete gallery images | ✓ | ✓ | | | |
| Manage content, activities, announcements | ✓ | ✓ | | ✓ | |
| Read contact messages | ✓ | ✓ | ✓ | | |
| Manage users & roles | ✓ | | | | |
| View audit log | ✓ | ✓ | | | |

**Adding more approvers later:** Admin panel → **ব্যবহারকারী** → "নতুন ব্যবহারকারী" → assign the role *সাধারণ সম্পাদক* (or any role with "আবেদন অনুমোদন"). To create a new role (e.g. সভাপতি), go to **ভূমিকা ও অনুমতি** and tick the permissions. Only a Super Admin can do this.

## 6. Membership workflow

1. Visitor fills a 4-step form: ব্যক্তিগত তথ্য → ঠিকানা → পরিচয় ও যোগাযোগ → অঙ্গীকারনামা ও পর্যালোচনা.
2. Server validates (Bangladeshi mobile `01[3-9]XXXXXXXX`; NID 10/13/17 digits or birth reg. 17 digits; age check; required fields), with a honeypot field, a minimum fill time and a per-IP rate limit.
3. Stored with status **অপেক্ষমাণ (Pending)**; tracking number `IJS-A-2026-0001` shown. Duplicate open/approved applications with the same NID/birth reg. are blocked; double-click submits are idempotent.
4. Reviewer may mark **যাচাই চলছে (Under review)**, then **অনুমোদিত** or **প্রত্যাখ্যাত** with a note.
5. Approval runs as **one database transaction**: status change, member record with `IJS-2026-0001`, status history, audit log.
6. The applicant checks status using tracking number + mobile; only status and date are revealed. If an email was given and Resend is configured, emails are sent on submission and on decision (failures never block the workflow; they are logged).
7. Rejected applications are kept with their decision record; a Super Admin can delete them (data-retention period configurable in documentation).

## 7. Data model (Postgres)

`roles`, `role_permissions`, `staff_profiles` (admin users → `auth.users`), `designations`, `activity_categories`, `gallery_images`, `membership_applications`, `application_status_history`, `members`, `announcements`, `site_settings` (key → JSON), `contact_messages`, `audit_logs`, `id_counters` (atomic yearly numbering), `rate_limits`.

- Public visitors can read only published content, published images, and a restricted `public_members` view (photo, name, designation, member ID, and phone only if consented and approved).
- Visitors can never read `membership_applications`; they can only insert through a secure function.

## 8. Gallery — folder-based, automatic

- Supabase Storage bucket `gallery`, real folders `activities/<folder>/` (+ `thumbs/`).
- Admin upload: choose category → select multiple photos → resized and compressed in the browser to WebP (≈1600px, ≈250 KB + 480px thumbnail) → uploaded directly to the category folder → registered in `gallery_images` automatically → appears on the site.
- Captions, publish/unpublish, featured (homepage slider), ordering, delete. Changing the category **moves the file** to the new folder, keeping storage and database in sync.
- **"ফোল্ডার সিঙ্ক"** button: scans each category folder and registers any photo added directly via the Supabase dashboard (as unpublished, for review), and flags database entries whose file is missing.
- Allowed: JPEG/PNG/WebP, ≤10 MB before compression; validated client-side, and enforced by bucket MIME and size limits plus storage RLS (only gallery managers can write).

## 9. Technology

Next.js 16 (App Router, TypeScript) · Tailwind CSS · Supabase JS + SSR auth · Zod validation · Embla carousel + lightbox · `qrcode` (QR generated from the configured Facebook URL) · fonts: Hind Siliguri (body), Noto Serif Bengali (headings).
Tests: Vitest (validation/unit), SQL tests for RLS and approval functions, Playwright end-to-end and responsive checks.
Keep-alive: daily Vercel cron pings the database so the free Supabase project does not pause.

## 10. Design direction

Deep green (#0B5D3B) + gold (#C9A54C) + warm white; the black/grey logo sits on a white circular badge. Subtle 8-point-star geometric pattern in the hero and footer only. Cards with soft shadows, large readable Bengali type (17–18px body), mobile-first, visible focus states, WCAG AA contrast. No heavy animation.

## 11. Implementation phases

1. Project scaffold, design system, database schema + RLS + seed data, local Supabase.
2. Public site: layout, home, about, activities, announcements, contact, privacy, terms.
3. Gallery: public gallery/slider, admin upload/manage, folder sync.
4. Membership: application form, status check, admin review/approval, members, public directory.
5. Admin: dashboard, content/settings, users & roles, audit log, messages.
6. QA: unit, RLS/security, end-to-end, responsive, performance; fix and retest.
7. Deployment guide (Supabase + Vercel step by step), admin manual (Bengali), backup and maintenance guide.

## 12. Acceptance criteria (summary)

- Anonymous request for applications/private member fields returns nothing (tested).
- A Content Editor cannot approve; a Committee Viewer cannot change status (tested at the database level).
- Upload to category X → visible in category X on the public gallery without code changes (tested end to end).
- A submitted application stays Pending until approved; approval creates exactly one member with the next ID (tested, including double-approve).
- Directory shows only active + consented members and never NID, address or unconsented phone (tested).
- All pages are usable at 360px, 768px and 1280px+ with no horizontal scroll (Playwright screenshots).

## 13. Waiting on you (placeholders until provided; all editable in admin)

1. Original logo file (PNG/SVG) — a cleaned crop from the form photo is used temporarily.
2. ~~Facebook Page URL~~ — received.
3. Public contact phone / email / full address.
4. ~~Committee positions~~ — received (12 positions).
5. Activity photos (optional now; can be uploaded via admin after launch).
6. GitHub repository for the code (optional; otherwise delivered as a folder/zip).
