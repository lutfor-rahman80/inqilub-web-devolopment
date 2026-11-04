# Phase 2 — Research, Assessment, Requirements & Plan

ইনকিলাব যুব সংগঠন website · Status: **FOR APPROVAL** · 2026-10-28 · *updated 2026-10-28 with the organization's design decisions (§0 Q9–Q11); where older text below differs, §0 and §10 apply*

This document answers the "Research, Analyze, Improve, and Complete" brief. Nothing described here as *planned* has been implemented yet; everything described as *implemented* was verified in the code and by automated tests on 2026-10-27.

---

## 0. Decisions (answered 2026-10-28)

| # | Question | Answer |
|---|---|---|
| Q1 | Slogan spelling | **“আনতে সুপ্রভাত, পথ দেখাবে ইনকিলাব”** (as on the official form) — unchanged. |
| Q2 | Activity categories | **Keep the 13** existing categories (folders unchanged; display names stay editable in the admin panel). |
| Q3 | English content | I draft English for all fixed organization texts for your review; English for announcements/programs is **optional** and the English site falls back to Bengali (marked) when missing. |
| Q4 | Quiz system | Sanitized demo received (`quiz-site-demo`, visual/design reference with an offline stub backend) — analysed in §7. |
| Q5 | Social media | My choice, informed by research: an admin-managed list of platforms; **only verified URLs are shown** (today only Facebook); other platforms stay hidden until an admin enters a real link. |
| Q6 | Committees | **One committee.** No `committees` table; an optional committee term label (e.g. “২০২৬–২৭”) on the directory. |
| Q7 | Address | General address becomes **“নারায়ণগঞ্জ”** everywhere (brief §5.7). |
| Q8 | Logo *(new)* | The quiz demo contains `assets/logo.jpg` — the full-colour logo (green circle, red ring, black fist, 300×300). **Please confirm it is the official logo**; it will replace the blurry temporary crop (header, favicon, social preview). A larger original (≥ 512 px or SVG) would be better if available. |
| Q9 | Press section name *(2026-10-28)* | The news-coverage / TV-interview section is labelled **“Notice”** — the same English word on **both** Bengali and English pages (menu, page title, admin) — URL `/notice` (`/en/notice`). **“ঘোষণা” stays unchanged** in Bengali; its English label becomes “Announcements” so English pages do not show “Notice” and “Notices” side by side. Internally the table remains `press_items`. |
| Q10 | Design feedback round 1 *(2026-10-28)* | **(a)** The planned slogan/mission band under the hero is **removed** — it repeated the slogan and the objective already shown in the hero. **(b)** Header menu without a “Media ▾” dropdown: হোম · পরিচিতি · কার্যক্রম ▾ (কার্যক্রমের ক্ষেত্র, কর্মসূচি) · গ্যালারি · সদস্যবৃন্দ (when the directory is on) · ঘোষণা · (প্রশ্নোত্তর — mobile drawer only) · যোগাযোগ · (quiz link, if configured) · **Notice — always the last item** in the header, the mobile drawer and the footer quick links. **(c)** Homepage program sections in the order **চলমান → সম্পন্ন → ভবিষ্যৎ** (ongoing → completed → upcoming), laid out as the approved zig-zag **design option 2** (§5.3). **(d)** FAQ: accordion with a “+” icon on the right that becomes “−” when open; the 8 suggested questions are published (admins edit or hide them). **(e)** The old `/press` URL needs **no redirect**: it existed only in unreleased Phase 2 work and was renamed to `/notice` before any deployment (Phase 1 had no press section); `/press` and `/en/press` return 404. |
| Q11 | Homepage hero *(2026-10-28)* | **Design C**: the photos marked “হিরো স্লাইডার” slide as the **full-width hero background** (crossfade, ~6 s each, at most 6), with the organization’s name, slogan, mission and small buttons on the **right** over a darker shade; bottom-left the current photo’s caption (linked program’s title or activity category, at most two lines, with the date always shown in full on its own line, and “এই কার্যক্রম দেখুন”) and the controls on one row (pause first, segmented progress bar whose current segment is always marked, previous/next; on narrow phones previous/next wrap below). Phones: the photo is a band at the top with caption and controls under it, then the text; the caption area keeps a fixed height so nothing moves when the web fonts load. Reading/focus order follows the screen: from 1024px the text (h1, buttons) first, then caption and controls; on phones the slider first. Admin gallery shows which marked photos the homepage shows (first 6 in display order) and why the others do not. No logo in the hero. Without photos: deep green with the pattern and a rosette, inviting visitors to follow the Facebook page. Supersedes “slider left, content right” below. |
| Note | Web research | This environment's network policy blocked all website visits, so the research (§1) relies on search-engine index data only. To repeat it with real page visits, widen **Network access** in the cloud environment settings (environment menu in the session title bar → Edit → a broader access level; steps: https://code.claude.com/docs/en/cloud-environments#network-access) and ask me to re-run it. |

---

## 1. Research findings (Deliverable 1)

**Full report:** [`docs/05-research-report.md`](05-research-report.md) (31 organizations, cross-site patterns, weaknesses, recommendations R1–R22, not-recommended list).

