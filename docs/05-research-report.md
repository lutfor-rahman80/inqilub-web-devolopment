> **Evidence notice (added by the orchestrator, 2026-10-28):** the research agents could not open any website — the cloud environment's network policy blocked all direct page loads. Every finding below comes from search-engine index data (page titles, URLs, indexed summaries) and is labelled M (medium) / W (weak) / [SC-flag]. Layout, menus as rendered, mobile quality and JavaScript behaviour were **not** observed.

# Website Research Report: Bangladeshi Organisation Websites, with Recommendations for ইনকিলাব যুব সংগঠন (Inqilab Jubo Sangathan, IJS)

## How much to trust this evidence (read first)

- **No site was opened.** The research sessions' network policy blocked every direct page load. WebFetch returned `getaddrinfo ENOTFOUND`. The proxy returned `CONNECT 403`, even for the control hosts example.com and en.wikipedia.org.
- **Everything below comes from the search index.** That means indexed page titles, URLs, and the search engine's summaries of text on each organisation's own domain.
- **The spot-check confirmed nothing live.** It covered 36 claims and could not reach any host, so every verdict is "unreachable". It re-checked the index instead and found most claims consistent. Several were not found, were partly different, or were contradicted. Section 5 lists them.
- **What that means in practice:**
  - URL structures and page titles are fairly reliable.
  - Page contents are second-hand.
  - There is no evidence at all about layout, rendered menus, mobile quality, accessibility or JavaScript behaviour.
  - Every recommendation rests on patterns seen at more than one organisation. A point that rests on one source is labelled.
  - No recommendation is based only on a claim the spot-check flagged.

