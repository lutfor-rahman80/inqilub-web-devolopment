OVERVIEW
This project is the website of ইনকিলাব যুব সংগঠন with a quiz feature ("সীরাত কুইজ"). The quiz is held every year and each year has a 1st and a 2nd round. Do these three jobs in this order:
  Part 1: fix two UI problems on the admin quiz page.
  Part 2: make the student result page (/quiz) look and behave like my old site's result page.
  Part 3: run a security review of the whole quiz feature, and fix the clear problems.

STACK (read this first)
- The admin panel is a Next.js / React / TypeScript app (server components, client components with "use client", server actions, Supabase SSR).
- The student result page /quiz is NOT a React page. It is the static file public/quiz/student.html (plain HTML + CSS + vanilla JS, loading Supabase from a CDN), served through Next.js rewrites. Edit that file directly. Do not rebuild it as a React component.
- I attach my OLD site's student page as old-student.html. It is the visual reference for Part 2. Do not confuse it with the project's own public/quiz/student.html.

HOW TO WORK
- Find the real cause of each problem in the code and fix that cause. Do not guess and do not patch around it with hard-coded offsets.
- Keep the existing look and feel of the admin panel. Change only what is listed. Do not change other headings, texts, buttons or features unless a part says so.
- Keep everything that already works (the year-based data model, the year and round fields, the existing security rules). Do not change the admin pages in Part 2.
- When you are done, run the project's lint and type checks and the app. Open the pages in the browser at about 1920px and about 390px width and send me before/after screenshots.