**Method and its limits — read first.** Six research agents (student, political, Islamic, welfare/volunteer, blood donation, education/competition segments) searched for official Bangladeshi organization websites, and a separate agent synthesized the evidence. **None of the websites could be opened**: this cloud environment's network policy blocks direct page loads (every fetch returned a proxy denial, even for control sites), and the independent fact-checker could not reach any of 36 sampled claims. All evidence therefore comes from **search-engine index data** (page titles, URLs, indexed text summaries), graded M (medium) / W (weak), and claims the fact-checker could not find or found contradicted were excluded. Rendered menus, layouts, mobile quality and JavaScript behaviour were **not** observed. To redo the research with real page visits, network access must be widened for this environment (see §0 note), after which I can re-run it.

**Organizations covered (31):** BADHAN, Bangladesh Scouts, Bangladesh Mathematical Olympiad, DU Debating Society, KIN (SUST), BNP, NCP, Awami League, Jamaat-e-Islami, Islami Chhatrashibir, As-Sunnah Foundation, As-Sunnah Trust, Center for Zakat Management, Anjuman Mufidul Islam, Islamic Relief Bangladesh, Islamic Foundation Bangladesh, Bidyanondo, BDRCS, Volunteer for Bangladesh/JAAGO, Roktobondhu, OBHIZATRIK, BYLC, Sandhani, Quantum blood programme, Blood BD, Blood Share BD, Bangladesh Blood Bank (3s-Soft), Al-Markazul Islami, BdPhO, BdBO, Prothom Alo Trust — URLs in the report.

**Key patterns (with example sources in the report):**
- Common menu: পরিচিতি · কার্যক্রম/সেবা · কমিটি · গ্যালারি · নোটিশ/সংবাদ · সহযোগিতা · যুক্ত হোন · যোগাযোগ; mature sites add FAQ, reports, privacy/terms.
- Upcoming vs past events split (Anjuman), open/closed badges on programmes (BYLC), committees labelled by **term** with archives (BdBO, Jamaat, Islamic Foundation).
- Non-political identity stated up front (Al-Markazul Islami); registration status and "beware of misuse of our name" notices (Bidyanondo, BdBO).
- Donations at small orgs = listed bank/bKash/Nagad details; gateways only at large registered bodies (BDRCS, As-Sunnah).
- Blood: established orgs keep donor contacts **internal** with a hotline (BDRCS, BADHAN member area); public directories expose phone numbers/addresses (Roktobondhu) — a privacy anti-pattern.
- Competitions: one page per edition + archives (BdMO, BdBO), admit-card lookups (BdPhO); **no site found offering public roll-number result lookup with verification** — the Seerat quiz is an opportunity.
- Language: `/en` path prefixes (NCP, Shibir, Quantum); half-finished English sections are a frequent failure.

**Common weaknesses to avoid:** stale leadership/news; the same fact (account numbers, counts) differing between pages; old sites left live on subdomains; messy/percent-encoded URLs; spam pages; "under construction" English pages; public personal data; PDF/Google-Form-only processes with no status; results only as PDFs.

**What changes in our plan because of the research:** FAQ page; directory `noindex` and under-18 protection; committee **term** label; structured data (JSON-LD) + WhatsApp/Messenger share links; quiz editions/archive model; trust statements (non-political, official channels only); support/donation, blood and emergency features deliberately staged (Phase 2+) with privacy rules; a list of features **not** recommended (payment gateway, public donor search with phones, zakat collection, forums, shops, separate subdomain microsites, NID uploads).

---

## 2. Existing project assessment (Deliverable 2)

### 2.1 Architecture (verified)

- **Next.js 16** (App Router, TypeScript) + **Tailwind CSS 4** on **Vercel**; **Supabase** (Postgres + Row-Level Security, Auth, Storage). Chosen with you on 2026-10-27 (free tiers).
- 11 SQL migrations: 15 public + 3 private tables, 26 database functions; every table has RLS; status changes only through permission-checked functions.
- Public pages read data with an anonymous client (cacheable, 5-minute ISR + immediate revalidation after admin edits); admin pages use the signed-in user's session so the database enforces permissions again.
- Bengali-only UI (`lang="bn"`), Hind Siliguri + Noto Serif Bengali (self-hosted), deep-green/gold design tokens in `src/app/globals.css`.

> Note: the quiz module uses plain HTML/JS; the main site does **not** — it is a Next.js application. The brief's "avoid unnecessary frameworks/build steps" applies to the quiz module, which should stay plain HTML/JS (§7). Rewriting the main site without a framework would discard tested, working functionality and is not recommended.

### 2.2 Feature status