**Evidence key:** **M** = medium (several indexed pages or organisations agree, or the spot-checker's own index check agreed). **W** = weak (one snippet or summary). **[SC-flag]** = the spot-check could not find the claim, found something partly different, or contradicted it.

---

## 1. Sites studied

All 31 sites have the same load status: **not loaded**, with evidence from the search index only. The "Evidence" column shows how much indexed material there was.

| # | Organisation | Segment | URL | Evidence | Key features seen in the index |
|---|---|---|---|---|---|
| 1 | BADHAN (বাঁধন) | Student / blood donation | https://badhan.org/ | About 10 indexed URLs. Not spot-checked. W–M | One public, indexed profile page per donor at `/profile/<id>`, showing name, blood group and unit/zone. A gated member dashboard with an "Access Request" form: name, phone, organogram, designation, committee year, blood group. Menu per the index: Blood Request, Organograms, About, Tips, T&C, Privacy Policy, Register, Login. A Tips page with US-style criteria. A legacy `/laradhan/public/index.php/` path and a 404 page are indexed. |
| 2 | Bangladesh Scouts | National youth/student body | https://scouts.gov.bd/ | Spot-check: consistent in the index. M | Bengali-first titles ("হোম"). A separate portal handles registration: name, NID/birth-registration number, mobile, gender, password. The FAQ flow is: profile, then pick group/unit, then apply, then the group admin accepts, then a Scout ID is issued. A PDF manual covers SMS password reset. Also a support form, an award portal and regional sub-sites. A spam post is indexed on the `air.` sub-site. |
| 3 | Bangladesh Mathematical Olympiad (BdMO) | Student competition / education | https://matholympiad.org.bd/ | Spot-check: hub and slug pattern consistent; table columns uncertain [SC-flag]. M | Results hub (গণিত উৎসবের ফলাফল) organised by year and round. One URL per edition (`/results/national2025`). Category as a path segment. Region filters. Multi-step registration. Login with a 6-digit username. FAQ. A named volunteer corps ("MOVers") with eligibility rules. A phpBB forum. Content is spread across the main, `online.`, `contest.` and `2025.` hosts. |
| 4 | Dhaka University Debating Society (DUDS) | University club | https://duds.du.ac.bd/ | Homepage summary only. W | Founding statement. A seasonal "2026 Member Recruitment Programme" call. |
| 5 | KIN (SUST) | Campus volunteer org | https://archive.sust.edu/campus-life/student-organizations/14 | One university listing snippet; no own website found. W | Activities organised as "wings": Blood, KIN School, awareness, charity, winter clothing. Links to an app, Instagram, LinkedIn and Facebook. |
| 6 | Bangladesh Nationalist Party (BNP) | Political party | https://www.bnpbd.org/ | Spot-check: one combined new/renewal form; the claimed committee-data drift is **contradicted** [SC-flag]. W–M | Primary-member registration that includes renewal. One page per committee tier. `?language=bn/en` parameter. Separate News, Programs & Press Releases and Press Conference sections. An `election26.` microsite. Constitution page. |
| 7 | National Citizen Party (NCP) | Political party | https://ncpbd.org/en | Spot-check: consistent. W | `/en` path prefix. Subdomains `donate.`, `nomination.`, `manifesto2026.` and `july.` (a map-based campaign tracker). Contact details in the footer. |
| 8 | Bangladesh Awami League | Political party | https://www.albd.org/ | W | Category navigation. Gallery organised as photo series. Paginated tag archive. An organisation page. Legacy subdomains still indexed. |
| 9 | Bangladesh Jamaat-e-Islami | Political party | https://jamaat-e-islami.org/ | W | Associate-member form as a PDF plus an external Google Form. Committee roster published as an article with the term years in its title. An `/en/` section. Constitution PDF in a non-Unicode legacy font. The whole site is also served on a `mail.` host. |
| 10 | Bangladesh Islami Chhatrashibir | Student organisation | https://shibir.org.bd/en | W | Moving from per-language subdomains to `/en/` paths, with the old site still indexed. Gallery index. English Departments/Branches pages marked "under construction". "Be a Supporter" link. |
| 11 | As-Sunnah Foundation | Islamic welfare / education | https://assunnahfoundation.org/ | Spot-check: membership tiers, autopay, volunteer conditions and the archive notice are consistent. The non-political self-description, volunteer OTP and form-field list were not found [SC-flag]. M | Volunteer registration (স্বেচ্ছাসেবক নিবন্ধন) with eligibility conditions shown above the form. Membership only through large donations (lifetime ≥ ৳1,00,000; donor ≥ ৳50,000). Fund pages for iftar, sadaqah, zakat and emergencies. Recurring bKash, Nagad or card autopay. Programme pages with yearly output counts. LMS and donation subdomains. |
| 12 | As-Sunnah Trust | Islamic education / welfare | https://assunnahtrust.org/ | Spot-check: the beneficiary account with mobile tracking is supported; the notice board and progress bars were not found [SC-flag]. W–M | Aid application with an applicant account and mobile-number login to track status. Zakat calculator. Orphan fund. Team-member profile pages. Partial `/en/` tree. An `old.` subdomain. A spam-looking indexed URL. |
| 13 | Center for Zakat Management (CZM) | Islamic zakat body | https://czm-bd.org/ | W | Checkout links that carry a campaign ID. Separate bank accounts per fund. Zakat calculator. Crowdfunding with % raised. Reports. Scholarship portal with eligibility rules and an FAQ. Five or more subdomains. |
| 14 | Anjuman Mufidul Islam | Islamic welfare | https://www.anjumanmibd.org/ | W–M | "Our Official" leadership page. Branch directory. Service pages. Gallery albums by event and year. Donation page split by fund. News, Notices, Upcoming Events and Past Events sections. A mislabeled page title. |
| 15 | Islamic Relief Bangladesh | Islamic international NGO | https://islamicrelief.org.bd/ | M | Separate BN and EN posts with `-bn`/`bn`/`bdbn` slugs. Annual-report PDFs for 2018–2024. Publications. A "Story" category for beneficiary cases. Partners page. |
| 16 | Islamic Foundation Bangladesh | Government religious body; national Seerat/Hifz competitions | https://islamicfoundation.gov.bd/ | W–M | Notice table with number, title, file and date. Officer directory. Table of Directors-General with tenure dates. PDF application forms. Competition files including "সীরাত প্রতিযোগিতা ২০২৫". Competition and recruitment notices share one board. |
| 17 | Bidyanondo Foundation | Volunteer-run humanitarian / education | https://bidyanondo.org/ | Spot-check: the bank list differs from the claim; the `/donate` page was not found [SC-flag]. W–M | Bank and mobile-wallet page. Volunteer form (on the `old.` site). Audit reports by fiscal year. Media split into Gallery, Video and Press. FAQ says donations are not tax-deductible. The old and new sites show different account numbers. |
| 18 | Bangladesh Red Crescent Society (BDRCS) | National humanitarian / blood | https://bdrcs.org/ | M | Blood-centre list plus one hotline; the donor database is internal. `donate.bdrcs.org` uses SSLCommerz and bKash, with a non-refundable note and a tax-certificate statement. Leadership pages at several levels. Annual and situation-report PDFs. The site says 10 blood centres; the annual report says 8. |
| 19 | Volunteer for Bangladesh (VBD) / JAAGO | Youth volunteer network | https://vbd.com.bd/ | W–M | Joining FAQ (age 15–35, no fee, expected commitment). Board listings by division with named posts. Bylaws PDF. Activities tagged by district. Certificates and appreciation letters. "Meet The Heroes" page. |
| 20 | Roktobondhu (রক্তবন্ধু) | Blood-donor platform | https://roktobondhu.com/ | W–M | Donor registration (blood group, last donation date). Search by area down to upazila. Donors hidden for about 120 days after donating. Female donors' numbers hidden. **Public profile URLs contain the donor's mobile number, and profiles show the permanent address.** |
| 21 | OBHIZATRIK Foundation | Volunteer-founded development org | https://obhizatrik.org/ | W–M | Homepage calls to action and impact counters. Volunteer form that asks for an NID upload. "Ways to Give" page. Per-beneficiary donation pages. A reports page listing annual reports, audits and registration documents. |
| 22 | BYLC | Youth leadership training | https://bylc.org/ | W | Each programme shows whether applications are open or closed. Eligibility and fee on each programme page. Alumni network. |
| 23 | Sandhani (সন্ধানী) | Student blood / eye donation | https://www.sandhani.org | W–M | Contact list for the centre and each unit. One page per unit. Bengali news posts with Bengali-script URLs; the latest indexed are from 2016–17. No online registration found. |
| 24 | Quantum Voluntary Blood Donation Program | Blood programme | https://blood.quantummethod.org.bd/en | Spot-check: figures mixed; `/bn` not seen on the blood portal [SC-flag]. W | `/bn` and `/en` paths on sister subdomains. Homepage counters. Articles and videos on separate subdomains. No public donor list. |
| 25 | Blood BD | Donor directory | https://blood-bd.com/ | Homepage only. W | Search by blood group, division, district and upazila. "Post Request" for emergencies. Emergency-contacts list including 999. Privacy-policy link. |
| 26 | Blood Share BD | Donor web app | https://www.bloodsharebd.com/ | Homepage only, about 220 days old. W | Account registration. Emergency requests that push alerts to matching nearby donors. A "contact system" between donors and patients. |
| 27 | Bangladesh Blood Bank (3s-Soft) | Donor directory | https://blood.3s-soft.net/ | Homepage only. W | States that every donor and organisation is manually verified. Search by group, district and upazila. |
| 28 | Al-Markazul Islami (AMI) | Islamic humanitarian, non-political | https://www.amibd.org/ | Many indexed pages; spot-check consistent. M | States it is "non-political, non-profit, religious, humanitarian". Page titles in both English and Bengali. 24-hour ambulance page with a direct phone number. Fund pages with targets and linked galleries. bKash, Nagad and bank details. Photo and video galleries. Ask a Mufti. Management Committee page. |
| 29 | Bangladesh Physics Olympiad (BdPhO) | Competition organiser | https://www.bdpho.org/ | W–M | Admit card downloaded with registration number and password. Flow is register, confirm, then pay, with login details sent by SMS. A notice for each edition with an eligibility rule. Results as many separate PDFs. Past papers by edition and category. |
| 30 | Bangladesh Biology Olympiad (BdBO) | Competition organiser (volunteer) | https://bdbo.org/ | Spot-check: the 2026 national post is consistent; the 2019 winner tables were not found [SC-flag]. M | Separate registration portal and admit-card download. One post per event per year. An archive of previous years. A central-committee page for each term. Syllabus page. Prize-collection notice. Warning against people using its name without permission. |
| 31 | Prothom Alo Trust | Education-support foundation | https://trust.prothomalo.com/ | W | Activities grouped by programme in the URL. Impact numbers. Bank and bKash details with a note that only donations from inside Bangladesh are accepted. Beneficiary video stories. |

---

## 2. Cross-site patterns

These patterns are drawn from index evidence. No menu or layout was actually seen.

**2.1 Navigation.** The menus below are reconstructed from indexed text. Common items:
- About (পরিচিতি)
- Activities, Services or Projects
- Committee, Officials or Organogram
- Gallery or Media (often split into Photo and Video)
- News or Notices
- Donate
- Join, Volunteer or Engage
- Contact

More mature sites add FAQ, Reports and Terms/Privacy. Sources: https://www.amibd.org/services, https://old.bidyanondo.org/, https://www.badhan.org/home/

**2.2 Homepage sections.** Recurring blocks:
- An identity statement (AMI's "non-political, non-profit, religious, humanitarian")
- Volunteer and donate calls to action, with impact counters (OBHIZATRIK, Quantum)
- Dated campaign items (old Bidyanondo site)
- News, Notices, Upcoming and Past Events blocks (Anjuman)
- A seasonal recruitment call (DUDS)

Sources: https://www.amibd.org/, https://obhizatrik.org/, https://www.anjumanmibd.org/

**2.3 Activities as named programmes.** Each standing programme gets its own page. Some show yearly output numbers: As-Sunnah's winter-relief page gives item counts for 2023, 2024 and 2025. Others use named "wings" (KIN) or put the programme in the URL (Prothom Alo Trust). Sources: https://assunnahfoundation.org/activities/winter-relief, https://archive.sust.edu/campus-life/student-organizations/14, https://trust.prothomalo.com/activities/alor-school/7o4gih17kw

**2.4 Membership and joining.** The usual model is an online application followed by admin approval:
- **Scouts:** account, then profile, then choose a unit, then apply, then the group admin accepts, then an ID is issued.
- **BADHAN:** an access request that asks for designation and committee year.
- **Eligibility shown above the form:** As-Sunnah's volunteer page and VBD's FAQ.
- **Lower-tech options:** a PDF plus a Google Form (Jamaat).
- **Seasonal recruitment:** DUDS.
- **Membership tied to large donations:** As-Sunnah Foundation.

No site showed a membership-status page for applicants. Mobile-number status tracking appeared only for an aid application (As-Sunnah Trust). Sources: https://service.scouts.gov.bd/faqs, https://member.badhan.org/access/, https://vbd.com.bd/faq

**2.5 Committees and leadership.** Common formats:
- Titled lists for each term, with older terms archived (BdBO 2019-20, 2021-22 and 2025-26; Jamaat puts the term years in the title)
- Boards by level with named posts (VBD)
- A profile page per person (BDRCS, As-Sunnah Trust)
- A history table of office-holders with tenure dates (Islamic Foundation)

Sources: https://bdbo.org/bdbo-central-committee-2025-2026/, https://vbd.com.bd/khulna-division-board-members/, https://islamicfoundation.gov.bd/pages/static-pages/6922dcf9933eb65569e12ffe

**2.6 Events and their status.** Explicit status labels are uncommon:
- Anjuman separates Upcoming and Past events.
- BYLC marks applications open or closed.
- BdMO shows the "Participate" button only at exam time.
- Competition organisers give each year's edition its own page.

**No site showed "ongoing" as a status.** Sources: https://www.anjumanmibd.org/, https://bylc.org/programs.html, https://bdbo.org/12th-bdbo-national-biology-olympiad-2026/

**2.7 Galleries.** Common formats:
- One album per event and year (Anjuman: "Winter clothes distribution 2021", "2022")
- Photo series by topic (Awami League)
- Media split into Gallery, Video and Press (Bidyanondo)
- Galleries embedded in campaign pages (AMI)

Sources: https://anjumanmibd.org/usergallery, https://old.bidyanondo.org/, https://www.amibd.org/photo-gallery/dead-body-bathing/

**2.8 Notices and news.** Common formats:
- A numbered, dated notice table with file attachments (Islamic Foundation)
- Separate content types: news, press releases, press conferences (BNP, Awami League)
- News filed by branch or unit (BDRCS)
- Practical notices: prize collection, and warnings against misuse of the organisation's name (BdBO)

Sources: https://islamicfoundation.gov.bd/pages/notices, https://bdrcs.org/category/unit-branch/, https://bdbo.org/bdbo-dhaka-north-regional-biology-olympiad-2026/

**2.9 Donation methods.**
- The most common method is bKash/Nagad numbers and bank accounts written on a page, often split by fund (zakat, sadaqah, general, emergency).
- Payment gateways (SSLCommerz) and recurring autopay appear only at large, registered organisations.
- Trust signals include:
  - refund terms and a tax-certificate statement (BDRCS)
  - "not tax-deductible" (Bidyanondo)
  - "donations accepted from inside Bangladesh only" (Prothom Alo Trust)

Sources: https://www.amibd.org/donation, https://donate.bdrcs.org/donate-online/, https://trust.prothomalo.com/trust_contact

**2.10 Blood-donor features.** Three models:
1. An internal database plus a hotline (BDRCS, Quantum).
2. A dashboard for members only (BADHAN).
3. A public search by blood group and upazila (Roktobondhu, Blood BD, 3s-Soft).

Roktobondhu hides donors for about 120 days after they donate. **None of the Islamic welfare organisations studied offered a blood-donor search.** Sources: https://bdrcs.org/bdrcs-contact/, https://roktobondhu.com/blog/4months/, https://blood-bd.com/

**2.11 Emergency requests.** Formats seen:
- a single hotline (BDRCS)
- a public "Post Request" form (Blood BD)
- push alerts to donors (Blood Share BD)
- a list of emergency contacts (Blood BD)
- a 24-hour service page with a phone number (AMI)
- an aid application the applicant can track (As-Sunnah Trust)

Sources: https://www.bloodsharebd.com/, https://www.amibd.org/ambulance-service, https://assunnahtrust.org/beneficiary/

**2.12 Transparency and reports.** Formats seen:
- annual-report archives (Islamic Relief, BDRCS)
- audit reports by fiscal year (Bidyanondo)
- a reports page with audits and registration documents (OBHIZATRIK)
- yearly beneficiary counts on a programme page (As-Sunnah)
- a bylaws PDF (VBD)

This is rare among small organisations and blood groups. Sources: https://islamicrelief.org.bd/category/annual-reports/, https://old.bidyanondo.org/audit-report, https://assunnahfoundation.org/self-reliance-project

**2.13 Language.** Student, Islamic and blood organisations are Bengali-first. Large NGOs often have English structural pages. Mechanisms seen:
- a query parameter (BNP)
- a path prefix (NCP, Shibir, Jamaat, Quantum's sister sites)
- separate subdomains per language (Shibir's old setup, Awami League)
- separate parallel posts (Islamic Relief)
- page titles in both languages (AMI)

**No language-toggle UI was verified on any site, and incomplete English is common.** Sources: https://www.bnpbd.org/plan-to-build-nation/?language=bn, https://ncpbd.org/en, https://islamicrelief.org.bd/aboutus-bn/

**2.14 Social media.** There is little direct evidence. KIN relies on an app, Instagram, LinkedIn and Facebook instead of its own site. VBD's FAQ says updates come through official social media. Searches for small Islamic youth groups found only news coverage and Facebook presence; this is a search-based observation. Sources: https://archive.sust.edu/campus-life/student-organizations/14, https://vbd.com.bd/faq

**2.15 FAQs and how-to guides.**
- Scouts: an FAQ plus a PDF user manual.
- BdMO: an FAQ that says help emails must include name, username, class and institution.
- VBD: a joining FAQ.
- Bidyanondo: an FAQ on donations and volunteering.

Sources: https://service.scouts.gov.bd/faqs, https://www.matholympiad.org.bd/faq.html, https://old.bidyanondo.org/faq

**2.16 Competition registration and results.**
- Each year's edition has its own page and URL.
- Results are grouped by round and category and show name, institution and award.
- Admit cards are looked up with a registration number and password.
- Registration numbers carry meaning (`DHA-A-0127`).
- Syllabus pages, past papers and archives of previous years are common.

**No site offered a public "enter roll number" result lookup or online certificate verification.** Sources: https://online.matholympiad.org.bd/results, https://www.admin.bdpho.org/admit-card, https://bdbo.org/rbos-of-previous-years/

**2.17 Separate portals on subdomains.** Registration, donations and results often live on their own subdomains. Sources: https://service.scouts.gov.bd/registration, https://donation.assunnahfoundation.org/, https://scholarship.czm-bd.org/applicant/register

**2.18 Mobile quality and accessibility.** **This could not be observed.** The only indirect signals are results published only as PDFs, non-Unicode PDFs and long percent-encoded URLs. Sources: https://jamaat-e-islami.org/publication/file/185_constitution_Jan_2020.pdf, https://admin.bdpho.org/assets/uploads/file-manager/271_1675618583_.pdf

---

## 3. Common weaknesses IJS should avoid

| # | Weakness | Observed at (source) | What IJS should do instead |
|---|---|---|---|
| 1 | Out-of-date content, especially leadership and news | Scouts homepage last updated about 913 days ago, per a search summary (https://scouts.gov.bd/). Sandhani's latest posts are from 2016–17 (https://www.sandhani.org/২-নভেম্বর-সারা-দেশে-জাতীয়/). VBD board pages date from 2017 (https://vbd.com.bd/khulna-division-board-members/). Bidyanondo's newest homepage items are from 2024 (https://old.bidyanondo.org/). | Date every item. Label each committee with its term. Hide empty or expired blocks automatically. Do a monthly freshness check. |
| 2 | The same fact differs between pages (account numbers, counts, phone numbers) | Bidyanondo's old and new sites list different account numbers (https://bidyanondo.org/bank-information). BDRCS says 10 blood centres on the site (https://bdrcs.org/donate-blood/) but 8 in its annual report (https://bdrcs.org/wp-content/uploads/2022/09/BDRCS-Annual-Report-2021-English_compressed-1.pdf). Quantum's counters differ between snapshots (https://blood.quantummethod.org.bd/en). VBD and JAAGO give different volunteer totals. The BNP committee-drift claim is **excluded** because the spot-check contradicted it. | Keep every phone number, payment number and counter in one place in the database, and show it from there everywhere. |
| 3 | Sites split across subdomains and several CMS generations, with old sites still live | CZM (https://crowdfunding1.czm-bd.org/). BdMO (https://2025.matholympiad.org.bd/login.html). Shibir (https://old.shibir.org.bd/). As-Sunnah Trust (https://old.assunnahtrust.org/). | One domain, one app, separate routes. |
| 4 | Broken, duplicate and messy URLs | An indexed 404 (https://badhan.org/donations?organogramId=35). A legacy framework path (https://badhan.org/laradhan/public/index.php/profile/728). The whole site on a duplicate host (https://mail.jamaat-e-islami.org/news-details.php?category=3&news=312). Opaque numeric IDs (https://www.anjumanmibd.org/usercausesdtl/5). Long percent-encoded Bengali URLs (Scouts, Sandhani, Islamic Foundation). | Short, stable English-letter URLs. One canonical host. Redirects when a URL changes. |
| 5 | Spam or possibly compromised pages | A gambling spam post at `air.scouts.gov.bd/site/news/…/betway-registration-bangladesh`. A spam-looking indexed URL `assunnahtrust.org/?a=365871587` (unverified). | Only admins can publish. Keep software updated. Use strong admin login. |
| 6 | Half-finished translations | Shibir's English pages say "under construction" (https://shibir.org.bd/en/branches). An `/en/` page with a Bengali title (https://assunnahtrust.org/en/about-us-gallery/). Separate BN/EN posts that drift apart (https://islamicrelief.org.bd/aboutus-bn/). | Store each text field in both languages and fall back to Bengali. Never publish placeholder English pages. |
| 7 | Personal data shown publicly | Roktobondhu puts the donor's mobile number in the profile URL and shows the permanent address (https://roktobondhu.com/). BADHAN's donor pages showing name, blood group and location are indexed by search engines (https://badhan.org/profile/579). OBHIZATRIK's public volunteer form asks for an NID upload (https://obhizatrik.org/become-a-volunteer/). | No phone numbers, addresses or ID documents in public. Keep member pages out of search engines. |
| 8 | Paper or external forms, with no way to check status | Jamaat uses a PDF plus a Google Form (https://jamaat-e-islami.org/article-details.php?category=71&article=109). Islamic Foundation offers PDF forms only (https://islamicfoundation.gov.bd/pages/files/6922da17933eb65569e026f2). No membership-status page was found on any site. | IJS's own form plus a status lookup. |
| 9 | Results hard to find or search | BdPhO publishes results as PDFs with random filenames (https://admin.bdpho.org/assets/uploads/file-manager/271_1675618583_.pdf). BdBO puts winners in tables inside blog posts. Islamic Foundation has no result lookup. | A lookup by roll number plus an archive of every year. |
| 10 | Notice boards with no categories | Islamic Foundation mixes competition and job-recruitment notices on one board (https://islamicfoundation.gov.bd/pages/notices). | Give notices categories and a filter. |
| 11 | Non-Unicode or unlocalised content | Jamaat's constitution PDF uses a legacy font (https://jamaat-e-islami.org/publication/file/185_constitution_Jan_2020.pdf). BADHAN's tips page uses US guidance ("110 lbs", "most states") (https://www.badhan.org/page/tips). | Unicode Bengali everywhere. Have health content reviewed locally. |
| 12 | Empty, placeholder or mislabeled sections | CZM's crowdfunding reports look like placeholders (https://crowdfunding.czm-bd.org/). Anjuman's `/videos` page is titled "Career" (https://anjumanmibd.org/videos). The claim of empty notice blocks at As-Sunnah Trust was not found by the spot-check [SC-flag]. | Hide empty blocks. Check titles before publishing. |
| 13 | Membership available only through large donations | As-Sunnah Foundation (https://assunnahfoundation.org/membership). | Keep membership free and based on volunteering. Keep donations separate. |

---

## 4. Recommendations for Inqilab Jubo Sangathan

**Guiding principles:**
- One domain and one app.
- Bengali first.
- Every repeated fact (phone numbers, payment details, counters, committee) stored once in the database and shown from there.
- Personal data private by default.
- Every feature must be maintainable by volunteer admins on free hosting tiers.

Recommendations are numbered R1–R22. The priority summary is in 4.24.

### R1. Homepage structure: Phase 1
- **What:** A Bengali-first homepage built from live data, in this order:
  1. Header: logo, menu (পরিচিতি, কার্যক্রম, কমিটি, সদস্য, গ্যালারি, নোটিশ, সীরাত কুইজ, যোগাযোগ), language switch, "সদস্য হোন" button.
  2. Identity line: mission, plus "অরাজনৈতিক, অলাভজনক, সেবামূলক ও শিক্ষামূলক যুব সংগঠন, নারায়ণগঞ্জ".
  3. Cards for ongoing and upcoming activities.
  4. The 3–5 latest notices, pinned ones first.
  5. Programme cards.
  6. Impact counters.
  7. Latest gallery albums.
  8. Seasonal quiz banner.
  9. Join and volunteer call to action.
  10. Footer: contact, Facebook, privacy policy, registration status.
- **Why:**
  - AMI states its non-political identity up front (https://www.amibd.org/) [M].
  - Anjuman puts News, Notices and Upcoming/Past Events on its homepage (https://www.anjumanmibd.org/) [W].
  - OBHIZATRIK uses calls to action and counters (https://obhizatrik.org/) [W].
  - Hand-maintained counters drift (Quantum, https://blood.quantummethod.org.bd/en) [SC-flag on its figures].
  - Stale and empty blocks are common (section 3, items 1 and 12).
- **How:**
  - Every block reads from the database and is hidden when empty.
  - Counters are calculated, with an "as of" date: approved members, completed activities, participants in the latest quiz.
  - Programme figures entered by hand come only from the yearly stats in R3, labelled with the year.
  - The quiz banner follows the quiz edition's status (R19).
- **Who uses it:** the public, prospective members, guardians and teachers, supporters.
- **Dependencies:** R2, R3, R7, R8, R17, R19.
- **Security/privacy:** No personal data on the homepage. Do not load the Facebook SDK by default; it adds tracking and slows the page.

### R2. Activity status sections (upcoming / ongoing / completed): Phase 1
- **What:** An Activity (কার্যক্রম) record with dates, shown in three public lists: আসন্ন (upcoming), চলমান (ongoing), সম্পন্ন (completed). Admins can override with স্থগিত (postponed) or বাতিল (cancelled).
- **Why:**
  - Anjuman splits upcoming and past events (https://www.anjumanmibd.org/) [W].
  - BYLC shows open/closed badges, possibly a stale snapshot (https://bylc.org/programs.html) [W].
  - BdMO ties its exam button to the scheduled time (https://online.matholympiad.org.bd/login) [W].
  - No site showed "ongoing", but IJS's drives that run over several days (iftar through Ramadan, the winter-clothes season) need it.
- **How:**
  - Fields: title (BN/EN), programme, start and end time (Asia/Dhaka), area/venue, description, cover image, status override, volunteers needed, linked album, linked notice, outcome summary (for example "৩২০ পরিবার").
  - Status is calculated from the dates.
  - When an activity is completed, admins are prompted to add the outcome summary and an album.
  - Archive filterable by year and programme. URLs like `/activities/2026/winter-clothes-fatullah`.
- **Who uses it:** the public and members; admins create entries.
- **Dependencies:** R7, R8, R17.
- **Security/privacy:**
  - Never publish lists of beneficiaries.
  - For distributions, organisers may choose to publish the details after the event to avoid uncontrolled crowds. This is a judgment call, not something observed.

### R3. Programme pages with yearly figures: Phase 1 for pages, Phase 2 for the stats table
- **What:** One page per standing programme:
  - রক্তের গ্রুপ নির্ণয় (blood grouping)
  - শিক্ষা সহায়তা ও শিক্ষা উপকরণ (education support and materials)
  - ইফতার (iftar)
  - শীতবস্ত্র (winter clothes)
  - চিকিৎসা সহায়তা (medical help)
  - ঈদ উপহার (Eid gifts)
  - সচেতনতা (awareness)
  - সীরাত কুইজ (Seerat quiz)
  - মাহফিল/কিরাত (mahfil/qirat)
  - দুর্যোগে সহায়তা (disaster help)
  - স্বেচ্ছাসেবক প্রশিক্ষণ (volunteer training)

  Each page lists that programme's activities and its gallery folder, plus a small table of yearly figures.
- **Why:**
  - As-Sunnah publishes yearly winter-relief counts (https://assunnahfoundation.org/activities/winter-relief) and a yearly beneficiary table (https://assunnahfoundation.org/self-reliance-project) [M].
  - KIN presents its work as wings (https://archive.sust.edu/campus-life/student-organizations/14) [W].
  - Prothom Alo Trust puts the programme in the URL [W].
- **How:**
  - A Programme table: slug, BN/EN name and description, gallery folder.
  - A yearly-figures table: programme, year, what is counted, number, note.
  - The programme lead enters the figures and the general secretary approves them. They feed R1 and R15.
- **Who uses it:** the public, supporters, the committee.
- **Dependencies:** R2, R7.
- **Security/privacy:** Totals only. No beneficiary names.

### R4. Committee and leadership presentation: Phase 1
- **What:** A current-committee page (for example "কার্যনির্বাহী কমিটি ২০২৫–২০২৬") showing the 12 positions in constitution order, from সভাপতি to সদস্য. An archive of past committees by session. Optionally, a table of former presidents and general secretaries.
- **Why:**
  - BdBO keeps a page per term, approved at its AGM (https://bdbo.org/bdbo-central-committee-2025-2026/) [M].
  - Jamaat puts the term years in the title (https://jamaat-e-islami.org/article-details.php?category=27&article=557) [W].
  - Islamic Foundation keeps a tenure table (https://islamicfoundation.gov.bd/pages/static-pages/6922dcf9933eb65569e12ffe) [W].
  - VBD shows boards with named posts (https://vbd.com.bd/khulna-division-board-members/) [W].
  - Leadership pages go stale (BDRCS https://bdrcs.org/managing-board/ [W]; Scouts [W]).
  - The BNP drift claim is not used (contradicted by the spot-check).
- **How:**
  - A Committee table: session label, start and end dates, approval date and meeting note, whether it is current.
  - A CommitteeSeat table: position (fixed order, BN/EN labels), member, optional photo, from/to dates for changes mid-term.
  - The committee page, the badges in the member directory and the "new committee announced" notice are all generated from these tables.
  - A new term creates a new Committee record. Old ones are archived, never overwritten.
  - Contact goes through the organisation's own channels, never personal numbers.
- **Who uses it:** the public, members, admins.
- **Dependencies:** R6 (member records).
- **Security/privacy:** Photos only with consent. Only the president and general secretary can edit.

### R5. Member directory privacy: Phase 1 (tightening the existing feature)
- **What:** A public directory with minimal fields, based on consent.
- **Why:**
  - BADHAN's indexed donor pages expose name, blood group and location (https://badhan.org/profile/579) [W].
  - Roktobondhu exposes phone numbers in URLs and permanent addresses (https://roktobondhu.com/) [W–M]. It also hides female donors' numbers, which shows what users expect.
  - BADHAN publishes T&C and a privacy policy (https://www.badhan.org/home/) [W].
  - No Islamic welfare organisation studied had a public member directory at all.
- **How:**
  - **Public fields:** name (BN/EN), photo (opt-in; default is an initials avatar), role (committee position, সদস্য or স্বেচ্ছাসেবক), thana/ward, year joined.
  - **Never public:** phone, email, address, date of birth, father's name, NID, blood group.
  - A consent checkbox at application. Members can ask to be hidden.
  - Members under 18 are not listed without a guardian's consent.
  - Add `noindex` to directory pages so search engines don't index them, and give members no individual indexable pages.
  - Paginate the list and rate-limit requests to discourage scraping. Search by name or area only.
- **Who uses it:** the public (it shows the organisation is made of real people) and members.
- **Dependencies:** R6, R21.
- **Security/privacy:** Exports only by the president or general secretary, with every export logged.

### R6. Membership flow: Phase 1 for application and status; Phase 3 for renewal and OTP
- **What:** A "how to join" explainer with eligibility rules, an online form, an application number, a public status lookup and an admin approval queue.
- **Why:**
  - Scouts: apply, the group admin accepts, an ID is issued (https://service.scouts.gov.bd/faqs) [M; the spot-check's index check agrees].
  - Eligibility above the form (https://assunnahfoundation.org/volunteer [M]; https://vbd.com.bd/faq [W]).
  - BADHAN's access request records designation and committee year (https://member.badhan.org/access/) [M].
  - Status tracking by mobile number (https://assunnahtrust.org/beneficiary/) [M].
  - Seasonal recruitment (https://duds.du.ac.bd/) [W].
  - The PDF plus Google Form model gives applicants no status (https://jamaat-e-islami.org/article-details.php?category=71&article=109) [W].
- **How:**
  - **Explainer page "কীভাবে সদস্য হবেন":** age range, area, agreement with the aims and Islamic values, unpaid service, non-political conduct, the steps, expected approval time, link to the constitution.
  - **Form fields:**
    - name (BN/EN), father's or guardian's name, date of birth, gender, mobile
    - email (optional)
    - thana/ward and a short address (kept internal)
    - institution or occupation
    - blood group (optional, with a "জানি না" option)
    - programmes of interest, skills, reference member (optional), photo (optional)
    - consent checkboxes; guardian consent and guardian phone if under 18
  - **No NID and no document uploads.**
  - **After submitting:** the applicant gets an application number such as `IJS-A-2026-0042`. Entering that number plus the mobile shows the status: জমা (submitted), যাচাই চলছে (under review), তথ্য প্রয়োজন (more information needed), অনুমোদিত (approved), বাতিল (rejected).
  - **Admin queue:** warns about duplicate mobile numbers and supports internal notes. Approving assigns a member ID. Every decision is logged with who made it and when.
  - **Recruitment switch:** open or closed, with a deadline.
  - **Phase 3:** yearly renewal or active-status confirmation. BNP's one combined new/renewal form is a model. Add SMS OTP only if there is an SMS budget; the As-Sunnah OTP claim was not found by the spot-check [SC-flag], so it is not relied on.
- **Who uses it:** applicants, guardians, approvers (organising secretary, general secretary, president).
- **Dependencies:** R5, R21, R22.
- **Security/privacy:**
  - Spam protection: a hidden honeypot field, rate limiting, and a captcha if needed.
  - The status lookup needs both the application number and the mobile, and shows no personal data.
  - Delete rejected applications after a set retention period.

### R7. Gallery and media: Phase 1 (press section in Phase 3)
- **What:** Folder = programme. Album = one activity, with title, date and place. Photos, optional video links and optional newspaper clippings.
- **Why:**
  - Anjuman names albums by event and year (https://anjumanmibd.org/usergallery) [W–M].
  - Bidyanondo splits Gallery, Video and Press (https://old.bidyanondo.org/) [W].
  - AMI embeds galleries in campaign pages (https://www.amibd.org/photo-gallery/dead-body-bathing/) [M].
  - Awami League uses photo series (https://www.albd.org/articles/photo/contents/) [W].
- **How:**
  - Album title pattern such as "শীতবস্ত্র বিতরণ ২০২৫ — ফতুল্লা", linked to its activity.
  - Bengali captions and alt text.
  - On upload: resize (about 1600 px wide), compress, make a thumbnail, and **strip EXIF data, including GPS location**.
  - Videos as YouTube or Facebook links, not hosted files (free tier).
  - Lazy-load images.
  - The album cover doubles as the image shown when the page is shared.
- **Who uses it:** the public; the publicity secretary uploads.
- **Dependencies:** R2, R3.
- **Security/privacy:**
  - Photograph aid recipients only with consent.
  - Avoid identifiable close-ups of recipients, especially women and children, and never name them.
  - Quiz photos of minors only with a guardian's consent.

### R8. Notices and announcements: Phase 1
- **What:** A dated notice board with categories, optional attachments, pinning and expiry.
- **Why:**
  - Islamic Foundation's numbered, dated table with files (https://islamicfoundation.gov.bd/pages/notices) [W–M]. It also mixes notice types without a filter, which IJS should avoid.
  - BdBO posts prize-collection and anti-impersonation notices (https://bdbo.org/bdbo-dhaka-north-regional-biology-olympiad-2026/) [W].
  - BNP announces committees as posts (https://www.bnpbd.org/programs&pressReleases/67e23d8b727386b9fbc08eda) [W].
  - BDRCS posts disaster situation updates (https://bdrcs.org/disaster-response/) [W].
- **How:**
  - Fields: automatic number (০১৭/২০২৬), date, category, title and body (BN/EN), attachment (image or Unicode PDF, with a size limit), pinned, expiry date, links to an activity, album or quiz edition.
  - Categories: সাধারণ (general), কার্যক্রম (activities), সদস্যপদ (membership), কমিটি (committee), সীরাত কুইজ, ফলাফল (results), জরুরি/দুর্যোগ (emergency/disaster).
  - A category filter. Expired notices move to the archive.
  - Ready-made templates: committee announced, quiz registration open, results published, prize collection, warning against misuse of the name.
- **Who uses it:** the public, members, guardians.
- **Dependencies:** R17.
- **Security/privacy:** Only admins publish; spam appeared where moderation was loose (Scouts). Sanitise rich text and check uploaded file types.

### R9. Events and volunteer registration: Phase 2
- **What:** Approved members can sign up to volunteer at a specific activity. Non-members get a light "volunteer interest" form.
- **Why:**
  - As-Sunnah's volunteer form with conditions (https://assunnahfoundation.org/volunteer) [M].
  - Bidyanondo's volunteer form (https://old.bidyanondo.org/volunteer/registration) [M; spot-check consistent].
  - OBHIZATRIK asks for preferred programme area (https://obhizatrik.org/become-a-volunteer/) [W].
  - BdMO's named volunteer corps with eligibility (https://matholympiad.org.bd/posts/t3e) [W].
  - BDRCS sends volunteers to local units (https://bdrcs.org/become-a-volunteer/) [W].
  - No site showed sign-up per event; this is an IJS-specific operational need.
- **How:**
  - On each upcoming activity, a "স্বেচ্ছাসেবক হিসেবে যুক্ত হোন" button: enter member ID and mobile, choose a role or shift if any, receive a confirmation.
  - Capacity limit. The coordinator sees the list, confirms people and exports it.
  - The non-member interest form asks for name, mobile, area and interests. These people are then invited to apply for membership.
  - Volunteer training sessions are ordinary activities under the স্বেচ্ছাসেবক প্রশিক্ষণ programme.
- **Who uses it:** members, activity coordinators.
- **Dependencies:** R2, R6.
- **Security/privacy:** No NID or passport uploads (Bidyanondo and OBHIZATRIK collect them; IJS doesn't need them). Sign-up lists are never public.

### R10. Volunteer-hour tracking: Phase 3 as attendance records; hour timesheets not recommended
- **What:** Record attendance per activity (took part or not, and in what role), not hours.
- **Why:**
  - No studied site tracks volunteer hours.
  - The recognition seen is certificates and appreciation letters (https://vbd.com.bd/volunteer-with-us) [W] and stories (https://vbd.com.bd/meet-the-heroes) [W].
  - Hour logging adds admin work and data that a small organisation would barely use.
- **How:**
  - After an activity, the coordinator ticks off attendees from the sign-up list.
  - The member's private view shows something like "অংশগ্রহণ: ১২টি কার্যক্রম".
  - A year-end appreciation certificate (PDF) for members above a threshold.
- **Who uses it:** coordinators, members (their own record), the committee.
- **Dependencies:** R9.
- **Security/privacy:** Visible only to the member and admins. No public leaderboards: they expose members' activity and can create pressure that conflicts with the organisation's service ethos.

### R11. Donation management: Phase 1 in-kind support page; Phase 2 manual donations only if conditions are met
- **What:**
  - **Phase 1:** a "সহযোগিতা করুন" page explaining in-kind support (clothes, books, iftar items) and how to reach the treasurer. No online money collection.
  - **Phase 2:** manual bKash/Nagad and bank details, read from one admin setting. A fund label per drive. A "I have sent money" form where the donor enters the transaction ID. Treasurer verification. Campaign summaries.
- **Why:**
  - Most organisations simply list wallet and bank details (https://www.amibd.org/donation [M]; https://bidyanondo.org/bank-information [M; exact bank list SC-flag]; https://trust.prothomalo.com/trust_contact [W]).
  - Gateways and autopay appear only at large registered bodies (https://donate.bdrcs.org/donate-online/ [M]; https://assunnahfoundation.org/donate/regular [M]).
  - Account numbers that differ between old and new pages are a real trust problem (Bidyanondo).
  - Trust signals seen elsewhere:
    - a registration number (https://old.bidyanondo.org/audit-report)
    - tax status, stated honestly (https://old.bidyanondo.org/faq)
    - "donations from inside Bangladesh only" (Prothom Alo Trust)
    - refund terms (BDRCS)
    - separate funds (https://www.czm-bd.org/czm-payment?campaign-id=1045&check-donation=1, https://www.anjumanmibd.org/donate)
- **Legal and trust considerations:** These were not researched for this report; confirm with the registering authority or a lawyer before collecting money online.
  - Find out IJS's registration status first. Searches surfaced registration pages of the Department of Social Services (dss.gov.bd) and the Department of Youth Development. Also check what the constitution says about who controls funds.
  - Use an account in the organisation's name with two signatories. **Never publish a member's personal bKash wallet.**
  - Foreign donations to Bangladeshi organisations are generally regulated through the NGO Affairs Bureau. State "শুধুমাত্র বাংলাদেশের ভেতর থেকে অনুদান গ্রহণ করা হয়" and do not offer PayPal or international cards.
  - State honestly that donations are not tax-deductible, unless IJS holds a certificate saying otherwise.
  - **Zakat:** As-Sunnah, CZM, Anjuman and AMI all run separate zakat funds. Accepting zakat brings duties around eligible recipients and separate accounting. Unless IJS has scholarly guidance and keeps separate accounts, do not ask for zakat; label funds as general or sadaqah.
- **How (Phase 2):**
  - A list of payment methods, stored once and shown everywhere.
  - A fund record per drive (iftar, winter clothes, Eid gifts, medical help).
  - The donor's report (amount, method, transaction ID, optional name or anonymous) is marked pending.
  - The treasurer checks the wallet or bank statement and marks it received or rejected, with a receipt number.
  - The public sees verified totals, spending and what was distributed. Donor names appear only with consent.
  - No live progress bars until verification is reliable.
- **Who uses it:** donors, the treasurer (কোষাধ্যক্ষ), the president and general secretary.
- **Dependencies:** R15, R21, R22.
- **Security/privacy:** Transaction IDs and phone numbers are visible to admins only. Never collect card details. Log every change. If possible, require a second person to confirm a donation as received.

### R12. Blood-donor directory: Phase 2 as an internal register; public search not recommended
- **What:** An opt-in internal register of willing donors (members, plus blood-grouping camp attendees who consent). Only authorised volunteers can search it. The public sees only totals and a request form.
- **Why:**
  - Established organisations keep donor contacts private and handle requests themselves: BDRCS has an internal database and a hotline (https://bdrcs.org/bdrcs-contact/) [M], and BADHAN keeps donor tools behind a member login (https://member.badhan.org/access/) [M].
  - Public directories exist (https://roktobondhu.com/, https://blood-bd.com/, https://blood.3s-soft.net/), but how they handle phone numbers is unclear. Roktobondhu exposes them [W–M].
  - Useful mechanics: a last-donation date with an automatic eligibility gap (https://roktobondhu.com/blog/4months/) [W] and manual verification (3s-Soft) [W].
  - No Islamic welfare organisation studied offered this, so it would set IJS apart.
- **How:**
  - Donor profile fields: blood group, whether it was verified at an IJS camp (and the camp date), thana/area, last donation date, an availability switch, consent date and scope. The phone number comes from the member record.
  - A donor counts as eligible if they are 18 or older and enough days have passed since their last donation.
  - **Set that interval with a medical professional or blood centre.** BADHAN's "16 weeks" comes from US-derived text.
  - Admin search by group, area and eligibility. Call buttons. Every contact is logged.
  - The public page "রক্তের প্রয়োজন?" shows the hotline, the request form (R13) and counts per blood group. Consider hiding counts below a minimum.
  - Camp results are given only to the person tested (on a slip), never published.
- **Who uses it:** blood-request coordinators, donors, people requesting blood.
- **Dependencies:** R6, R13, R22.
- **Security/privacy:** Blood group is health data. Phone numbers never appear in public pages, URLs or HTML. Access is limited to one role, with no export and an access log. Donors can withdraw at any time. No under-18 donors.

### R13. Emergency assistance requests: Phase 1 static page; Phase 2 blood-request queue; Phase 3 general help requests
- **What:**
  - **Phase 1:** a "জরুরি সহায়তা" page listing the IJS duty hotline, Narayanganj blood banks, hospitals and ambulances, and 999. Each number shows the date it was last checked.
  - **Phase 2:** a blood-request form that feeds an admin queue.
  - **Phase 3:** a short help-request form for medical help, winter clothes or educational materials, with checking done in person.
- **Why:**
  - Blood BD's emergency-contact list includes 999 (https://blood-bd.com/) [W].
  - AMI's 24-hour ambulance page with a phone number (https://www.amibd.org/ambulance-service) [M; spot-check consistent].
  - BDRCS's hotline [M].
  - Public request posting and push alerts exist (https://www.bloodsharebd.com/) [W].
  - As-Sunnah Trust's aid application with account tracking (https://assunnahtrust.org/beneficiary/) [M for tracking; the document fields are SC-flagged]. Its heavier version is beyond what volunteers can run.
- **How (blood request):**
  - Fields: patient's blood group, bags needed, hospital, needed-by time, requester's name, phone and relation.
  - Status flow: নতুন (new), খোঁজা হচ্ছে (searching), পাওয়া গেছে/সম্পন্ন (found/done), বন্ধ/বাতিল (closed/cancelled).
  - Assign a coordinator. Show matching donors from R12.
  - Close automatically 48 hours after the needed-by time.
  - The public sees only a yearly total of requests handled.
- **Who uses it:** patients' families, coordinators.
- **Dependencies:** R12, R22, and a real duty roster. **Do not publish a hotline nobody answers.**
- **Security/privacy:**
  - Patient details are health data: delete or anonymise them after closure (for example after 90 days).
  - **No public request board.** It would expose patients and attract scams.
  - Rate-limit the form and block spam.

### R14. Educational resources: Phase 2
- **What:** A "শিক্ষা ও সচেতনতা" section containing:
  - the Seerat quiz syllabus, book list, rules and marking scheme
  - past questions, with answers after results are out
  - short Bengali awareness articles (blood donation facts, health, disaster preparedness)
  - volunteer training material

  Downloads are Unicode PDFs.
- **Why:**
  - BdBO's syllabus page (https://bdbo.org/syllabus/) [W].
  - BdPhO's past-paper archive (https://www.bdpho.org/past-paper/13/6) [W–M].
  - Roktobondhu's Bengali blog (https://roktobondhu.com/blog/) [W].
  - Anti-patterns: health guidance copied from US sources (https://www.badhan.org/page/tips) and non-Unicode PDFs (https://jamaat-e-islami.org/publication/file/185_constitution_Jan_2020.pdf) [W].
- **How:**
  - Resource fields: type, topic tags, audience, reviewed by, review date, file.
  - Health content reviewed by a doctor or blood-centre staff.
  - Religious content cites its sources and is reviewed by a qualified alim.
  - Link to publishers instead of uploading copyrighted books.
- **Who uses it:** students, quiz participants, teachers, members.
- **Dependencies:** R19, R17.
- **Security/privacy:** Respect copyright. Limit file types and sizes.

### R15. Annual reports and transparency: Phase 2 (audited accounts Phase 3, or when legally required)
- **What:** A "স্বচ্ছতা ও প্রতিবেদন" page with:
  1. A yearly activity report generated from R2 and R3, also downloadable as a PDF.
  2. The constitution (গঠনতন্ত্র) as a Unicode PDF or HTML page.
  3. Registration status and number, if any.
  4. If money is collected, an income and expenditure summary (আয়-ব্যয়ের হিসাব) per campaign, signed off by the treasurer and president.
  5. A link to the committee history.
- **Why:**
  - Islamic Relief's annual-report archive (https://islamicrelief.org.bd/category/annual-reports/) [M].
  - Bidyanondo's audit reports by fiscal year (https://old.bidyanondo.org/audit-report) [M].
  - OBHIZATRIK's reports page (https://obhizatrik.org/reports-and-publications/) [W].
  - As-Sunnah's yearly counts (https://assunnahfoundation.org/self-reliance-project) [M].
  - VBD's bylaws PDF (https://vbd.com.bd/media/2025/04/by_laws.pdf) [W].
  - Transparency is rare among small and blood organisations, and numbers that disagree between pages damage trust (BDRCS).
- **How:** Generate the yearly page from the database and let admins add a short narrative. One finance table per campaign: received, spent by category, balance carried forward. Keep every year.
- **Who uses it:** the public, supporters, members, any registering authority.
- **Dependencies:** R3, R11.
- **Security/privacy:** Totals only. No identities of beneficiaries or donors without consent.

### R16. FAQ: Phase 1
- **What:** A bilingual FAQ covering:
  - what IJS is, and that it is non-political
  - who can join, and that there is no fee
  - how long approval takes and how to check status
  - how personal data is used
  - how committees are formed
  - quiz rules, registration, result lookup and prizes
  - how to request blood or register as a donor
  - how to contribute
  - the photo policy

  Relevant FAQ entries are linked from each form.
- **Why:**
  - The Scouts FAQ and manual reduce registration support (https://service.scouts.gov.bd/faqs) [M].
  - VBD's joining FAQ (https://vbd.com.bd/faq) [W].
  - Bidyanondo's FAQ (https://old.bidyanondo.org/faq) [W].
  - BdMO's FAQ (https://www.matholympiad.org.bd/faq.html) [W].
- **Who uses it:** everyone.
- **Dependencies:** R17.
- **Security/privacy:** None.

### R17. BN/EN language switch: Phase 1 for the interface and fixed pages; content translated gradually
- **What:** Bengali at the site root and English under `/en/`, with the same page structure. Each text field is stored in both languages, and English falls back to Bengali when a translation is missing.
- **Why:**
  - Path prefixes are used by NCP (https://ncpbd.org/en) [W; spot-check consistent] and Shibir (https://shibir.org.bd/en/news) [W].
  - BNP uses a query parameter (https://www.bnpbd.org/plan-to-build-nation/?language=bn) [W].
  - Ways it goes wrong:
    - separate posts that drift apart (https://islamicrelief.org.bd/aboutus-bn/)
    - partial English sections (https://assunnahtrust.org/en/about-us-gallery/)
    - "under construction" pages (https://shibir.org.bd/en/branches)
    - two-language titles as a stopgap (https://www.amibd.org/services)
  - **No toggle was verified on any site, so this is a design recommendation, not a copied model.**
- **How:**
  - Interface text in `bn.json` and `en.json`.
  - Content fields `*_bn` (required) and `*_en` (optional).
  - In the English view, either show the Bengali with a "বাংলা" label or leave the item out of English lists; decide per content type.
  - Store people's names in both scripts.
  - Bengali digits in the Bengali view.
  - The switch keeps the same page (`/activities/x` and `/en/activities/x`). A cookie remembers the choice, but the URL decides.
  - Set `lang` attributes and `hreflang` links.
  - A Unicode Bengali web font with `font-display: swap`.
  - Human translation only. No machine-translation widget, especially for religious text.
- **Who uses it:** Bengali readers (the main audience), Bangladeshis living abroad, English-reading partners.
- **Dependencies:** all content types.
- **Security/privacy:** None special. Escape translated text.

### R18. Social media: Phase 1 for links and sharing; Phase 3 for embeds
- **What:**
  - Facebook (and YouTube, if IJS has a channel) linked in the header, footer and contact page.
  - Share buttons on activities, notices, albums and results: Facebook, WhatsApp, Messenger, copy link. Use plain share links.
  - The website stays the permanent record.
- **Why:** Small groups appear to rely on Facebook rather than websites. Information that lives only in a feed is hard to find later. The website can hold structured records Facebook cannot: the committee, results, notices. Evidence: https://archive.sust.edu/campus-life/student-organizations/14, https://vbd.com.bd/faq [W].
- **How:** Store social links in one setting. Add share-preview tags (R20). An optional Facebook page embed in Phase 3 that loads only when clicked.
- **Who uses it:** the public, members who share posts.
- **Dependencies:** R20.
- **Security/privacy:** Load no Facebook scripts by default. Do not auto-post using stored access tokens.

### R19. Quiz and competition results (সীরাত কুইজ): Phase 1 core; Phase 2 extras
- **What:** Treat each year's quiz as an Edition with a status, categories, participants and results. Public pieces: an archive of all editions, a page per edition, a result lookup by roll number, winners lists and a printable certificate.
- **Why:**
  - Organisers give each year its own page (https://online.matholympiad.org.bd/results [M; slug pattern consistent per spot-check]; https://bdbo.org/12th-bdbo-national-biology-olympiad-2026/ [M]) and keep archives (https://bdbo.org/rbos-of-previous-years/ [W]).
  - Results are grouped by category (https://online.matholympiad.org.bd/results/selection2022/Primary) [W].
  - Roll codes carry meaning, and admit cards are looked up online (https://www.admin.bdpho.org/admit-card, https://bdpho.org/index.php/site/admit_card/1897) [W–M].
  - Each edition opens with a notice that states eligibility (https://www.bdpho.org/notice) [W].
  - Syllabus pages (https://bdbo.org/syllabus/) [W].
  - Gaps IJS can fill:
    - no site offers a public roll-number lookup or certificate verification
    - BdPhO's PDF-only results cannot be searched
    - Islamic Foundation's Seerat competitions rely on notices and PDF forms with no result lookup (https://islamicfoundation.gov.bd/site/files/adaad27d-bbcd-41ba-89a7-42557d7d4fce/জাতীয়-প্রতিযোগিতার-তথ্য-) [W]
- **How:**
  - **Edition record:** year; title ("সীরাত কুইজ প্রতিযোগিতা ২০২৬"); status (আসন্ন, নিবন্ধন চলছে, নিবন্ধন বন্ধ, পরীক্ষা সম্পন্ন, ফলাফল প্রকাশিত, আর্কাইভ); dates; venue; rules; syllabus or book; marking scheme; categories (for example class groups ক, খ, গ).
  - **Participant:** roll number such as `SQ26-K-0001` (year, category, serial); name; institution; category. A private guardian phone number or date of birth is used as the lookup key.
  - **Result:** score, rank within category, award (প্রথম, দ্বিতীয়, তৃতীয়, বিশেষ, অংশগ্রহণ), certificate code.
  - **Pages:**
    - `/quiz` lists all editions
    - `/quiz/2026` shows the details and winners by category, with a PDF of winners
    - `/quiz/2026/result`: enter roll number and phone or date of birth to see your own score, rank, award and certificate
  - **Admin:** CSV import with a preview and validation step. A publish switch keeps results hidden until released. Corrections after publishing are logged and announced in a notice.
  - **Phase 2:** printable admit slip (roll number plus phone). A certificate PDF with a code that can be checked at `/verify/<code>`. Past questions after each edition. Online registration using the same open/closed switch as R6. Notice templates for registration open, results published and prize collection.
- **Who uses it:** participants (mostly school students), guardians, teachers and institutions, the quiz committee.
- **Dependencies:** R8, R7, R17, R20.
- **Security/privacy:**
  - Participants are likely minors. Publish only winners' name, institution and category.
  - Never show phone, date of birth or guardian details.
  - Throttle the lookup and use a generic error message so roll numbers can't be guessed in bulk.
  - Don't show any login identifiers in public tables; the spot-check noted BdMO tables may show contest usernames.
  - Photos of minors only with a guardian's consent.

### R20. SEO and sharing: Phase 1
- **What:** Technical basics so pages can be found and look good when shared.
- **Why:**
  - Percent-encoded Bengali URLs (Scouts, Sandhani, Islamic Foundation).
  - A duplicate host (https://mail.jamaat-e-islami.org/news-details.php?category=3&news=312).
  - Legacy paths still indexed (https://badhan.org/laradhan/public/index.php/profile/728, https://matholympiad.org.bd/index.php?lang=en).
  - An indexed 404 (https://badhan.org/donations?organogramId=35).
  - Mislabeled titles (https://anjumanmibd.org/videos).
  - The good example: readable per-edition URLs such as BdMO's `/results/national2025` [M].
- **How:**
  - Short, stable English-letter URLs. One canonical host with a canonical tag.
  - Permanent (301) redirects whenever a URL changes, kept in a redirects table.
  - A unique Bengali page title and description on every page.
  - Share-preview tags (Open Graph and Twitter card), including a 1200×630 image and the page locale.
  - `hreflang` links between BN and EN versions.
  - A sitemap with both language versions.
  - `robots.txt` blocks `/admin`. `noindex` on the member directory and both lookup pages.
  - Structured data (JSON-LD) marking IJS as an organisation, and each activity as an event.
  - Compressed images and few scripts. Unicode PDFs.
  - **A custom domain is worth a small yearly cost.** A free-host subdomain looks less trustworthy and breaks links if the host changes.
- **Who uses it:** the public arriving from search or social media; admins.
- **Dependencies:** R17.
- **Security/privacy:** `noindex` on personal pages reduces scraping.

### R21. Trust, identity and legal pages: Phase 1
- **What:**
  - An identity page: aims, the non-political statement, Islamic values, area served.
  - A privacy policy (BN/EN), terms for forms and a photo-consent policy.
  - A warning against misuse of the name: "IJS collects money only through the accounts listed on this website."
  - Registration status and the official contact channels.
- **Why:**
  - AMI's non-political statement (https://www.amibd.org/) [M].
  - BADHAN's T&C and privacy policy (https://www.badhan.org/home/) [W].
  - BdBO's warning against misuse of its name (https://bdbo.org/bdbo-dhaka-north-regional-biology-olympiad-2026/) [W].
  - Bidyanondo displays its registration number (https://old.bidyanondo.org/audit-report) [W].
- **How:** The privacy policy lists, for each form: what is collected, why, which role can see it, how long it is kept, how to ask for correction or deletion, rules for minors and guardian consent, and that data is never sold or shared. The non-affiliation statement says only: "IJS is not affiliated with any political party."
- **Who uses it:** everyone.
- **Dependencies:** none.
- **Security/privacy:** This page is the privacy baseline for R5, R6, R12, R13 and R19.

### R22. Admin roles and content operations: Phase 1
- **What:** An admin panel with roles tied to committee positions, one shared settings record, and routines for moderation and keeping content fresh.
- **Why:**
  - Numbers disagree between pages at Bidyanondo, BDRCS, Quantum, OBHIZATRIK and VBD [M].
  - Spam appeared where moderation was loose [W].
  - Stale sections are common [M].
  - Old sites stay live with different payment details [M].
- **How:**
  - **Roles:**
    - super-admin (president and general secretary)
    - membership approver
    - content editor (notices, gallery, activities)
    - quiz admin
    - blood coordinator
    - treasurer
  - One account per person, never a shared password. Remove accounts when the committee changes.
  - Two-step login if the platform supports it.
  - An audit log of approvals, publications, deletions and exports.
  - One settings record for phone numbers, email, address, social links, payment methods, the recruitment switch and counters.
  - Monthly check: pinned notices, the current committee, upcoming activities.
  - A weekly database backup; free tiers can pause or delete inactive projects.
  - Regular dependency updates.
- **Who uses it:** the committee and admins.
- **Dependencies:** none; every other recommendation depends on this.
- **Security/privacy:** Least privilege. HTTPS. CSRF protection. Input sanitising. Upload restrictions. Secrets kept out of the code repository.

### 4.23 Features NOT appropriate for IJS now

| Feature | Seen at | Why not now | Revisit when |
|---|---|---|---|
| Card or online payment gateway (e.g. SSLCommerz) | https://donate.bdrcs.org/donate-online/ | Merchant sign-up generally needs registration documents and a bank account in the organisation's name; it also brings fees and refunds. IJS's registration status is unclear. | Registered, with an organisation bank account and regular donors |
| Recurring daily or monthly autopay | https://assunnahfoundation.org/donate/regular | Needs gateway agreements and constant reconciliation | Same as above |
| Crowdfunding with live progress bars, or per-beneficiary donation pages (OBHIZATRIK `/product/{slug}`) | https://crowdfunding1.czm-bd.org/ | Exposes beneficiaries. Needs reliable real-time accounting. Wrong numbers damage trust. | Verified bookkeeping is in place |
| International donations (PayPal, GlobalGiving) | https://obhizatrik.org/ways-to-give/ | Foreign-donation rules (verify), fees | Registered with the NGO Affairs Bureau |
| Asking for zakat, or a zakat calculator | https://czm-bd.org/zakat-calculator, https://assunnahtrust.org/zakat/ | Religious rulings must be accurate and zakat needs separate accounting; IJS is not a zakat body | Scholarly oversight and a separate fund exist |
| Ask-a-Mufti or religious Q&A | https://www.amibd.org/ask-a-mufti/ | Needs qualified scholars; brings liability and moderation work | Only with a qualified scholar team |
| Public searchable donor directory with phone numbers, or a public page per donor | https://roktobondhu.com/, https://badhan.org/profile/579 | Exposes health and contact data; risk of harassment and scams | Not recommended at any stage |
| GPS push alerts or a native mobile app | https://www.bloodsharebd.com/ | Build and maintenance cost; collects location data | Large donor base and development capacity |
| NID or document uploads (aid applications, membership) | https://assunnahtrust.org/beneficiary/, https://service.scouts.gov.bd/registration, https://obhizatrik.org/become-a-volunteer/ | Sensitive ID data on free hosting; volunteers can verify in person | Keep verification offline |
| Online live exam engine for the quiz | https://contest.matholympiad.org.bd/index.html | Cheating risk, server load, support burden | A small pilot at most |
| LMS or course platform | https://skill.assunnahfoundation.org/courses | Content production and upkeep | No |
| Discussion forum or user-posted content | https://matholympiad.org.bd/forum/viewtopic.php?t=664&p=3030; spam on the Scouts sub-site | Moderation load and spam | No |
| Separate subdomain microsites (donate., quiz., etc.) | https://donate.ncpbd.org/ | Fragmented navigation and data, extra hosting | No |
| Branch, unit or regional sub-sites | https://service.scouts.gov.bd/region-details/1 | IJS works in one area | If IJS opens branches |
| Shop or bookstore | https://assunnahtrust.org/shop/ | Commerce, stock and payments | No |
| Map-based campaign tracker | https://july.ncpbd.org | Unnecessary for one district | No |
| Online membership fees or paid tiers | https://www.bnpbd.org/registration/primary-member-fee, https://assunnahfoundation.org/membership | Conflicts with the volunteer model; means handling payments | No |
| Volunteer-hour timesheets and public leaderboards | Not seen anywhere | Admin burden, privacy, ethos | No; use R10 attendance records |
| Hand-typed homepage counters | https://blood.quantummethod.org.bd/en | They drift out of date | Use calculated counters |
| SMS OTP at launch | As-Sunnah (claim unconfirmed) | Ongoing SMS cost | Phase 3, if there is a budget |

### 4.24 Priority summary

| Phase | Items |
|---|---|
| **Phase 1 (essential)** | R1 homepage. R2 activity status. R3 programme pages. R4 committee and archive. R5 directory privacy. R6 application and status lookup. R7 gallery. R8 notices. R11 in-kind support page only. R13 static emergency page. R16 FAQ. R17 interface and fixed-page translation. R18 links and sharing. R19 editions, roll-number lookup and winners. R20 SEO basics. R21 trust and legal pages. R22 roles and settings. |
| **Phase 2 (important)** | R3 yearly figures. R9 volunteer sign-up per activity. R11 manual bKash/Nagad donations, only if the conditions are met. R12 internal donor register. R13 blood-request queue. R14 resources. R15 annual report and constitution. R19 admit slip, certificates with verification, past questions. |
| **Phase 3 (optional)** | R6 renewal and OTP. R10 attendance records and certificates. R13 general help requests. R15 audited accounts. R18 Facebook embed. R7 press clippings. |
| **Not recommended** | Everything in 4.23 |

---

## 5. Limitations of this research

1. **No site was loaded live.** Every direct fetch failed: WebFetch with `ENOTFOUND`, curl with `CONNECT 403`. This included the control hosts example.com and en.wikipedia.org, so the block covered the whole environment, not individual sites. All evidence is from search-index titles, URLs and summaries of different ages.
2. **Not assessed at all:**
   - rendered navigation (every menu above is reconstructed)
   - homepage layout and visual design
   - mobile quality, accessibility and performance
   - JavaScript behaviour
   - full form fields, approval workflows and payment flows
   - whether any site has a working language toggle
3. **The spot-check confirmed nothing live.** All 36 claims were "unreachable". Its own index check flagged these:

| Claim | Spot-check result | How this report handles it |
|---|---|---|
| BNP committee pages disagree with each other | **Contradicted**; the current index shows consistent roles, so the original was probably a stale cache | Not used |
| BNP has a separate renewal form | Appears to be one form for new members and renewals | Described as one form |
| As-Sunnah Foundation calls itself non-political and government-registered | Wording not found for this organisation (similar wording exists for As-Sunnah Trust) | The non-political statement pattern is cited from AMI instead |
| As-Sunnah volunteer form requires mobile and email verification | Not found | OTP is Phase 3 only |
| As-Sunnah membership form fields and constitution citation | Not seen; the tiers and amounts are consistent | Used only as one input among several |
| As-Sunnah tabbed "get involved" URL | URL not seen; "Join Us" options were seen | Not used |
| As-Sunnah Trust notice board, news blocks and progress bars | Not found | Not used; "hide empty sections" rests on other evidence |
| As-Sunnah Trust aid form asks for blood group, cost and document uploads | Not found; account and mobile tracking are supported | Only the tracking mechanism is used |
| Bidyanondo `/donate` page with outcome-based amounts | Not found | Not used |
| Bidyanondo bank list | Index lists BRAC, City, SIBL and DBBL with bKash, Rocket, Nagad, Upay and PayPal (no "Tap") | Specific bank details not relied on |
| Quantum blood portal has a `/bn` version | Only `/en` seen; sister subdomains use `/bn` and `/en` | The path-prefix pattern is also cited from NCP and Shibir |
| Quantum's counter figures, menu and contact details | Figures are mixed across pages; menu and contact not found | Used only to show that counters drift |
| BdMO 2025 national results columns | May show a contest username, not a registration number | R19 advises against showing login IDs |
| BdMO `/posts/12r` grouping and the 2022/2023 URLs | Not seen as claimed; other URLs that follow the same pattern are present | The pattern is still supported |
| BdBO 2019 winners tables and the regional-winner instruction | Not found | The winners-table pattern rests on BdMO |

4. **Timing.** Index snapshots differ in age. Dated items such as BdMO's 26 December 2026 qualifying round, Islamic Foundation's 2027 Hifz notice and BdPhO's 2027 registration fit today's date (28 October 2026) but are unverified and may have changed. NCP's donation page refers to the February 2026 election and may be stale.
5. **Not found or not profiled:**
   - No official site found: BNCC, Bangladesh Girl Guides, BRAC University Response Team, DUYAH, Bangladesh Olympiad in Informatics, Jubo Dal or Jubo League, Islami Jubo Andolan, local Hilful Fuzul groups, Ilman Nafiya.
   - Seen in the index or in news but not profiled: MASTUL (mastul.net), Muslim Research Centre, BMHBD, and Daniyal Muhammad Ammar Foundation (a Seerat quiz organiser that appeared only in news).
   - Bidyanondo's education pages failed to load in one segment.
6. **The sample doesn't match IJS's size.** No website was found for a small, local, non-political Islamic youth organisation, so every benchmark is larger. The recommendations scale those patterns down using judgment. Political party and wing sites were studied only for website structure; this implies no endorsement.
7. **Legal and religious points were not researched.** Statements on registration, foreign donations, tax status and zakat are general background. Verify them with the registering authority, a lawyer and qualified scholars before acting.
8. **How to close these gaps:**
   - Allow these hosts in the environment's network settings and re-run:

     badhan.org, member.badhan.org, scouts.gov.bd, service.scouts.gov.bd, matholympiad.org.bd, online.matholympiad.org.bd, bnpbd.org, ncpbd.org, albd.org, jamaat-e-islami.org, shibir.org.bd, assunnahfoundation.org, assunnahtrust.org, czm-bd.org, anjumanmibd.org, islamicrelief.org.bd, islamicfoundation.gov.bd, bidyanondo.org, bdrcs.org, donate.bdrcs.org, vbd.com.bd, roktobondhu.com, obhizatrik.org, bylc.org, sandhani.org, blood.quantummethod.org.bd, blood-bd.com, bloodsharebd.com, blood.3s-soft.net, amibd.org, bdpho.org, admin.bdpho.org, bdbo.org, trust.prothomalo.com

   - Alternatively, check these on a phone by hand. They matter most for the recommendations:
     - how Roktobondhu exposes phone numbers
     - whether Quantum's blood portal has a `/bn` version
     - whether As-Sunnah's volunteer form verifies mobile and email
     - which columns BdMO's results tables show
     - Bidyanondo's current bank and wallet page