==================================================
PART 1: ADMIN QUIZ PAGE (http://localhost:3000/admin/quiz?year=2026)
==================================================

PROBLEM A: The year card is not aligned
Where: the top card of the page with the heading "কুইজের সাল".
What is wrong, as it looks now:
1. The left group ("কুইজের সাল" label + year select + the helper text "এখন ২০২৬ সালের কুইজ পরিচালনা করছেন। এই পেজের সব তথ্য ও কাজ শুধু এই সালেই প্রযোজ্য।") and the right group ("নতুন সাল যোগ করুন" label + input with placeholder "যেমন: ২০২৭" + the "+ যোগ করুন" button) do not line up.
2. The two labels are at different heights. The right label sits about 30px lower than the left one.
3. The select is taller (about 50px) than the input and the button (about 44px), and their top and bottom edges do not match. The input and the button are also lower than the select.
4. The helper text under the select makes the left group taller than the right group, so the whole row looks uneven.
Expected:
- The labels of both groups on the same line, and the select, the input and the button on the same row with the same height (use the same height as the other inputs on this page, for example the cut-off inputs below).
- The helper text must not push the right group out of line. Put it below the row, or build the layout so that the two groups stay aligned regardless of the helper text.
- Good spacing and no layout shift when the year changes or when an error message appears under the new-year input.
- On mobile (about 390px), stack the groups in a clean column, with the full-width select, input and button, and nothing overflowing.

PROBLEM B: The settings heading must be generic and show the selected year
Where: the heading of the cut-off card, currently "২য় রাউন্ড সেটিংস — ২০২৬".
Change it to: "কুইজ সেটিংস - {selected year}ইং", with the year in Bengali digits and always taken from the selected year. For example "কুইজ সেটিংস - ২০২৬ইং", and when the admin switches to 2025 it reads "কুইজ সেটিংস - ২০২৫ইং". Never hard-code the year.
- Keep the subtitle under it as it is.
- Make sure the heading has a normal gap above the subtitle. Right now the two lines sit very close together.
- Do not change the buttons (such as "২য় রাউন্ড চালু করুন"). Do not change other headings in this task.

==================================================
PART 2: STUDENT RESULT PAGE /quiz (file: public/quiz/student.html)
==================================================
GOAL: The page must look and behave exactly like the result page of my old site (old-student.html, which is from https://siratquiz.vercel.app/student). The old file is the single source of truth. Port its real CSS and markup. Do not re-design, re-interpret or "improve" it. Earlier attempts looked different because the styles were guessed instead of copied.

RULES FOR THIS PART
1. Open old-student.html and copy the exact CSS values, class structure and texts for the parts listed below. The values in this prompt are copied from that file. If anything differs, the file wins.
2. Both files are static HTML, so bring the old CSS and markup over as they are, and keep the new data calls, the new year and round fields and the year-based logic that the current public/quiz/student.html already has.
3. Do NOT bring over the old data and security logic: the old admin login modal and the "এডমিন" footer link, the direct Supabase table queries, the localStorage cut-off cache, the realtime listener, and the fixed "২০২৬ইং" text. The page must keep using the current year-scoped RPC/data layer.
4. This page runs fully in the browser with the public (anon) Supabase key, so every protection must live in the database (RLS and the RPC function), not in this file.
5. Load the same Google Fonts as the old page (Noto Sans Bengali and Hind Siliguri, weights 400/500/600/700). Body font stack: 'Noto Sans Bengali', 'Hind Siliguri', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif.
6. Keep the existing dark-green header and the photo slider of the page. They already match.
7. Keep my new "সাল" (year) and "রাউন্ড" (round) fields, and style them with the same classes as the old form fields.
8. When using inline event handlers (onclick) with data values, avoid string-concatenated JS. Use addEventListener and data- attributes.

DESIGN TOKENS (from :root in the old file)
--primary #047857; --primary-dark #064e3b; --primary-light #10b981; --primary-subtle #ecfdf5; --bg #f8fafc (page background); --card-bg #ffffff; --text #0f172a; --text-muted #475569; --border #e2e8f0; --danger #dc2626; --danger-subtle #fef2f2; --shadow-lg 0 10px 15px -3px rgba(0,0,0,.08), 0 4px 6px -4px rgba(0,0,0,.04); --shadow-md 0 4px 6px -1px rgba(0,0,0,.07), 0 2px 4px -2px rgba(0,0,0,.05); radius: 8px / 12px (md) / 16px (lg) / 9999px (full). body line-height 1.6, min-height 100vh.

PAGE LAYOUT
- .main-content padding 20px 0 48px. The search card, the result area and the helpline card all live inside a wrapper with max-width 720px, centered (.search-card-wrapper). The current new card is only about 520px wide, so it must become 720px.
- Cards: white, border 1px solid #e2e8f0, radius 16px, shadow-lg.

SEARCH CARD (.search-card): padding 28px 24px, text-align center
- Title "প্রতিযোগিতার ফলাফল দেখুন": 1.35rem, weight 700, color #064e3b, margin-bottom 6px. It sits directly on the white card. There is no tinted band and no black heading.
- Subtitle: 0.92rem, color #475569, line-height 1.7, margin-bottom 24px. Text: "রেজাল্ট দেখতে আপনার শিক্ষাপ্রতিষ্ঠান নির্বাচন করুন এবং রোল নাম্বার দিয়ে সার্চ বাটনে ক্লিক করুন".
- Hint box (.search-card-hint): margin -10px 0 22px, padding 8px 12px, font 0.84rem, line-height 1.6, centered, color #92400e, background #fffbeb, border 1px solid #fde68a, radius 8px. Text: "রোল নাম্বার ভুলে গেলে বা হারিয়ে গেলে শুধু শিক্ষাপ্রতিষ্ঠানের নাম দিয়ে সার্চ করে লিস্ট থেকে আপনার রোল নাম্বার খুঁজে আবার সার্চ করুন".
- Form (.search-form): flex column, gap 16px. Each .form-group is text-align left.
- Labels: block, 0.95rem, weight 600, color #334155, margin-bottom 6px. Required asterisk: red (#dc2626), margin-left 2px. The roll label is only "রোল নাম্বার". Remove the "(ঐচ্ছিক)" suffix the new page added.
- Inputs and selects (.form-input): width 100%, height 48px, padding 10px 16px, font-size 1.05rem, font-family inherit, border 2px solid #e2e8f0, radius 12px, background #fdfdfd, color #0f172a. Focus: border-color #047857, background #fff, box-shadow 0 0 0 4px rgba(4,120,87,.12), no outline.
- Institution field: custom searchable combobox. An input with a chevron toggle button (40px wide, right-aligned, color #64748b, rotates 180° when open), and a dropdown below it (top: calc(100% + 4px), max-height 250px, scrollable, white, border 1.5px solid #e2e8f0, radius 12px, shadow 0 10px 25px -5px rgba(0,0,0,.15)). Items: padding 10px 14px, 0.95rem, color #1e293b, 1px bottom divider #f1f5f9. Hover/active: background #ecfdf5, color #047857, weight 600. Empty state: centered text, #94a3b8, 0.88rem.
- Year and round selects: put them in one row (two columns) above the roll field, using the same .form-input / label styles. The year select must be EMPTY by default and show the placeholder "সাল সিলেক্ট করুন..." until the student chooses. Right now it shows "২০২৭" while the URL has `year=` empty, which is a bug.
- Search button (.btn-search): full width, background linear-gradient(135deg, #047857 0%, #065f46 100%), white text, no border, padding 14px 24px, radius 12px, font 1.1rem, weight 700, inline-flex centered, gap 10px, box-shadow 0 4px 10px rgba(4,120,87,.3), margin-top 4px. Hover: gradient 135deg #059669 → #047857, shadow 0 6px 14px rgba(4,120,87,.4), translateY(-1px). Disabled: opacity .65. Loading: white spinner (20px, 3px border) + "খোঁজা হচ্ছে…". It has a search (magnifier) icon and the text "সার্চ করুন".
- Mobile (max-width 640px): .main-content padding 12px 0 28px; search-card padding 14px 14px 16px; title 1.05rem, margin-bottom 2px; subtitle 0.82rem, margin-bottom 12px; hint margin 0 0 10px, padding 4px 8px, 0.74rem; form gap 10px; label 0.9rem; input height 44px, 1rem; button min-height 44px, padding 10px 20px, 1.05rem.

RESULT AREA (inserted right after the search card, before the helpline card). There are 3 states for a roll search:

State 1: selected for round 2 ("উত্তীর্ণ")
- Banner (.round2-announcement.selected): margin-top 24px, radius 12px, background #f0fdf4, border 1px solid #bbf7d0, box-shadow 0 2px 8px rgba(16,185,129,.08), padding 18px 22px, text-align left, fade-in-up animation (opacity 0→1, translateY 16px→0, 0.4s). Inside: a flex row, gap 12px, with a 22px check-circle icon (#16a34a, margin-top 2px) and a paragraph (color #15803d, font 1.05rem, weight 500, line-height 1.65). Text: "অভিনন্দন! আপনি সীরাত কুইজের ২য় রাউন্ডে জায়গা করে নিয়েছেন। বিস্তারিত আপনাকে মেসেজের (SMS) মাধ্যমে জানানো হবে। তাই আপনার মেসেজ ইনবক্সে নিয়মিত খেয়াল রাখুন, যেন গুরুত্বপূর্ণ কোনো তথ্য মিস না হয়।"
- Result card rows: রোল নাম্বার, শিক্ষার্থীর নাম, প্রাপ্ত নাম্বার (marks badge), শিক্ষাপ্রতিষ্ঠান, ফলাফল (green "উত্তীর্ণ" badge). A round print button is at the top right of the card header.

State 2: not selected ("অনুত্তীর্ণ")
- Banner (.round2-announcement.not-selected): same container styles as above but padding 22px 24px. A header row (flex, centered vertically, gap 10px, margin-bottom 12px) with a 24px heart icon (#15803d) and the title "আপনার অংশগ্রহণই আমাদের অনুপ্রেরণা!" (1.25rem, weight 700, color #166534, letter-spacing -0.2px). Then paragraph 1 (color #1f2937, 1.0rem, line-height 1.7, margin-bottom 14px, weight 400) and paragraph 2 (color #111827, 1.02rem, line-height 1.65, weight 700). Copy both paragraphs' exact Bengali text from old-student.html (the thanks and encouragement text, then the "ইনশাআল্লাহ, সামনে আরও নতুন সুযোগ আসবে…" text).
- Result card rows: রোল নাম্বার, শিক্ষার্থীর নাম, শিক্ষাপ্রতিষ্ঠান, ফলাফল (red "অনুত্তীর্ণ" badge). There is NO marks row and NO print button for a not-selected student. Marks must never be sent to or shown to a not-selected student (the old page gets marks = null from the server in this case. Keep that rule server-side).

State 3: selection not decided (cut-off not set / data missing)
- Banner (.round2-announcement, plain) with only this bold text (class .not-selected-p2, margin 0): "২য় রাউন্ডের নির্বাচনী ফলাফল এখনো প্রকাশিত হয়নি।". The card shows roll, name and institution only. No marks row, no ফলাফল row, no print button. Nobody is told they were not selected while the cut-off is unknown.

RESULT CARD (.result-card): background #fff, radius 16px, margin-top 24px, shadow-lg, border 1px solid #e2e8f0, overflow hidden, padding 0, fade-in-up animation.
- Header (.result-header): background linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%), border-bottom 2px solid #a7f3d0, padding 16px 20px, text-align center, position relative.
  - h2 (institution name): 1.15rem, weight 700, color #064e3b, margin-bottom 2px.
  - p: "সীরাত কুইজ - {SELECTED YEAR}ইং প্রতিযোগিতার ফলাফল", 0.85rem, color #047857. The year must be the selected year (the old file has a fixed "২০২৬ইং". Do not copy that).
  - Print button (.btn-print-result), only for a selected student: absolute, top 50%, right 14px, translateY(-50%), 38×38px, circle, color #047857, background #fff, border 1.5px solid #a7f3d0. Hover: background #047857, color #fff. It contains an 18px printer icon (stroke 2.2). When the button exists, the header gets padding-left/right 56px.
- Body (.result-body): padding 20px.
- Rows (.result-row): flex, space-between, align center, padding 12px 0, border-bottom 1px dashed #f1f5f9, gap 12px, with no border on the last row. Label (.result-label): 0.92rem, weight 600, color #475569, no shrink. Value (.result-value): 1.02rem, weight 600, color #0f172a, right-aligned.
- Marks badge (.marks-badge): inline-flex, background #ecfdf5, color #065f46, border 1.5px solid #a7f3d0, weight 700, 1.15rem, padding 4px 16px, fully rounded.
- Status badge (.result-status): inline-flex, weight 700, 1.05rem, padding 4px 18px, fully rounded. Pass: color #027a16, background #ecfdf5, border 1.5px solid #a7f3d0. Fail: color #dc2626, background #fef2f2, border 1.5px solid #fecaca.
- All numbers (roll, marks, counts) are in Bengali digits.

PRINT (the print icon prints that single result card)
- Clicking the icon prints ONLY that card. Every other part of the page is hidden during printing. After printing, restore everything. Temporarily set document.title to "সীরাত কুইজ - ফলাফল".
- Print CSS: @page { size: A4; margin: 0 } (this also removes the browser's own header/footer text). html/body margin 0, background white, body padding 14mm. The card has margin 0, border 1.5px solid #94a3b8, no shadow, no animation, break-inside avoid, exact colors (print-color-adjust: exact).
- Inside the printed card (hidden on screen), show a letterhead at the top (flex, gap 14px, padding 16px 20px 12px, bottom border 1px solid #cbd5e1): a 56px round logo, the organization name "ইনকিলাব যুব সংগঠন" (1.3rem, 700, #064e3b), and below it the event line "সীরাত কুইজ - {SELECTED YEAR}ইং" (0.95rem, 600, #047857).
- At the bottom of the printed card, show a footer (centered, padding 10px 20px 14px, 0.82rem, #475569, top border 1px dashed #cbd5e1): "প্রিন্টের তারিখ: {today's date in Bengali (bn-BD), e.g. ৪ নভেম্বর ২০২৬}".
- The header print button is hidden in print. The header's side padding goes back to 20px.

INSTITUTION-ONLY SEARCH (roll left empty, institution chosen): shows a student list instead of a result
- Info banner (.institution-search-banner): background #fff, border 2px solid #a7f3d0, radius 16px, padding 20px 22px, margin-top 24px, shadow-md. Inside: a centered row with a 22px info-circle icon (#059669) and bold text, 1.05rem, color #065f46: "রেজাল্ট দেখতে নিচে থেকে রোল নাম্বার খুঁজে রোল নাম্বার ঘরে আপনার রোলটি বসান।"
- List card (.institution-list-card): white, radius 16px, border 1px solid #e2e8f0, shadow-lg, margin-top 20px, overflow hidden. Header: the same mint gradient and 2px #a7f3d0 bottom border as the result header, padding 16px 20px, flex space-between, wrap, gap 10px. Title (institution name) 1.25rem, 700, #064e3b. Count pill "মোট {n} জন শিক্ষার্থী": background #dcfce7, color #047857, 0.9rem, 700, padding 4px 14px, border 1px solid #86efac, fully rounded.
- Table (.student-list-table, full width, border-collapse): columns "সিরিয়াল নং" (80px), "রোল" (140px), "নাম". th: background #f8fafc, color #475569, weight 700, padding 12px 16px, bottom border 1.5px solid #e2e8f0. td: padding 12px 16px, bottom border 1px solid #f1f5f9. Row hover: background #f0fdf4. The name is bold.
- The roll in each row is a clickable chip (.roll-badge-clickable): padding 4px 10px, background #f1f5f9, border 1.5px solid #cbd5e1, radius 8px, weight 700, 0.95rem. Hover: background #ecfdf5, border-color #047857, color #047857, scale(1.05). Clicking it copies that roll into the roll input above, focuses it, scrolls to it and briefly highlights its border in #047857 for 1.5 seconds.
- The table wrapper is horizontally scrollable on small screens.

OTHER STATES
- Error/not-found boxes (.message-box): margin-top 24px, padding 20px, radius 12px, centered, 0.95rem, weight 500, with a 40px icon above the text. Error: background #fef2f2, border 1px solid #fecaca, color #dc2626. Not found: background #fefce8, border 1px solid #fef08a, color #854d0e.

HELPLINE CARD (below the result area; keep the existing one but make its styles match)
- max-width 720px, margin 16px auto 0, white, border 1px solid #e2e8f0, radius 16px, padding 16px 20px, shadow 0 4px 12px -2px rgba(15,23,42,.05). Header: centered row with a 28px round icon (#ecfdf5 background, #047857 phone icon) and the title "যেকোনো তথ্যের জন্য যোগাযোগ করুন" (0.95rem, 700, #1e293b). A two-column grid (gap 10px; one column below 600px) of items: background #f8fafc, border 1.5px solid #e2e8f0, radius 12px, padding 9px 12px (hover: border #a7f3d0, background #f0fdf4). Each has a label (0.72rem, 600, #64748b), a number (1rem, 700, #065f46, letter-spacing .4px), a "কল" button (gradient #059669→#047857, white, 0.82rem, 600, padding 6px 11px, radius 8px) and a "কপি" button (white, border 1.5px solid #cbd5e1, color #475569, 0.82rem, 600; hover/copied state: background #ecfdf5, border #10b981 / #059669, color #047857). Footer text: 0.82rem, #94a3b8, centered, padding 20px.

BEHAVIOR AND RULES FOR THE STUDENT PAGE
- Qualified or not is decided from the actual cut-off and marks of the SELECTED YEAR (never hard-coded) and returned by the server. The page must not receive marks for a student who is not selected, and must never expose mobile numbers or admin-only data.
- A round's results show only when that round is enabled for the selected year.
- Year field: required, empty by default (placeholder "সাল সিলেক্ট করুন..."), options are the years that actually exist. If the student searches without a year, show a clear validation message and do not search.
- Show the year in the card subtitle and the print letterhead from the selected year. Do not hard-code it anywhere.

NOT DEFINED YET (do not assume, keep the current behavior and tell me)
- What the page should show when the student selects "২য় রাউন্ড" in the new round field. The old page has no round field. Its result card (the selected/not-selected logic above) is the round-1 → round-2 selection result.

PART 2 DONE WHEN: the side-by-side screenshots (old site vs new page) of these cases show no visible difference at 1920px and 390px width, apart from the new year/round fields: (a) a qualified student, e.g. roll 846 at "কাশীপুর আদর্শ বালিকা উচ্চ বিদ্যালয়"; (b) a not-qualified student, e.g. roll 870; (c) institution only with the roll empty (student list); (d) the empty form; (e) the print preview of a qualified student's card.

==================================================
PART 3: SECURITY REVIEW (do this last, on the final code)
==================================================
Review the whole quiz feature: the admin page /admin/quiz and everything it calls (server actions, route handlers, Supabase queries, RPCs, RLS policies, migrations), plus the public page public/quiz/student.html and how it reaches the database. Check at least the following, and for each item write PASS, FAIL or NOT APPLICABLE with the file and line as evidence.

1. Authentication and authorization on the server
   - Every server action and every route handler that reads or changes quiz data (add, edit, delete, cut-off save, round enable/disable, year add, mobile numbers read, print/PDF data) must check on the server that the user is signed in and has the admin role. Page-level or middleware checks alone are not enough, because server actions can be called directly.
   - Check the audit log ("অডিট লগ") writes for the same actions: the user, the year, and the old and new values.
2. Year scoping (the owner's rule)
   - The ?year= query parameter and any year sent by the client must be validated on the server (valid, existing year). Every read and write must be filtered by that year in the server/data layer, not only in the UI.
   - A record can be edited or deleted only under the year it belongs to (no IDOR across years or records). Roll-number uniqueness is checked per year.
   - Adding a new year ("নতুন সাল যোগ করুন"): admin only; validated (4 digits, sensible range); no duplicates; safe against rapid repeated submits.
3. Input validation and injection
   - All inputs of the server actions are validated (types, lengths, ranges: cut-off numbers, marks, roll, mobile format). Look for SQL/filter injection in any dynamic filter, ilike or raw query, and for mass-assignment (accepting extra fields from the client).
   - XSS: in the admin app (any dangerouslySetInnerHTML) and in public/quiz/student.html (anything using innerHTML). Pay special attention to values placed inside inline event handlers such as onclick="selectStudentRoll('...')". HTML-escaping is not enough in that context, because the browser decodes the attribute before the JS runs. Prefer addEventListener with data- attributes.
4. Database and Supabase
   - Row Level Security must be enabled on every quiz table (results, settings, years, audit log and so on) with correct policies. Check that the anon key cannot read or write the tables directly.
   - The public student page may reach data only through a narrow function (RPC) that returns a single student's result for the exact roll + institution + year and: (a) never returns mobile numbers; (b) returns marks only for a selected student; (c) returns nothing for a round that is not enabled for that year. Check that SECURITY DEFINER functions set a safe search_path and that the arguments are validated.
   - The service-role key must never reach the browser (no NEXT_PUBLIC_ variable, no client component, not in public/ files). Check that .env files are not committed and that nothing secret is in the static HTML or its assets.
   - Check the public search against enumeration and scraping (guessing rolls or listing all students). Look at the institution-only search: it should expose only serial/roll/name and nothing else. Report any missing rate limiting.
5. Mobile numbers
   - Reading mobile numbers must be admin-only, on the server, and ideally logged. Responses containing them must not be cached (Cache-Control: no-store) and must not appear in logs, URLs or error messages.
6. Other web checks
   - CSRF/origin protection of server actions and any route handlers that change data. Open redirects. Security headers (CSP, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy) in next.config. Cookie flags of the session. Overly verbose error messages that leak internals. Leftover client-side "admin" flags (for example in sessionStorage or localStorage) that something trusts.
   - Run `npm audit` (or the project's package manager equivalent) and report high/critical issues in dependencies.
7. Output
   - Give me a short report: a table of findings with severity (critical/high/medium/low), where it is, how it could be abused in one or two sentences, and the fix.
   - Fix the clear, low-risk problems directly and list what you changed. For anything that changes behavior, needs a database migration or a policy change, or that you are not sure about, do NOT apply it silently. Describe it and wait for my approval.
   - Do not print or commit any secret value in the report.

FINAL DELIVERY
1. Part 1 fixed, with before/after screenshots at both widths.
2. Part 2 done, with the side-by-side screenshots listed above.
3. The Part 3 security report, plus a list of the fixes you applied and the items waiting for my approval.
4. Lint and type checks pass.