| Area | Status | Evidence |
|---|---|---|
| Home: hero (dark green, logo on the right), stats card, intro cards, 13 activity cards, featured photo slider, announcements, membership steps, Facebook + QR | ✅ Implemented | `src/app/(site)/page.tsx`; site e2e tests |
| About / লক্ষ্য / উদ্দেশ্য / কেন / activity list | ✅ | `/about`, verbatim-text e2e test |
| Activity categories (13) + category pages with photos | ✅ | `/activities`, `/activities/[slug]` |
| Folder-based gallery (Supabase Storage `activities/<slug>/`), browser compression to WebP, captions, publish, featured, order, move, delete, **folder sync** | ✅ | `/admin/gallery`; gallery e2e + DB tests |
| Lightbox, category filters, pagination, empty states | ✅ | `/gallery` |
| Online membership (4-step form, all paper-form fields + optional email + directory consent), tracking number, status lookup | ✅ | `/membership`, `/membership/status`; membership e2e |
| Review workflow (pending → under review → approved/rejected, reopen), member number on approval, history, email notifications (when Resend configured) | ✅ (email ⚠ not tested with a real provider) | DB tests 33–52 |
| Member directory (consent-gated, privacy enforced by DB constraints), leadership first, search/filter | ✅ | `/members` |
| Admin: dashboard, members (incl. paper-form members, photos), categories, announcements, content, messages, users, roles/permissions, audit log, own account | ✅ | admin e2e |
| Contact form (honeypot, rate limit), privacy policy, terms, 404/error pages, sitemap/robots, keep-alive cron | ✅ | site e2e |
| Security: RLS everywhere, privilege-escalation guards, upload reservations, audit log without personal values, security headers, trusted-IP rate limits | ✅ | 74 pgTAP tests, review rounds |
| **Content-Security-Policy header** | ❌ Not implemented | `next.config.ts` has other headers only |
| **Admin MFA** | ❌ Not enabled | `supabase/config.toml` `[auth.mfa.totp] enroll_enabled = false` |
| **BN/EN language switch** | ❌ Not implemented (Bengali-only was approved earlier) | — |
| **Social media dropdown** | ❌ Only a Facebook link/QR | footer/contact |
| **Activities with status (completed/ongoing/upcoming)** | ❌ Not implemented — only *categories* exist, no dated events | — |
| **Hero redesign** (softer palette, slider left/text right, no hero logo, no stats card) | ❌ Current hero is the one in your screenshot | — |
| **Scroll/reveal animations** | ⚠ Minimal (slider, hover states only) | — |
| **Image target ≤ 200 KB** | ⚠ Current target ≈ 350 KB | `src/lib/gallery/compress.ts` |
| **Committee entity / terms** | ❌ Designations only (your earlier choice) | — |
| **Quiz integration** | ❌ Quiz project not available in this workspace | — |
| Logo | ⚠ Temporary, blurry crop from the form photo | `public/brand/logo.png` |

---

## 3. Feature gap analysis (Deliverable 3)

Legend — **Brief** = your Phase-2 brief; **R#** = research recommendation in `docs/05-research-report.md`.

### 3.1 Existing features to improve

| Feature | Current | Source | Action | Phase |
|---|---|---|---|---|
| Hero | Dark green, logo right | Brief §5.1–5.2 | Soft palette; slider left, content right; **no hero logo** | 1 |
| Stats card “১২/১৩ কার্যক্রমের ক্ষেত্র” | Present | Brief §5.3 | Remove (no numbers). The slogan/mission band planned in its place was dropped (Q10a) | 1 |
| Photo slider | Lower on page | Brief §5.4 | Move into hero; pause/play, swipe, keyboard, reduced motion, 1600×600 crop, empty fallback | 1 |
| General address | “কাশীপুর, ফতুল্লা, নারায়ণগঞ্জ” in 6 files + DB | Brief §5.7 | → “নারায়ণগঞ্জ” everywhere (settings, defaults, metadata, emails, privacy text) | 1 |
| Image size | ≈ 350 KB target | Brief §9.3 | ≈ 200 KB target; lazy loading kept | 1 |
| Member directory | Consent-gated | R5 | `noindex`; members under 18 hidden unless guardian consent recorded; committee term label (e.g. “কার্যনির্বাহী কমিটি ২০২৬–২৭”) | 1 |
| Share buttons | Facebook + copy link | R18 | + WhatsApp, Messenger; no Facebook SDK | 1 |
| Security headers | No CSP; MFA off | Brief §12 | CSP; TOTP MFA required for super admins (optional for others) | 1 |
| Logo | Blurry temporary crop | Q8 | Official colour logo (pending confirmation) | 1 |
| ঘোষণা (Announcements) | Single list | R8 | Categories + filter | 2 |

### 3.2 New features

| Feature | Source | Who uses it | Phase |
|---|---|---|---|
| **কর্মসূচি (programs) with computed status** + homepage সম্পন্ন/চলমান/ভবিষ্যৎ sections + `/programs` pages + admin CRUD + photos linked to a program | Brief §5.5, R2 | public; content admins | **1** |
| **BN/EN switch** (`/` BN, `/en/…` EN; dictionaries; optional English content with marked Bengali fallback; `hreflang`) | Brief §6.1, R17 | public | **1** |
| **Social media dropdown** (admin-managed; only verified links shown) | Brief §6.2, R18 | public | **1** |
| **Animation system** (CSS-first, reduced-motion safe) | Brief §7 | public | **1** |
| **FAQ** (admin-managed, bilingual) | R16 | public | **1** |
| **Trust statements**: non-political/official-channels notice in footer/about | R21 | public | **1** |
| **Quiz menu link** (URL from settings; hidden until set) | Brief §10, R19 | public | **1** |
| JSON-LD (Organization, Event) + OG locale | R20 | search/social | **1** |
| **Notice** (press section; table `press_items`) — news coverage of activities and TV/video interviews: public `/notice` (`/en/notice`; filters: news · interview · video report; YouTube click-to-load), admin CRUD, links to related programs *(requested by the organization 2026-10-28; moved up from research R7 Phase 3; named “Notice” per Q9)* | Org request | public, media | **1** |
| Committee archive (past terms) | R4 | public | 2 |
| Quiz integration (editions, institutions, Supabase Auth, security fixes QZ-1…6) | Brief §10, R19 | quiz committee, students | 2 |
| Volunteer sign-up per program | R9 | members/public | 2 |
| Yearly program figures + annual activity report page | R3, R15 | public, supporters | 2 |
| সহযোগিতা page (in-kind first; manual bKash/Nagad only after registration/bank-account conditions) | R11 | donors, treasurer | 2 |
| Internal blood-donor register + blood-request queue (needs a real duty roster) | R12, R13 | coordinators | 2 |
| জরুরি সহায়তা page (verified numbers only) | R13 | public | 2 |
| Educational resources (quiz syllabus, past questions) | R14 | students | 2 |
| Attendance records/certificates, general help requests, click-to-load Facebook embed | R10, R13, R18 | — | 3 |
| **Not recommended:** payment gateway, recurring donations, crowdfunding bars, international donations, zakat collection, public donor search with phone numbers, NID uploads, forums, shop, subdomain microsites, hand-typed counters | R 4.23 | — | — |

---

## 4. Recommended website structure (Deliverable 4)

Bengali at `/…`, English at `/en/…` (same structure).

```
/                       Home: hero (slider + intro) · পরিচিতি · কার্যক্রমের ক্ষেত্র
                        · চলমান / সম্পন্ন / ভবিষ্যৎ কর্মসূচি (zig-zag, option 2) · photo highlights · ঘোষণা
                        · সদস্য হোন CTA · Facebook/social
/about                  পরিচিতি, লক্ষ্য, উদ্দেশ্য, কেন, values, committee summary link
/activities             কার্যক্রমের ক্ষেত্র (13 categories)          [existing]
/activities/[slug]      category page: description, its programs, its photos  [existing + programs]
/programs               কর্মসূচি: tabs সম্পন্ন · চলমান · আসন্ন (filter by category, year)   [new]
/programs/[slug]        program detail: date, place, description, photos, share   [new]
/gallery                photo gallery (category filter, lightbox)   [existing]
/members                committee & member directory (consent-gated)   [existing]
/announcements(/[id])   ঘোষণা (English: Announcements)   [existing]
/membership             online application · /membership/status · /membership/terms   [existing]
/contact                contact, social links, QR, contact form   [existing]
/privacy                privacy policy   [existing]
/faq                    প্রশ্নোত্তর (admin-managed, bilingual)   [new]
/notice                 Notice (press section): news reports + TV interviews (links to the outlets)   [new]
                        (no /press URL and no redirect — see Q10e)
/quiz  → external       “সীরাত কুইজ” (link to the quiz site; see §7)   [new link]
/admin/…                admin panel (Bengali), + /admin/programs, social links in content   [extended]
```

Header (Q10b): logo + name · হোম · পরিচিতি · কার্যক্রম ▾ (কার্যক্রমের ক্ষেত্র, কর্মসূচি) · গ্যালারি · সদস্যবৃন্দ · ঘোষণা · যোগাযোগ · সীরাত কুইজ (only when configured) · **Notice (always last)** · **social ▾** · **BN | EN** · **সদস্য হোন**. No “Media ▾” dropdown. On mobile: one drawer with the same items plus প্রশ্নোত্তর (before যোগাযোগ), Notice last, language and social at the bottom. The footer quick links follow the same order and also end with Notice.

---

## 5. Frontend requirements (Deliverable 5)

### 5.1 Design system v2 (softer)

| Token | Value | Use |
|---|---|---|
| `cream` | `#FBF8F1` | page background |
| `sage-50 / 100 / 200` | `#F4F7F2` / `#E7EEE4` / `#D2DFCC` | hero and section backgrounds, cards on cream |
| `sage-500` | `#7D9A74` | decorative lines and large icons only (2.9:1 — never body text) |
| `forest-600` | `#3E6B52` | buttons, links (5.8:1 on cream, 5.7:1 on sage-50; white on it 6.1:1) |
| `forest-800` | `#24473A` | headings, primary text accents (9.7:1 on cream, 8.7:1 on sage-100) |
| `ink` | `#1C2421` | body text |
| `gold-500 / 700 / 800` | `#C9A54C` / `#8A6C22` / `#6B5418` | accents; text: gold-700 on cream only (4.7:1), gold-800 on sage (gold-700 on sage-100 is 4.2:1 — fails) |

- Deep green is reserved for small emphasis (footer, buttons) — no full-width dark hero.
- The geometric pattern stays only as a faint texture (≤ 6% opacity) in the hero and footer.
- Fonts: Hind Siliguri (Bengali UI), Noto Serif Bengali (headings), Inter or system UI for English text; 8-px spacing grid; card radius 16 px; one soft shadow scale.
- All colour pairs used for text must pass WCAG AA (checked by axe in e2e tests).

### 5.2 Hero (desktop: two columns)

- **Left (≈ 55%)**: activity photo slider — 16:9/1600×600-friendly frame with rounded corners, caption + category chip, prev/next, dots, **pause/play**, swipe, keyboard (←/→ when focused), autoplay 6 s, paused on hover/focus and under `prefers-reduced-motion`; source = gallery images marked “হিরো স্লাইডার” (today's *featured* flag, renamed); fallback card when no photos.
- **Right (≈ 45%)**: eyebrow “একটি অরাজনৈতিক সামাজিক যুব সংগঠন”, organization name (large), slogan, one-sentence mission (লক্ষ্য), buttons “আমাদের কার্যক্রম” and “সদস্য হোন”, location “নারায়ণগঞ্জ”.
- **No logo in the hero** (logo stays in the header).
- Mobile: text first (name, slogan, buttons), slider below at full width; buttons full-width; no horizontal scroll at 360 px.
- The old stats card is removed. *(The slogan/mission band originally planned in its place was dropped on 2026-10-28 — Q10a — because the hero already shows the slogan and the objective.)* No numbers.

### 5.3 Activity status sections (home)

Three sections in the organization's order (decision 2026-10-28, `HOME_STATUS_ORDER` in `src/lib/programs/status.ts`): **চলমান** (ongoing) → **সম্পন্ন** (completed) → **ভবিষ্যৎ** (upcoming). Each shows up to 3 cards (photo or category icon tile, title, category chip, date/range, place, status badge, “বিস্তারিত”), the total number of published programs in that status, and a “সব দেখুন” link to `/programs?status=…`. Sections with no items are hidden on the home page; `/programs` shows a friendly empty state.

Layout — **zig-zag, design option 2 (approved 2026-10-28)**: from 1024 px each section has two columns, a title block (icon, eyebrow, heading, one-line intro, total count, “সব দেখুন”) and the cards; the title block alternates sides (first visible section: title on the start side, next: end side, …) and a thin gold line with a star node links the sections; backgrounds alternate so the last section is plain. Exactly one program is shown as a wide horizontal card, two or more as a scrolling row with previous/next buttons. Below 1024 px the title block sits above the cards. Implementation: `src/components/home/program-sections.tsx`, `program-rail.tsx`, `src/lib/programs/home-sections.ts`.

### 5.4 Navigation

- Active-page underline (gold), hover tint, focus ring; dropdowns (Activities, Social, Language on mobile) are `button` + `aria-expanded` + menu list, close on outside click/Escape, return focus, arrow-key navigation; 44-px touch targets.
- **Language switch** `BN | EN` (segmented control) maps the current path to its counterpart (`/members` ↔ `/en/members`), preserves query strings, and remembers the choice in a cookie only for the next visit to `/`.
- **Social ▾** lists only platforms with a saved URL (icon + label), opens in a new tab with `rel="noopener noreferrer"`.

### 5.5 Animation guidelines

- CSS-first: hover elevation on cards (translateY −2 px + shadow), button press scale 0.98, nav underline slide, dropdown fade/scale 120–160 ms, slider cross-fade/slide 400–500 ms.
- **Section reveal** with CSS scroll-driven animations (`animation-timeline: view()`) inside `@supports`; browsers without support simply show content (no JS, no layout shift). Content is never hidden before animation.
- Counters only for verified numbers (none on the home page now).
- Everything disabled under `prefers-reduced-motion: reduce`; no parallax, no continuous decorative motion.

### 5.6 Responsive & accessibility

Breakpoints verified in tests at 360, 375, 390, 768, 1024, 1280, 1440 px; no horizontal scroll; WCAG 2.2 AA (contrast, focus visible, target size ≥ 24 px/44 px for primary controls, keyboard operable slider/dropdowns/lightbox, `lang` attribute per language, alt text required on upload with caption fallback).

---

## 6. Backend requirements (Deliverable 6)

### 6.1 New / changed data

| Entity | Purpose | Key fields | Access |
|---|---|---|---|
| `programs` (কর্মসূচি) **new** | Dated activities for completed/ongoing/upcoming sections | `slug`, `category_id` → activity_categories, `title_bn/_en`, `summary_bn/_en`, `body_bn/_en`, `starts_on`, `ends_on`, `location_bn/_en` (optional), `status_override` (null/auto, `cancelled`, `postponed`), `cover_image_id`, `is_published`, `sort_order`, audit columns | public: published only; write: `content.manage` |
| `gallery_images` | add optional `program_id` (photos of a specific event); `is_featured` → shown as “হিরো স্লাইডার” | | existing RLS |
| `activity_categories`, `announcements`, `designations` | add `*_en` text columns | | existing RLS |
| `site_settings` | add English values (`about_en`, `organization_en`, …) and `social_links` (platform, url — validated against an allow-list of hosts) | | existing RLS |
| `members` / `site_settings` | committee term label (one committee; e.g. “কার্যনির্বাহী কমিটি ২০২৬–২৭”), `guardian_consent` flag for members under 18 | | existing |
| `faqs` **new** | Bilingual FAQ | `question_bn/_en`, `answer_bn/_en`, `sort_order`, `is_published` | public: published; write: `content.manage` |
| `site_settings.social_links` / `quiz_url` | Social dropdown + quiz link | platform from an allow-list (facebook, youtube, instagram, tiktok, x, whatsapp channel), https URL on that platform's host | public read; `content.manage` |

Status is **computed**, not typed: `upcoming` if `starts_on` > today (Asia/Dhaka), `ongoing` if today within range, `completed` if `ends_on` (or `starts_on`) < today; `status_override` covers cancelled/postponed. This prevents stale “upcoming” labels.

### 6.2 Other backend work

- English fallbacks in queries (`coalesce(title_en, title_bn)` with a flag so the UI can mark Bengali fallback).
- Image pipeline: full ≤ 1600 px, **target ≤ 200 KB** WebP; hero rendering crops via CSS `object-fit: cover` (originals keep their composition); thumbnails 480 px.
- CSP: `default-src 'self'`; `img-src 'self' data: <supabase-host>`; `connect-src 'self' <supabase-host>`; `frame-src https://www.google.com` (map embed only); `object-src 'none'`; `base-uri 'self'`; `frame-ancestors 'none'`; `form-action 'self'`; scripts `'self' 'unsafe-inline'` (required for statically generated Next.js pages without per-request nonces — documented limitation).
- MFA: enable Supabase TOTP; require it for super admins (and optionally all staff) before admin pages load.
- Retention: rejected applications auto-flagged after 12 months for deletion review (admin confirms); contact messages deletable; documented in privacy policy.
- Backups: unchanged (monthly DB dump + storage script).

---

## 7. Quiz integration specification (Deliverable 7)

**Source inspected:** `quiz-site-demo` (sanitized demo, received 2026-10-28): `student.html` (public, 2,305 lines), `index.html` (admin, 4,783 lines), `assets/css/header.css`, `assets/css/slider.css`, `assets/js/slider.js`, `assets/round2_config.json`, images. The real database URL/key, phone numbers, photos and student data were replaced, and **the backend is an offline stub** — so the real RLS policies, function bodies, rate limits and Vercel headers are **not determinable** and must be checked in the real project (especially `supabase_setup.sql`, referenced at `index.html:4292`). Line references below are to the demo files.

### 7.1 What exists (verified in the demo)

| Area | Observed |
|---|---|
| Public page (`student.html`) | Header (logo, event badge “সীরাত কুইজ - ২০২৬ইং”, 2 helplines, QR → Facebook), 9-slide photo slider (autoplay 5 s, swipe, keyboard, reduced-motion), search card (roll + institution combobox), result states: **উত্তীর্ণ** + congratulation banner + print (A4, card only, print stylesheet), not selected → encouraging banner **plus a red “অনুত্তীর্ণ” pill**, results-not-published, roll/institution not found; institution roll list (serial, roll, name); helpline card |
| Admin page (`index.html`) | Filters (search, institution, minimum marks, gender), **per-gender cutoffs** (boys/girls), show/hide mobile (server-gated), show/hide marks (CSS only), add/edit result (`<dialog>`), round-2 marks entry (“save & next”), merit sheet (combined, sorted by total) when `round2_enabled`, PDF download (html2canvas + jsPDF, only when a filter is active), toasts |
| Data model (inferred) | One flat table `quiz_results` (id, roll, name, **institution as free text**, marks, round2_marks, total_marks, mobile [comma-joined], gender ‘ছেলে’/‘মেয়ে’); key/value `quiz_settings` (`round2_cutoff_boys`, `round2_cutoff_girls`, `round2_enabled`); no year/edition column; `round2_config.json` = fallback cutoffs `{"boys":20,"girls":20}` (code defaults say girls 24 — inconsistent) |
| Backend calls | Tables `quiz_results`, `quiz_settings` (+ Realtime); RPCs `get_student_result`, `verify_admin`, `admin_list_results(_v2)`, `admin_get_mobile`, `admin_set_cutoffs`, `add_result`, `update_result`, `admin_set_round2` |
| Design | Tokens `#047857/#064e3b/#10b981`, gold `#fbbf24` (the declared `#d97706` is unused), slate neutrals, radii 8/12/16, Noto Sans Bengali + Hind Siliguri via Google Fonts; relative asset paths |

**Spec gaps:** merit-list flag absent (tied to round 2); no UI to toggle `round2_enabled`; full-list PDF not possible; public page sends the roll without BN→EN digit normalization (relies on server); admin UI uses “নম্বর” (spec: “নাম্বার”) incl. PDF headers; “নূন্যতম” misspelt; public login is a `div` overlay, not `<dialog>`; `alert()` instead of toast on the public page.

### 7.2 Security findings (must be fixed before or during integration)

| # | Severity | Finding (verified in the demo code) |
|---|---|---|
| QZ-1 | **High** | **Shared admin password**, no Supabase Auth: after `verify_admin`, the password is kept **in plain text in `sessionStorage`** (`student.html:2265`) and sent with every admin RPC (`p_password`). Access control rests entirely on the server re-checking the password in each function (not visible). |
| QZ-2 | **High** | **Stored XSS**: `onclick="selectStudentRoll('${escapeHtml(s.roll)}')"` (`student.html:1947`). HTML-escaping (`'`→`&#39;`) is decoded before the attribute's JavaScript runs, so a crafted roll value executes script on the public page — and could read the admin password from QZ-1 in the same tab. Rolls have no format validation. |
| QZ-3 | **High (privacy)** | **Bulk roster exposure**: the public page downloads the whole `institution` column on every load and, for institution-only searches, queries `.ilike('institution', '%' + input + '%')` without escaping `%`/`_` (`student.html:1849-1856`) — typing `%` would return every participant's name and roll (mostly minors), if anonymous SELECT is allowed as the stub suggests. |
| QZ-4 | Medium | Third-party scripts (html2canvas 1.4.1, jsPDF 2.5.1) pinned but **without SRI**, render-blocking; jsPDF 2.5.1 predates published advisories — upgrade. supabase-js version unknown. |
| QZ-5 | Medium | Every public visitor opens a Realtime websocket and rescans the table — load spike risk on result day (free-tier connection limits). |
| QZ-6 | Low | Gender values mix decomposed/precomposed “য়” (no NFC normalization) — girls could silently get the boys' cutoff. |

### 7.3 Integration options

| Option | How | Verdict |
|---|---|---|
| **A. Separate site, linked** | Quiz stays its own repo + Vercel project at `quiz.<domain>`; main site adds “সীরাত কুইজ” to the menu (and a home card during competitions); shared design tokens | **Recommended for Phase 1** — zero risk to either system |
| B. Same domain path (`/quiz/…` rewrite) | Works only with a trailing slash (relative paths) and after renaming `index.html` (admin) → `admin.html`; needs merged CSP/headers | Possible later; no strong benefit |
| C. Merge backend into the main Supabase project (`quiz` schema, Supabase Auth + `quiz.manage` permission, MFA) | Fixes QZ-1 properly, one login for staff, frees a free-tier project slot | **Recommended for Phase 2**, after backups and a rehearsal on a copy; requires the real `supabase_setup.sql` and data |

The quiz front-end stays **plain HTML/CSS/vanilla JS** (no framework added). Only security and data-model changes touch it.

### 7.4 Target model for annual competitions (Phase 2)

- `quiz.editions` (slug e.g. `seerat-quiz-2026`, title, year, status, round-2 cutoffs per gender, flags `round2_enabled`, `merit_enabled`, `results_published`, `show_marks_public`)
- `quiz.institutions` (id, name — removes free-text spelling variants)
- `quiz.participants` (edition_id, institution_id, roll, name, gender code, marks_r1, marks_r2, guardian_mobile [private]) — unique (edition_id, institution_id, roll)
- Public RPCs only: `list_institutions(edition)`, `list_rolls(edition, institution_id)` (roll numbers; names only if you decide so), `get_result(edition, institution_id, roll)` — exact match, rate-limited; no anonymous table access, no Realtime for visitors.
- Admin: Supabase Auth sessions + `quiz.manage` permission + MFA; no passwords in RPC parameters; delegated event listeners (no inline handlers), CSP, SRI.

### 7.5 Before integrating — needed from you
The real quiz repository (or `supabase_setup.sql` and the real `vercel.json`), access to a **copy** of the database for rehearsal, and a decision on whether participants' **names** may appear in public roll lists.

---

## 8. Prioritized roadmap (Deliverable 8)

| Phase | Scope |
|---|---|
| **Phase 1 — Essential (next build)** | Design system v2 + homepage redesign (hero slider left / content right, no hero logo, intro, categories, **চলমান / সম্পন্ন / ভবিষ্যৎ কর্মসূচি** (zig-zag), photos, announcements, join CTA); **কর্মসূচি** (programs) public pages + admin; BN/EN switching across all public pages (UI + organization texts + optional content translations); header with language switch, social dropdown, activities dropdown, quiz link; animation system; address → “নারায়ণগঞ্জ”; ≤ 200 KB images; FAQ; trust statements; directory `noindex` + under-18 rule + committee term; share links + JSON-LD; CSP; admin MFA; official logo; full test pass |
| **Phase 2 — Important** | Quiz integration (security fixes + annual editions model + shared admin login); committee archive; announcement (ঘোষণা) categories; volunteer sign-up per program; yearly figures + annual report; সহযোগিতা page (after registration check); blood-donor register + request queue (with duty roster); emergency page; educational resources |
| **Phase 3 — Optional** | Attendance/certificates, general help requests, click-to-load Facebook embed, SMS OTP, audited-accounts page |

**Urgent, independent of phases:** if the live quiz code matches the demo, QZ-2 (stored XSS) and QZ-3 (roster exposure) should be patched in the live quiz soon — I can prepare the patch once you share the real quiz repository.

---

## 9. Implementation plan (Deliverable 9)

Delivered as multi-agent build → independent review → fix rounds (as in Phase 1), with checkpoints for your review.

| Step | Work | Depends on | Verification |
|---|---|---|---|
| 1 | Restart local environment; baseline: unit, DB (74 pgTAP), e2e (99) all green | — | test reports |
| 2 | Migrations: `programs`, `faqs`, `program_id` on gallery images, `_en` columns, social/quiz/committee-term settings, guardian consent; RLS + new pgTAP tests | — | `npm run test:db` |
| 3 | i18n foundation: `/en` routing (proxy rewrite, BN default), typed dictionaries, `lang`/`hreflang`, path mapping, sitemap per language | 2 | unit + e2e |
| 4 | Design system v2 tokens + shared components (buttons, cards, badges, dropdown menu, segmented language control, reveal utilities) | — | axe contrast checks |
| 5 | Header & footer (language switch, social dropdown, activities dropdown, quiz link, trust line) | 3, 4 | keyboard + mobile e2e |
| 6 | Homepage redesign (hero slider + content, sections incl. three status sections; slogan band later dropped — Q10a) | 2, 4, 5 | screenshots 360–1440 px + e2e |
| 7 | Programs: public list/detail, admin CRUD, link photos; FAQ page + admin | 2 | e2e |
| 8 | English: dictionaries for every public page; English drafts of organization texts → **your review**; admin fields for optional English | 3 | e2e BN/EN |
| 9 | Address change, image target, directory rules, JSON-LD/share, CSP, MFA, official logo | 4, 6 | header/CSP check, e2e |
| 10 | Independent security + UX/accessibility review; fixes; full regression on desktop + mobile and a production build | all | reports |
| 11 | Docs: admin manual (programs, English fields, social links, FAQ, MFA), deployment guide (CSP, MFA) | all | — |

Estimated scope: roughly the size of the original build (most work is in i18n and the homepage). Risks: English review turnaround (mitigated by Bengali fallback), CSP compatibility with Next.js inline scripts (documented trade-off), container restarts during long runs (resumable workflows).

---

## 10. Final requirements specification — Phase 1 (Deliverable 10)

Each item lists its acceptance criteria; Phase 1 is complete only when all are verified by tests or recorded manual checks.

**F1 Homepage.** Hero has no logo; on ≥ 1024 px the slider is in the left column and the name/slogan/mission/buttons in the right column; on ≤ 768 px content appears first, slider below; no horizontal scroll at 360 px. The stats card is gone and there is **no slogan band** (Q10a: the slogan “আনতে সুপ্রভাত, পথ দেখাবে ইনকিলাব” and the objective appear once, in the hero). Sections in order: hero · পরিচিতি · কার্যক্রমের ক্ষেত্র · the program (কর্মসূচি) sections · ছবি · ঘোষণা · সদস্য হোন · social. Program sections in the decided order **চলমান → সম্পন্ন → ভবিষ্যৎ**, in the zig-zag layout of design option 2 (§5.3: title block and cards side by side from 1024 px with alternating sides, title above cards below 1024 px, total count and “সব দেখুন” per section). Empty status sections are hidden. No invented numbers.

**F2 Hero slider.** Source: published images flagged for the hero; autoplay 6 s; prev/next/dots/pause buttons with Bengali/English labels; swipe; ←/→ keys; pauses on hover/focus/hidden tab; no autoplay under reduced motion; images cropped with `object-fit: cover`, lazy except the first; fallback card with no images.

**F3 Programs (কর্মসূচি).** Admin (`content.manage`) can create/edit/publish/unpublish/delete programs with category, BN title/summary/body (required), EN fields (optional), start/end dates, location, cover photo, status override (cancelled/postponed); status is computed from dates in Asia/Dhaka; `/programs` filters by status, category and year; `/programs/[slug]` shows details, photos linked to the program, share links (Facebook, WhatsApp, Messenger, copy). Public sees only published programs (RLS + test).

**F4 Language.** `/…` is Bengali, `/en/…` English for every public page; the switch keeps the current page and query; all UI strings come from typed dictionaries (build fails on a missing key); organization texts have reviewed English; content without English shows the Bengali text marked `lang="bn"`; numbers use Bengali digits only in Bengali; `hreflang` + sitemap entries for both; admin panel stays Bengali; form drafts survive a language switch (session draft).

**F5 Header.** Menu order per Q10b — no “Media ▾” dropdown; গ্যালারি and Notice are top-level links; **Notice is the last item** in the header, the mobile drawer and the footer quick links (also when the quiz link is shown, which goes just before it); প্রশ্নোত্তর appears in the mobile drawer and the footer, not in the desktop bar. Social dropdown lists only saved, allow-listed URLs (button + menu, Escape/outside click closes, arrow keys, focus return, 44-px targets); hidden entirely if no links; language switch visible on desktop and in the mobile drawer; quiz link shown only when a quiz URL is set.

**F6 Design & animation.** Tokens per §5.1; every text/background pair used passes WCAG AA (axe in e2e); reveal animations via CSS only, content visible without animation support; no animation under reduced motion; no layout shift from animations (CLS check).

**F7 Address.** No occurrence of “কাশীপুর, ফতুল্লা” in public HTML, metadata, emails or settings defaults (test greps rendered pages).

**F8 Images.** New uploads ≤ ~200 KB for typical photos (≤ 1600 px); thumbnails 480 px; alt text = caption or category name.

**F9 Directory & privacy.** `/members` has `noindex`; members under 18 (by date of birth) are not listed unless guardian consent is recorded; committee term label shown; no phone/NID/address in public HTML (existing tests extended).

**F10 FAQ & trust.** Admin-managed bilingual FAQ, shown as an accordion with a “+” icon on the right that turns into “−” when open (keyboard operable); the 8 suggested questions are published, and the empty state remains for when nothing is published; footer/about state the non-political identity and that the organization uses only the channels listed on the website.

**F11 Security.** CSP header on all pages (policy in §6.2) without breaking any page (e2e console check); TOTP MFA enrolment page; super admins cannot reach admin pages without a verified second factor; all existing 74 DB tests + new tests pass; independent security review finds no unresolved high-severity issue.

**F12 Quiz link & logo.** Nav item “সীরাত কুইজ” → configured URL (new tab); official logo used in header, favicon, social preview (pending confirmation).

**F14 Notice (press section).** `/notice` (`/en/notice`) lists published items newest first with kind filters; each item shows outlet, date, kind, title, optional summary and related program, and links to the original (https only, new tab); YouTube items show a thumbnail and play only after a click (youtube-nocookie); admins (`content.manage`) manage items; invalid or non-https links are refused by the database (tests). `/press` is not a route and is not redirected (it was never public — Q10e).

**F13 Quality gates.** TypeScript and lint clean; unit, DB and e2e suites pass on desktop and mobile; production build passes; screenshots at 360, 390, 768, 1024, 1440 px reviewed; documentation updated.
