import { test, expect, devices, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { loginAs } from "./helpers/login";

/**
 * Membership module: online application (mobile), idempotent retry, duplicate
 * ID, the English form (English messages, language switch mid-form keeps the
 * draft, English pledge with the Bengali original), public status page in both
 * languages, permissions (editor / viewer / forged server action), approval +
 * member number, directory consent, committee term and English designations,
 * rejection, member editing, photo upload, directory visibility, the under-18
 * rule (guardian consent) and noindex on the directory.
 *
 * Every applicant is created with a unique "টেস্ট …" / "Test …" name and
 * random NID / mobile; everything created here is deleted in afterAll.
 */

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    for (const line of readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
    }
  } catch {
    // fall back to process.env
  }
  return { ...env, ...(process.env as Record<string, string>) };
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const db = createClient(SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const PASSWORD = "Test@12345";
// Contexts created with browser.newContext() do not inherit the config's `use` options.
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const BN_LETTERS = "কখগঘচছজঝটঠডতথদধনপফবভমরলশসহ";
const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

const rand = (n: number, alphabet: string) => Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
const bnDigits = (s: string) => s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
const randomNid = () => `${1 + Math.floor(Math.random() * 9)}${rand(16, "0123456789")}`;
const randomMobile = () => `01${3 + Math.floor(Math.random() * 7)}${rand(8, "0123456789")}`;
const LATIN = "abcdefghijklmnopqrstuvwxyz";
const latinTag = () => {
  const t = rand(6, LATIN);
  return t[0].toUpperCase() + t.slice(1);
};
const EN_DATE = /\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) \d{4}/;

type Applicant = {
  name: string;
  nid: string;
  mobile: string;
  address: string;
  consent: boolean;
  id?: string;
  no?: string;
  memberNo?: string;
  memberId?: string;
};

function applicant(consent: boolean): Applicant {
  const tag = rand(5, BN_LETTERS);
  return {
    name: `টেস্ট ${tag} আবেদনকারী`,
    nid: randomNid(),
    mobile: randomMobile(),
    address: `গ্রাম: ${tag}পুর, ডাকঘর: ${rand(4, BN_LETTERS)}, ফতুল্লা, নারায়ণগঞ্জ`,
    consent,
  };
}

/** A (UI, consents to the directory), B (no consent), C (to be rejected). */
const A = applicant(true);
const B = applicant(false);
const C = applicant(true);
/** E: applies on the English form (switching languages mid-form). */
const E_TAG = latinTag();
const E: Applicant = {
  name: `Test ${E_TAG} Applicant`,
  nid: randomNid(),
  mobile: randomMobile(),
  address: `Village: ${E_TAG}pur, Post office: Fatullah, Narayanganj`,
  consent: false,
};
const createdIds = new Set<string>();
/** Paper-form members added through /admin/members/new (no application). */
const PAPER_TAG = rand(5, BN_LETTERS);
const paperNames = [`টেস্ট কাগজের সদস্য ${PAPER_TAG}`, `টেস্ট স্বয়ংক্রিয় নম্বর ${PAPER_TAG}`, `টেস্ট কিশোর সদস্য ${PAPER_TAG}`];
/** Members inserted directly for layout checks (deleted in afterAll). */
const extraMemberIds = new Set<string>();

/** Creates an application through the server-only database function (as the website server does). */
async function seedApplication(a: Applicant, dateOfBirth = "2000-01-15") {
  const { data, error } = await db.rpc("submit_membership_application", {
    p: {
      full_name: a.name,
      father_name: "টেস্ট পিতা",
      mother_name: "টেস্ট মাতা",
      date_of_birth: dateOfBirth,
      nationality: "বাংলাদেশী",
      religion: "ইসলাম",
      occupation: "শিক্ষার্থী",
      permanent_address: a.address,
      present_address: a.address,
      id_type: "nid",
      id_number: a.nid,
      mobile: a.mobile,
      email: null,
      blood_group: null,
      declaration_accepted: true,
      directory_consent: a.consent,
    },
    p_token: crypto.randomUUID(),
  });
  expect(error).toBeNull();
  a.id = data![0].application_id;
  a.no = data![0].application_no;
  createdIds.add(a.id!);
}

/** A new browser context signed in as a seeded staff account (shared helper; cached session). */
async function login(browser: Browser, who: string, options: Parameters<Browser["newContext"]>[0] = {}): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ baseURL: BASE_URL, locale: "bn-BD", timezoneId: "Asia/Dhaka", ...options });
  const page = await ctx.newPage();
  await loginAs(page, who);
  return { ctx, page };
}

/** Uses the BN | EN switch in the header (in the menu drawer on small screens). */
async function switchLanguage(page: Page, target: "bn" | "en") {
  const visible = page.locator(`a[hreflang=${target}]:visible`);
  if ((await visible.count()) === 0) {
    await page.getByRole("button", { name: /^(Open menu|মেনু খুলুন)$/ }).click();
  }
  const link = page.locator(`a[hreflang=${target}]:visible`).first();
  await Promise.all([
    page.waitForURL((u) => (target === "en" ? u.pathname.startsWith("/en/") : !u.pathname.startsWith("/en"))),
    link.click(),
  ]);
  await expect(page.locator("html")).toHaveAttribute("lang", target);
}

/** Today's date in Bangladesh minus whole years, as YYYY-MM-DD (plus `days`). */
function dhakaDateYearsAgo(years: number, days = 0): string {
  const now = new Date(Date.now() + 6 * 3600_000); // Asia/Dhaka (UTC+6, no DST)
  const d = new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate() + days));
  return d.toISOString().slice(0, 10);
}

/**
 * No sideways scrolling at the configured viewport width. With mobile emulation
 * (isMobile, e.g. Pixel 7) Chromium widens the layout viewport to fit content
 * that is too wide, so window.innerWidth grows with the page and cannot be the
 * reference: compare against the configured width and the root's clientWidth.
 */
async function expectNoHorizontalOverflow(page: Page) {
  const width = page.viewportSize()?.width;
  expect(width, "viewport width must be known").toBeTruthy();
  const { sw, cw } = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  expect(sw, "page must not scroll horizontally").toBeLessThanOrEqual(cw);
  expect(sw, `page must fit the ${width}px viewport`).toBeLessThanOrEqual(width!);
}

async function checkStatus(page: Page, no: string, mobile: string, lang: "bn" | "en" = "bn") {
  await page.goto(`${lang === "en" ? "/en" : ""}/membership/status?no=${encodeURIComponent(no)}`);
  await expect(page.locator("#application_no")).toHaveValue(no);
  await page.fill("#mobile", lang === "bn" ? bnDigits(mobile) : mobile); // Bengali digits are accepted
  await page.getByRole("button", { name: lang === "bn" ? "অবস্থা দেখুন" : "Check status" }).click();
  return page.getByTestId("status-result");
}

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  const ids = [...createdIds];
  // Applicants created through the UI are found by their unique test names too.
  const { data: byName } = await db
    .from("membership_applications")
    .select("id")
    .in("full_name", [A.name, B.name, C.name, E.name]);
  for (const r of byName ?? []) ids.push(r.id);
  const { data: paper } = await db.from("members").select("id, photo_path").in("full_name", paperNames);
  if (paper?.length) await db.from("members").delete().in("id", paper.map((m) => m.id));
  if (extraMemberIds.size) await db.from("members").delete().in("id", [...extraMemberIds]);
  if (ids.length === 0) return;
  const { data: members } = await db.from("members").select("id, photo_path").in("application_id", ids);
  const photos = (members ?? []).map((m) => m.photo_path).filter((p): p is string => Boolean(p));
  if (photos.length) await db.storage.from("members").remove(photos);
  if (members?.length) await db.from("members").delete().in("id", members.map((m) => m.id));
  await db.from("membership_applications").delete().in("id", ids);
});

test("mobile application: step validation, review, submit, idempotent retry and duplicate ID", async ({ browser }) => {
  test.setTimeout(120_000);
  const ctx = await browser.newContext({ ...devices["Pixel 7"], baseURL: BASE_URL, locale: "bn-BD", timezoneId: "Asia/Dhaka" });
  const page = await ctx.newPage();
  const openedAt = Date.now();
  await page.goto("/membership");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("সদস্য পদের জন্য আবেদন");
  await expectNoHorizontalOverflow(page);

  // Step 1: empty → Bengali errors, focus on the first invalid field.
  const next = page.getByRole("button", { name: "পরের ধাপ" });
  await next.click();
  await expect(page.locator("#full_name-error")).toHaveText("নাম লিখুন।");
  await expect(page.locator("#father_name-error")).toHaveText("পিতার নাম লিখুন।");
  await expect(page.locator("#date_of_birth-error")).toHaveText("জন্ম তারিখ দিন।");
  await expect(page.locator("#religion-error")).toHaveText("ধর্ম নির্বাচন করুন।");
  await expect(page.locator("#full_name")).toBeFocused();
  await expect(page.locator("#full_name")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#full_name")).toHaveAttribute("aria-describedby", "full_name-error");

  await page.fill("#full_name", "টেস্ট ২ নাম");
  await expect(page.locator("#full_name-error")).toContainText("সংখ্যা"); // live re-check of a shown error
  await page.fill("#full_name", A.name);
  await expect(page.locator("#full_name-error")).toHaveCount(0);
  await page.fill("#father_name", "টেস্ট পিতা");
  await page.fill("#mother_name", "টেস্ট মাতা");
  await page.fill("#date_of_birth", "1999-05-20");
  await page.selectOption("#religion", "অন্যান্য");
  await next.click();
  await expect(page.locator("#religion_other-error")).toHaveText("ধর্মের নাম লিখুন।");
  await page.selectOption("#religion", "ইসলাম");
  await page.fill("#occupation", "শিক্ষার্থী");
  await next.click();

  // Step 2: addresses, "same as permanent".
  await expect(page.locator("#step-heading")).toHaveText("ঠিকানা");
  await next.click();
  await expect(page.locator("#permanent_address-error")).toHaveText("স্থায়ী ঠিকানা লিখুন।");
  await page.fill("#permanent_address", A.address);
  await page.check("#same_address");
  await expect(page.locator("#present_address")).toHaveCount(0);
  await next.click();

  // Step 3: identity and contact (Bengali digits accepted, wrong lengths rejected).
  await expect(page.locator("#step-heading")).toHaveText("পরিচয় ও যোগাযোগ");
  await next.click();
  await expect(page.locator("#id_type-error")).toHaveText("পরিচয়পত্রের ধরন নির্বাচন করুন।");
  await page.check("#id_type-nid");
  await page.fill("#id_number", "১২৩");
  await page.fill("#mobile", "01212345678");
  await next.click();
  await expect(page.locator("#id_number-error")).toContainText("১০, ১৩ অথবা ১৭ সংখ্যার");
  await expect(page.locator("#mobile-error")).toContainText("সঠিক মোবাইল নম্বর");
  await page.fill("#id_number", bnDigits(A.nid));
  await page.fill("#mobile", `+88 ${A.mobile}`);
  await page.fill("#email", "not-an-email");
  await next.click();
  await expect(page.locator("#email-error")).toContainText("সঠিক ইমেইল");
  await page.fill("#email", "");
  await page.selectOption("#blood_group", "জানা নেই");
  await next.click();

  // Step 4: review with edit links and the declaration with the applicant's name.
  await expect(page.locator("#step-heading")).toHaveText("অঙ্গীকারনামা ও পর্যালোচনা");
  await expect(page.getByTestId("declaration-text").locator("strong").first()).toHaveText(A.name);
  await expect(page.getByText(A.address).first()).toBeVisible();
  await expect(page.getByText(bnDigits(A.nid))).toBeVisible();
  await page.getByRole("button", { name: "ঠিকানা সম্পাদনা করুন" }).click();
  await expect(page.locator("#step-heading")).toHaveText("ঠিকানা");
  await expect(page.locator("#permanent_address")).toHaveValue(A.address); // data kept
  await page.getByRole("button", { name: "পর্যালোচনায় ফিরে যান" }).click();
  await expect(page.locator("#step-heading")).toHaveText("অঙ্গীকারনামা ও পর্যালোচনা");

  const submit = page.getByTestId("submit-application");
  await submit.click();
  await expect(page.locator("#declaration-error")).toContainText("অঙ্গীকারনামায় সম্মতি দিন");
  await expect(page.locator("#declaration")).toBeFocused();
  await page.check("#declaration");
  await page.check("#directory_consent");

  // The server refuses forms filled in under 4 seconds; a person never is that fast.
  const wait = 4500 - (Date.now() - openedAt);
  if (wait > 0) await page.waitForTimeout(wait);

  // First attempt reaches the server but the response is lost → the retry must
  // return the SAME application (same submission token), not create a second one.
  let dropped = false;
  await page.route("**/membership", async (route) => {
    if (route.request().method() === "POST" && !dropped) {
      dropped = true;
      await route.fetch(); // the server processes it…
      await route.abort("connectionreset"); // …but the browser never sees the answer
      return;
    }
    await route.continue();
  });
  await submit.click();
  await expect(page.getByText("সার্ভারের সাথে সংযোগ করা যায়নি")).toBeVisible();
  const { data: firstRows } = await db.from("membership_applications").select("id, application_no").eq("id_number", A.nid);
  expect(firstRows).toHaveLength(1);
  A.id = firstRows![0].id;
  A.no = firstRows![0].application_no;
  createdIds.add(A.id!);

  await submit.click();
  await expect(page.getByTestId("application-success")).toBeVisible();
  await expect(page.getByTestId("tracking-number")).toHaveText(A.no!);
  await expect(page.getByText("এই আবেদনটি আগেই জমা হয়েছিল")).toBeVisible();
  expect(A.no).toMatch(/^IJS-A-\d{4}-\d{4,}$/);
  const { count } = await db.from("membership_applications").select("id", { count: "exact", head: true }).eq("id_number", A.nid);
  expect(count).toBe(1);
  await expect(page.getByRole("link", { name: "আবেদনের অবস্থা দেখুন" })).toHaveAttribute("href", `/membership/status?no=${A.no}`);
  await expectNoHorizontalOverflow(page);

  // Reloading the confirmation keeps the tracking number (it cannot be looked up otherwise).
  await page.reload();
  await expect(page.getByTestId("application-success")).toBeVisible();
  await expect(page.getByTestId("tracking-number")).toHaveText(A.no!);

  // Stored correctly (normalised digits/prefix, consent, "same as permanent").
  const { data: stored } = await db
    .from("membership_applications")
    .select("full_name, mobile, present_address, permanent_address, directory_consent, status, email, blood_group, religion")
    .eq("id", A.id!)
    .single();
  expect(stored).toMatchObject({
    full_name: A.name,
    mobile: A.mobile,
    present_address: A.address,
    permanent_address: A.address,
    directory_consent: true,
    status: "pending",
    email: null,
    blood_group: null,
    religion: "ইসলাম",
  });

  // A second application with the same NID is refused with a Bengali message.
  await page.unroute("**/membership");
  await page.getByRole("button", { name: "আরেকটি আবেদন করুন" }).click();
  const reopenedAt = Date.now();
  await page.fill("#full_name", "টেস্ট দ্বিতীয় আবেদন");
  await page.fill("#father_name", "টেস্ট পিতা");
  await page.fill("#mother_name", "টেস্ট মাতা");
  await page.fill("#date_of_birth", "1998-01-01");
  await page.selectOption("#religion", "ইসলাম");
  await page.fill("#occupation", "চাকরিজীবী");
  await next.click();
  await page.fill("#permanent_address", A.address);
  await page.check("#same_address");
  await next.click();
  await page.check("#id_type-nid");
  await page.fill("#id_number", A.nid);
  await page.fill("#mobile", randomMobile());
  await next.click();
  await page.check("#declaration");
  const wait2 = 4500 - (Date.now() - reopenedAt);
  if (wait2 > 0) await page.waitForTimeout(wait2);
  await page.getByTestId("submit-application").click();
  await expect(page.locator("#id_number-error")).toContainText("ইতিমধ্যে একটি আবেদন জমা আছে");
  await expect(page.locator("#step-heading")).toHaveText("পরিচয় ও যোগাযোগ");
  await expect(page.locator("#id_number")).toBeFocused();
  const { count: still } = await db.from("membership_applications").select("id", { count: "exact", head: true }).eq("id_number", A.nid);
  expect(still).toBe(1);
  await ctx.close();
});

test("public status page: pending, not found, validation", async ({ page }) => {
  expect(A.no, "depends on the application test").toBeTruthy();
  const result = await checkStatus(page, A.no!, A.mobile);
  await expect(result).toHaveAttribute("data-status", "pending");
  await expect(result).toContainText("অপেক্ষমাণ");
  await expect(result).toContainText(A.name);
  // Nothing private is revealed.
  const html = await page.content();
  expect(html).not.toContain(A.nid);
  expect(html).not.toContain(A.address);

  // Wrong mobile → generic "not found" (does not say which value was wrong).
  await page.fill("#mobile", randomMobile());
  await page.getByRole("button", { name: "অবস্থা দেখুন" }).click();
  await expect(page.getByTestId("status-not-found")).toContainText("তথ্য মেলেনি");
  await expect(page.getByTestId("status-result")).toHaveCount(0);

  // Both values required; lower-case tracking numbers are accepted.
  await page.goto("/membership/status");
  await page.getByRole("button", { name: "অবস্থা দেখুন" }).click();
  await expect(page.locator("#application_no-error")).toHaveText("ট্র্যাকিং নম্বর লিখুন।");
  await expect(page.locator("#mobile-error")).toHaveText("আবেদনে দেওয়া মোবাইল নম্বর লিখুন।");
  await page.fill("#application_no", A.no!.toLowerCase());
  await page.fill("#mobile", A.mobile);
  await page.getByRole("button", { name: "অবস্থা দেখুন" }).click();
  await expect(page.getByTestId("status-result")).toHaveAttribute("data-status", "pending");
});

test("English form: English messages, language switch mid-form keeps the draft, English pledge, English status page", async ({ page }) => {
  test.setTimeout(150_000);
  const openedAt = Date.now();
  await page.goto("/en/membership");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Apply for membership");
  await expect(page.locator('link[rel="alternate"][hreflang="bn"]')).toHaveAttribute("href", /\/membership$/);
  await expectNoHorizontalOverflow(page);

  // Step 1 in English: English validation messages, focus on the first invalid field.
  const nextEn = page.getByRole("button", { name: "Next step" });
  await nextEn.click();
  await expect(page.locator("#full_name-error")).toHaveText("Please enter your name.");
  await expect(page.locator("#father_name-error")).toHaveText("Please enter your father's name.");
  await expect(page.locator("#date_of_birth-error")).toHaveText("Please enter your date of birth.");
  await expect(page.locator("#religion-error")).toHaveText("Please choose your religion.");
  await expect(page.locator("#full_name")).toBeFocused();
  await page.fill("#full_name", "Test 2");
  await expect(page.locator("#full_name-error")).toHaveText("Your name cannot contain numbers.");
  await page.fill("#full_name", E.name);
  await page.fill("#father_name", "Test Father");
  await page.fill("#mother_name", "Test Mother");
  await page.fill("#date_of_birth", "1999-05-20");
  await expect(page.locator("#nationality")).toHaveValue("Bangladeshi");
  await page.selectOption("#religion", { label: "Islam" }); // stored value stays Bengali
  await page.fill("#occupation", "Student");
  await nextEn.click();
  await expect(page.locator("#step-heading")).toHaveText("Address");
  await page.fill("#permanent_address", E.address);

  // Switch to Bengali mid-form: same step, every value kept.
  await switchLanguage(page, "bn");
  await expect(page).toHaveURL(/\/membership$/);
  await expect(page.getByTestId("draft-restored")).toHaveAttribute("data-reason", "language");
  await expect(page.getByTestId("draft-restored")).toContainText("ভাষা বদলানোর পরও");
  await expect(page.locator("#step-heading")).toHaveText("ঠিকানা");
  await expect(page.locator("#permanent_address")).toHaveValue(E.address);
  await page.getByRole("button", { name: "আগের ধাপ" }).click();
  await expect(page.locator("#full_name")).toHaveValue(E.name);
  await expect(page.locator("#date_of_birth")).toHaveValue("1999-05-20");
  await expect(page.locator("#religion")).toHaveValue("ইসলাম");
  await expect(page.locator("#nationality")).toHaveValue("বাংলাদেশী"); // an untouched default follows the language
  const nextBn = page.getByRole("button", { name: "পরের ধাপ" });
  await nextBn.click();
  await page.check("#same_address");
  await nextBn.click();
  await page.check("#id_type-nid");
  await page.fill("#id_number", "123");
  await page.fill("#mobile", E.mobile);
  await nextBn.click();
  await expect(page.locator("#id_number-error")).toContainText("আপনি ৩টি সংখ্যা দিয়েছেন");

  // …and back to English: still step 3 with the ID number as typed; English message now.
  await switchLanguage(page, "en");
  await expect(page).toHaveURL(/\/en\/membership$/);
  await expect(page.getByTestId("draft-restored")).toHaveAttribute("data-reason", "language");
  await expect(page.locator("#step-heading")).toHaveText("Identity & contact");
  await expect(page.locator("#id_number")).toHaveValue("123");
  await expect(page.locator("#mobile")).toHaveValue(E.mobile);
  await nextEn.click();
  await expect(page.locator("#id_number-error")).toHaveText("A national ID number has 10, 13 or 17 digits (you entered 3).");
  await page.fill("#id_number", E.nid);
  await page.fill("#email", "not-an-email");
  await nextEn.click();
  await expect(page.locator("#email-error")).toHaveText("Please enter a valid email address (e.g. name@example.com).");
  await page.fill("#email", "");
  await nextEn.click();

  // Review: English reference translation of the pledge + the official Bengali text, both with the name.
  await expect(page.locator("#step-heading")).toHaveText("Pledge & review");
  await expect(page.getByTestId("declaration-official-note")).toContainText("The Bengali text is the official pledge");
  await expect(page.getByTestId("declaration-text")).toContainText("hereby pledge");
  await expect(page.getByTestId("declaration-text").locator("strong").first()).toHaveText(E.name);
  const original = page.getByTestId("declaration-original");
  await original.locator("summary").click();
  await expect(original.locator('[lang="bn"]')).toContainText("অঙ্গীকার");
  await expect(original.locator("strong").first()).toHaveText(E.name);
  await expect(page.locator("dd", { hasText: /^Islam$/ })).toBeVisible();
  await expect(page.locator("dd", { hasText: /^Bangladeshi$/ })).toBeVisible();
  await expect(page.locator("dd", { hasText: /^20 May 1999 \(age \d+\)$/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const submit = page.getByTestId("submit-application");
  await submit.click();
  await expect(page.locator("#declaration-error")).toHaveText("Please accept the pledge to submit your application.");
  await page.check("#declaration");
  const wait = 4500 - (Date.now() - openedAt);
  if (wait > 0) await page.waitForTimeout(wait);
  await submit.click();
  await expect(page.getByTestId("application-success")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your application has been submitted" })).toBeVisible();
  E.no = (await page.getByTestId("tracking-number").textContent())!;
  expect(E.no).toMatch(/^IJS-A-\d{4}-\d{4,}$/);
  await expect(page.getByTestId("application-success")).toContainText(/Submitted: \d{1,2} [A-Z][a-z]+ \d{4}, \d{1,2}:\d{2} (am|pm)/);
  // The draft (with the ID number) is gone from the browser once the application is submitted.
  expect(await page.evaluate(() => sessionStorage.getItem("ijs-membership-draft-v2"))).toBeNull();

  // Stored exactly as from the Bengali form (Bengali select values; language not stored).
  const { data: stored } = await db
    .from("membership_applications")
    .select("id, full_name, religion, nationality, id_number, mobile, present_address, status, email")
    .eq("id_number", E.nid)
    .single();
  expect(stored).toMatchObject({
    full_name: E.name,
    religion: "ইসলাম",
    nationality: "Bangladeshi",
    mobile: E.mobile,
    present_address: E.address,
    status: "pending",
    email: null,
  });
  E.id = stored!.id;
  createdIds.add(E.id!);

  // English status page from the confirmation.
  const statusLink = page.getByRole("link", { name: "Check application status" });
  await expect(statusLink).toHaveAttribute("href", `/en/membership/status?no=${E.no}`);
  await statusLink.click();
  await expect(page).toHaveURL(/\/en\/membership\/status\?no=/);
  await expect(page.locator("#application_no")).toHaveValue(E.no);
  await page.getByRole("button", { name: "Check status" }).click();
  await expect(page.locator("#mobile-error")).toHaveText("Please enter the mobile number given in your application.");
  await page.fill("#mobile", E.mobile);
  await page.getByRole("button", { name: "Check status" }).click();
  const result = page.getByTestId("status-result");
  await expect(result).toHaveAttribute("data-status", "pending");
  await expect(result).toContainText("Pending");
  await expect(result).toContainText(EN_DATE);
  await expect(result).not.toContainText(/[০-৯]/);
  await page.fill("#mobile", randomMobile());
  await page.getByRole("button", { name: "Check status" }).click();
  await expect(page.getByTestId("status-not-found")).toContainText("No match found");
  await expectNoHorizontalOverflow(page);

  // A draft is restored only after a reload or the language switch — not when the form is simply opened again.
  const fresh = await page.context().newPage();
  await fresh.goto("/en/membership");
  await fresh.fill("#full_name", "Test Fresh Draft");
  await fresh.goto("/membership");
  await expect(fresh.locator("#full_name")).toHaveValue("");
  await expect(fresh.getByTestId("draft-restored")).toHaveCount(0);
  await fresh.close();
});

test("content editor cannot open applications", async ({ browser }) => {
  const { ctx, page } = await login(browser, "editor");
  await page.goto("/admin/applications");
  await expect(page).not.toHaveURL(/\/admin\/applications/);
  await page.goto(`/admin/applications/${A.id}`);
  await expect(page).not.toHaveURL(/\/admin\/applications/);
  expect(await page.content()).not.toContain(A.nid);
  await page.goto("/admin/members");
  await expect(page).not.toHaveURL(/\/admin\/members/);
  await ctx.close();
});

test("committee viewer can view but not decide; forged server actions and direct DB calls are refused", async ({ browser }) => {
  test.setTimeout(90_000);
  await seedApplication(B);

  // Viewer sees the application, but no decision buttons.
  const viewer = await login(browser, "viewer");
  await viewer.page.goto("/admin/applications");
  await expect(viewer.page.getByText(B.name).filter({ visible: true }).first()).toBeVisible();
  await viewer.page.goto(`/admin/applications/${B.id}`);
  await expect(viewer.page.getByTestId("detail-application-no")).toHaveText(B.no!);
  await expect(viewer.page.getByTestId("detail-id-number")).toHaveText(B.nid);
  await expect(viewer.page.getByTestId("view-only-note")).toBeVisible();
  await expect(viewer.page.getByRole("button", { name: "অনুমোদন করুন" })).toHaveCount(0);
  await expect(viewer.page.getByRole("button", { name: "যাচাই শুরু করুন" })).toHaveCount(0);

  // Capture real action requests from a secretary's browser (aborted, so nothing changes)…
  const secretary = await login(browser, "secretary");
  const captured: { headers: Record<string, string>; body: string }[] = [];
  await secretary.page.goto(`/admin/applications/${B.id}`);
  await secretary.page.route(`**/admin/applications/${B.id}`, async (route) => {
    const req = route.request();
    if (req.method() === "POST" && req.headers()["next-action"]) {
      captured.push({ headers: req.headers(), body: req.postData() ?? "" });
      await route.abort();
      return;
    }
    await route.continue();
  });
  await secretary.page.getByRole("button", { name: "যাচাই শুরু করুন" }).click();
  await secretary.page.getByRole("button", { name: "অনুমোদন করুন" }).click();
  await secretary.page.getByTestId("confirm-approve").click();
  await expect.poll(() => captured.length).toBe(2);
  await secretary.ctx.close();

  // …and replay them with the viewer's session: the server refuses both.
  for (const c of captured) {
    const headers = Object.fromEntries(
      Object.entries(c.headers).filter(([k]) => !["cookie", "content-length", "host"].includes(k.toLowerCase())),
    );
    const res = await viewer.page.request.post(`/admin/applications/${B.id}`, { headers, data: c.body });
    expect(res.status()).toBeLessThan(500);
    expect(await res.text()).toContain("এই কাজের অনুমতি আপনার নেই");
  }
  const { data: afterForge } = await db.from("membership_applications").select("status").eq("id", B.id!).single();
  expect(afterForge!.status).toBe("pending");
  const { count: memberCount } = await db.from("members").select("id", { count: "exact", head: true }).eq("application_id", B.id!);
  expect(memberCount).toBe(0);

  // Defense in depth: the database functions refuse the viewer too.
  const anon = createClient(SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  await anon.auth.signInWithPassword({ email: "viewer@test.local", password: PASSWORD });
  const { error: rpcError } = await anon.rpc("approve_application", { p_application_id: B.id! });
  expect(rpcError?.message).toContain("PERMISSION_DENIED");
  await anon.auth.signOut({ scope: "local" }); // local: never revoke other sessions of the shared test account

  // Viewer can open member records read-only.
  await viewer.page.goto("/admin/members");
  await expect(viewer.page.getByRole("link", { name: "নতুন সদস্য যোগ করুন" })).toHaveCount(0);
  await viewer.page.goto("/admin/members/new");
  await expect(viewer.page).not.toHaveURL(/\/admin\/members\/new/);
  await viewer.ctx.close();
});

test("approve dialog: an applicant under 18 gets a note that guardian consent must be recorded first", async ({ browser }) => {
  const minor = applicant(true);
  await seedApplication(minor, dhakaDateYearsAgo(16, -10)); // 16 years old
  const { ctx, page: admin } = await login(browser, "secretary");
  await admin.goto(`/admin/applications/${minor.id}`);
  await admin.getByRole("button", { name: "অনুমোদন করুন" }).click();
  const dialog = admin.getByRole("dialog");
  const note = dialog.getByTestId("approve-minor-note");
  await expect(note).toContainText("আবেদনকারীর বয়স ১৮ বছরের কম (১৬ বছর)");
  await expect(note).toContainText("“অভিভাবকের সম্মতি আছে”");
  await expect(note).toContainText("সদস্য তালিকায় দেখা যাবেন না");
  await dialog.getByRole("button", { name: "বাতিল" }).click();
  await expect(dialog).toHaveCount(0);
  await ctx.close();
});

test("secretary approves with a designation; status page and directory follow consent", async ({ browser, page }) => {
  test.setTimeout(120_000);
  const { ctx, page: admin } = await login(browser, "secretary");

  // A: start review, then approve as an office bearer.
  await admin.goto(`/admin/applications/${A.id}`);
  await expect(admin.getByTestId("detail-directory-consent")).toContainText("সম্মতি দিয়েছেন");
  await admin.getByRole("button", { name: "যাচাই শুরু করুন" }).click();
  await expect(admin.getByTestId("detail-status")).toHaveText("যাচাই চলছে");
  await admin.getByRole("button", { name: "অনুমোদন করুন" }).click();
  await expect(admin.locator("#approve-show")).toBeEnabled();
  await expect(admin.locator("#approve-show")).toBeChecked();
  await expect(admin.getByTestId("approve-minor-note")).toHaveCount(0); // an adult applicant
  await admin.selectOption("#approve-designation", { label: "প্রচার ও প্রকাশনা বিষয়ক সম্পাদক" });
  await admin.getByTestId("confirm-approve").click();
  await expect(admin.getByTestId("new-member-no")).toHaveText(/^IJS-\d{4}-\d{4,}$/);
  A.memberNo = (await admin.getByTestId("new-member-no").textContent())!;
  await expect(admin.getByTestId("detail-status")).toHaveText("অনুমোদিত");
  await expect(admin.getByTestId("detail-member-no")).toHaveText(A.memberNo);
  const { data: memberA } = await db.from("members").select("id, member_no, show_in_directory, designations(name_bn)").eq("application_id", A.id!).single();
  expect(memberA).toMatchObject({ member_no: A.memberNo, show_in_directory: true, designations: { name_bn: "প্রচার ও প্রকাশনা বিষয়ক সম্পাদক" } });
  A.memberId = memberA!.id;

  // B: no directory consent → the toggle is disabled and explained.
  await admin.goto(`/admin/applications/${B.id}`);
  await admin.getByRole("button", { name: "অনুমোদন করুন" }).click();
  await expect(admin.locator("#approve-show")).toBeDisabled();
  await expect(admin.locator("#approve-show")).not.toBeChecked();
  await expect(admin.getByText("সম্মতি দেননি, তাই প্রকাশ করা যাবে না")).toBeVisible();
  await admin.getByTestId("confirm-approve").click();
  await expect(admin.getByTestId("new-member-no")).toBeVisible();
  B.memberNo = (await admin.getByTestId("new-member-no").textContent())!;
  expect(B.memberNo).not.toBe(A.memberNo);
  await ctx.close();

  // Public status page shows "approved" and the member number.
  const result = await checkStatus(page, A.no!, A.mobile);
  await expect(result).toHaveAttribute("data-status", "approved");
  await expect(result).toContainText("অনুমোদিত");
  await expect(page.getByTestId("member-number")).toHaveText(A.memberNo);
  // …and in English (status label and dates in English).
  const resultEn = await checkStatus(page, A.no!, A.mobile, "en");
  await expect(resultEn).toHaveAttribute("data-status", "approved");
  await expect(resultEn).toContainText("Approved");
  await expect(resultEn).toContainText("Date of decision");
  await expect(resultEn).toContainText(EN_DATE);
  await expect(page.getByTestId("member-number")).toHaveText(A.memberNo);

  // Directory: A (consented) is listed among office bearers, B is not.
  await page.goto("/members");
  await expect(page.getByTestId("members-leadership")).toContainText(A.name);
  await expect(page.getByTestId("members-leadership")).toContainText("প্রচার ও প্রকাশনা বিষয়ক সম্পাদক");
  await expect(page.getByText(B.name)).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  // English directory: English designation (designation_en), the Bengali name marked lang="bn".
  await page.goto("/en/members");
  await expect(page.getByTestId("members-leadership")).toContainText("Publicity & Publication Secretary");
  await expect(page.getByTestId("members-leadership").locator('h3[lang="bn"]', { hasText: A.name })).toBeVisible();
  await expect(page.getByText(B.name)).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  // Committee term label above the leadership, in each language. (Edited directly in the
  // database, which skips revalidatePath(): only checked against the development server.)
  if (process.env.E2E_SERVER !== "production") {
    const { data: dirRow } = await db.from("site_settings").select("value").eq("key", "directory").single();
    const original = dirRow!.value as Record<string, unknown>;
    try {
      const { error: termError } = await db
        .from("site_settings")
        .update({ value: { ...original, committee_term_bn: "কার্যনির্বাহী কমিটি ২০২৬–২৭", committee_term_en: "Executive Committee 2026–27" } })
        .eq("key", "directory");
      expect(termError).toBeNull();
      await page.goto("/members");
      await expect(page.getByTestId("committee-term")).toHaveText("কার্যনির্বাহী কমিটি ২০২৬–২৭");
      await page.goto("/en/members");
      await expect(page.getByTestId("committee-term")).toHaveText("Executive Committee 2026–27");
      // The label sits above the leadership heading.
      const termBox = (await page.getByTestId("committee-term").boundingBox())!;
      const headingBox = (await page.locator("#leaders-title").boundingBox())!;
      expect(termBox.y).toBeLessThan(headingBox.y);
      await expectNoHorizontalOverflow(page);
    } finally {
      await db.from("site_settings").update({ value: original }).eq("key", "directory");
    }
    await page.goto("/members");
    await expect(page.getByTestId("committee-term")).toHaveCount(original.committee_term_bn ? 1 : 0);
  }
  for (const q of [A.name, B.name]) {
    await page.goto(`/members?q=${encodeURIComponent(q)}`);
    const html = await page.content();
    for (const secret of [A.nid, A.mobile, bnDigits(A.mobile), A.address, B.nid, B.mobile, B.address]) {
      expect(html, "public directory must never contain private data").not.toContain(secret);
    }
  }
  await page.goto(`/members?q=${encodeURIComponent(A.name)}`);
  await expect(page.getByTestId("members-grid")).toContainText(A.memberNo);
  await page.goto(`/members?q=${encodeURIComponent(B.name)}`);
  await expect(page.getByTestId("members-count")).toHaveText("কোনো সদস্য পাওয়া যায়নি।");

  // The anonymous API cannot read the private tables either.
  const anon = createClient(SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data: leakedApps } = await anon.from("membership_applications").select("id").eq("id", A.id!);
  expect(leakedApps ?? []).toHaveLength(0);
  const { data: leakedMembers } = await anon.from("members").select("id").eq("id", A.memberId!);
  expect(leakedMembers ?? []).toHaveLength(0);
});

test("rejecting requires a reason; the applicant sees the decision", async ({ browser, page }) => {
  await seedApplication(C);
  const { ctx, page: admin } = await login(browser, "secretary");
  await admin.goto(`/admin/applications/${C.id}`);
  await admin.getByRole("button", { name: "প্রত্যাখ্যান করুন" }).click();
  await expect(admin.locator("#decision-note")).toBeFocused(); // the field to fill, not the close button
  await admin.getByTestId("confirm-note").click();
  await expect(admin.locator("#decision-note-error")).toContainText("কমপক্ষে ৩ অক্ষর");
  await expect(admin.locator("#decision-note")).toBeFocused();
  const { data: unchanged } = await db.from("membership_applications").select("status").eq("id", C.id!).single();
  expect(unchanged!.status).toBe("pending");

  await admin.fill("#decision-note", "টেস্ট: তথ্য যাচাই করা যায়নি");
  await admin.getByTestId("confirm-note").click();
  await expect(admin.getByTestId("detail-status")).toHaveText("প্রত্যাখ্যাত");
  await expect(admin.getByTestId("review-done")).toBeFocused(); // focus is not lost to <body>
  await expect(admin.getByTestId("detail-decision-note")).toHaveText("টেস্ট: তথ্য যাচাই করা যায়নি");
  await expect(admin.getByRole("button", { name: "পুনর্বিবেচনা করুন" })).toBeVisible();
  await expect(admin.getByTestId("status-history")).toContainText("প্রত্যাখ্যাত");
  await ctx.close();

  const result = await checkStatus(page, C.no!, C.mobile);
  await expect(result).toHaveAttribute("data-status", "rejected");
  await expect(result).toContainText("প্রত্যাখ্যাত");
  await expect(result).not.toContainText("তথ্য যাচাই করা যায়নি"); // the internal reason is not shown publicly
  const resultEn = await checkStatus(page, C.no!, C.mobile, "en");
  await expect(resultEn).toHaveAttribute("data-status", "rejected");
  await expect(resultEn).toContainText("Rejected");
  await expect(resultEn.getByRole("link", { name: "contact us" })).toHaveAttribute("href", "/en/contact");
  await expect(resultEn).not.toContainText("তথ্য যাচাই করা যায়নি");
});

test("admin edits a member, uploads a photo and toggles directory visibility", async ({ browser, page }) => {
  test.setTimeout(120_000);
  expect(A.memberId, "depends on the approval test").toBeTruthy();
  const png = await sharp({ create: { width: 640, height: 800, channels: 3, background: { r: 11, g: 93, b: 59 } } })
    .composite([{ input: Buffer.from('<svg width="640" height="800"><circle cx="320" cy="260" r="150" fill="#e8c9a0"/></svg>') }])
    .png()
    .toBuffer();

  const { ctx, page: admin } = await login(browser, "admin");
  await admin.goto("/admin/members");
  await admin.fill("#members-q", A.memberNo!);
  await admin.getByRole("button", { name: "খুঁজুন" }).click();
  await expect(admin.getByTestId("members-admin-count")).toContainText("১ জন");
  await admin.goto(`/admin/members/${A.memberId}`);
  await expect(admin.getByTestId("member-detail-no")).toHaveText(A.memberNo!);
  await expect(admin.getByTestId("member-application-link")).toHaveAttribute("href", `/admin/applications/${A.id}`);

  // Photo: generated PNG → square WebP in members/photos/.
  await admin.getByTestId("photo-input").setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: png });
  await admin.getByTestId("photo-save").click();
  await expect(admin.getByText("ছবি সংরক্ষণ করা হয়েছে।")).toBeVisible();
  await expect
    .poll(async () => (await db.from("members").select("photo_path").eq("id", A.memberId!).single()).data?.photo_path ?? "")
    .toMatch(/^photos\/[0-9a-f-]{36}\.(webp|jpg)$/);
  const { data: withPhoto } = await db.from("members").select("photo_path").eq("id", A.memberId!).single();
  const photoRes = await page.request.get(`${SUPABASE_URL}/storage/v1/object/public/members/${withPhoto!.photo_path}`);
  expect(photoRes.ok()).toBe(true);
  const meta = await sharp(Buffer.from(await photoRes.body())).metadata();
  expect(meta.width).toBe(meta.height); // square crop
  expect(meta.width).toBeLessThanOrEqual(600);

  // Edit: name, notes; the directory shows the photo.
  await admin.fill("#notes", "টেস্ট নোট");
  await admin.getByTestId("member-save").click();
  await expect(admin.getByText("পরিবর্তন সংরক্ষণ করা হয়েছে।")).toBeVisible();
  await page.goto(`/members?q=${encodeURIComponent(A.name)}`);
  await expect(page.locator(`img[src*="${withPhoto!.photo_path}"]`)).toBeVisible();

  // Replacing the photo deletes the previous file from storage.
  const oldPath = withPhoto!.photo_path!;
  const objectUrl = (p: string) => `${SUPABASE_URL}/storage/v1/object/public/members/${p}`;
  const png2 = await sharp({ create: { width: 500, height: 500, channels: 3, background: { r: 201, g: 165, b: 76 } } }).png().toBuffer();
  await admin.getByTestId("photo-input").setInputFiles({ name: "photo2.png", mimeType: "image/png", buffer: png2 });
  await admin.getByTestId("photo-save").click();
  await expect(admin.getByText("ছবি সংরক্ষণ করা হয়েছে।")).toBeVisible();
  await expect
    .poll(async () => (await db.from("members").select("photo_path").eq("id", A.memberId!).single()).data?.photo_path)
    .not.toBe(oldPath);
  await expect.poll(async () => (await page.request.get(objectUrl(oldPath))).ok()).toBe(false);

  // Hide from the directory → gone from the public list, and the photo URL that
  // was published stops working (the file moves to a new random name).
  const { data: published } = await db.from("members").select("photo_path").eq("id", A.memberId!).single();
  expect((await page.request.get(objectUrl(published!.photo_path!))).ok()).toBe(true);
  await admin.uncheck("#show_in_directory");
  await admin.getByTestId("member-save").click();
  await expect(admin.getByText("পরিবর্তন সংরক্ষণ করা হয়েছে।")).toBeVisible();
  await expect.poll(async () => (await db.from("members").select("show_in_directory").eq("id", A.memberId!).single()).data?.show_in_directory).toBe(false);
  const { data: hidden } = await db.from("members").select("photo_path").eq("id", A.memberId!).single();
  expect(hidden!.photo_path).toMatch(/^photos\/[0-9a-f-]{36}\.(webp|jpg)$/);
  expect(hidden!.photo_path).not.toBe(published!.photo_path);
  expect((await page.request.get(objectUrl(published!.photo_path!))).ok()).toBe(false);
  expect((await page.request.get(objectUrl(hidden!.photo_path!))).ok()).toBe(true); // kept for the admin panel
  await page.goto(`/members?q=${encodeURIComponent(A.name)}`);
  await expect(page.getByTestId("members-count")).toHaveText("কোনো সদস্য পাওয়া যায়নি।");

  await admin.check("#show_in_directory");
  await admin.getByTestId("member-save").click();
  await expect.poll(async () => (await db.from("members").select("show_in_directory").eq("id", A.memberId!).single()).data?.show_in_directory).toBe(true);
  await page.goto(`/members?q=${encodeURIComponent(A.name)}`);
  await expect(page.getByTestId("members-grid")).toContainText(A.name);
  await expect(page.locator(`img[src*="${hidden!.photo_path}"]`)).toBeVisible();

  // Removing it clears the record and the file (asks for confirmation first; "বাতিল" has focus).
  const { data: replaced } = await db.from("members").select("photo_path").eq("id", A.memberId!).single();
  await admin.getByRole("button", { name: "ছবি সরান" }).click();
  await expect(admin.getByRole("dialog").getByRole("button", { name: "বাতিল" })).toBeFocused();
  await admin.getByRole("dialog").getByRole("button", { name: "ছবি সরান" }).click();
  await expect(admin.getByText("ছবি সরিয়ে ফেলা হয়েছে।")).toBeVisible();
  await expect.poll(async () => (await db.from("members").select("photo_path").eq("id", A.memberId!).single()).data?.photo_path).toBeNull();
  expect((await page.request.get(objectUrl(replaced!.photo_path!))).ok()).toBe(false);

  // Without consent the visibility toggle is disabled (and the database refuses it anyway).
  await admin.uncheck("#directory_consent");
  await expect(admin.locator("#show_in_directory")).toBeDisabled();
  await admin.reload();
  const { error: dbRefusal } = await db.from("members").update({ show_in_directory: true, directory_consent: false }).eq("id", A.memberId!);
  expect(dbRefusal?.message).toContain("members_directory_requires_consent");

  // Archiving asks for confirmation and removes the member from the directory.
  await admin.selectOption("#status", "archived");
  await admin.getByTestId("member-save").click();
  await admin.getByTestId("confirm-status").click();
  await expect(admin.getByText("পরিবর্তন সংরক্ষণ করা হয়েছে।")).toBeVisible();
  await page.goto(`/members?q=${encodeURIComponent(A.name)}`);
  await expect(page.getByTestId("members-count")).toHaveText("কোনো সদস্য পাওয়া যায়নি।");
  await ctx.close();
});

test("secretary adds a paper-form member: manual number validated and unique, blank number automatic", async ({ browser, page }) => {
  test.setTimeout(90_000);
  const manualNo = `IJS-1999-${rand(5, "123456789")}`;
  const phone = randomMobile();
  const { ctx, page: admin } = await login(browser, "secretary");
  await admin.goto("/admin/members");
  await admin.getByRole("link", { name: "নতুন সদস্য যোগ করুন" }).click();
  await expect(admin).toHaveURL(/\/admin\/members\/new$/);

  // Malformed number and missing name are refused with Bengali messages.
  await admin.fill("#member_no", "১২৩");
  await admin.getByTestId("member-save").click();
  await expect(admin.locator("#member_no-error")).toContainText("IJS-বছর-ক্রম");
  await expect(admin.locator("#full_name-error")).toHaveText("নাম লিখুন।");

  // Lower-case / Bengali-digit input is normalised.
  await admin.fill("#member_no", manualNo.toLowerCase().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]));
  await admin.fill("#full_name", paperNames[0]);
  await admin.selectOption("#designation_id", { label: "সদস্য" });
  await admin.fill("#joined_on", "2020-01-15");
  await expect(admin.locator("#show_in_directory")).toBeDisabled();
  await admin.check("#directory_consent");
  await admin.check("#show_in_directory");
  await admin.check("#public_phone_consent");
  await admin.fill("#public_phone", phone);
  await admin.getByTestId("member-save").click();
  await expect(admin).toHaveURL(/\/admin\/members\/[0-9a-f-]{36}\?created=1$/);
  await expect(admin.getByText("নতুন সদস্য যোগ করা হয়েছে।")).toBeVisible();
  await expect(admin.getByTestId("member-detail-no")).toHaveText(manualNo);

  // The same number cannot be used twice.
  await admin.goto("/admin/members/new");
  await admin.fill("#member_no", manualNo);
  await admin.fill("#full_name", paperNames[1]);
  await admin.getByTestId("member-save").click();
  await expect(admin.locator("#member_no-error")).toContainText("ইতিমধ্যে অন্য সদস্যের");

  // Blank number → next automatic number.
  await admin.fill("#member_no", "");
  await admin.getByTestId("member-save").click();
  await expect(admin).toHaveURL(/created=1$/);
  await expect(admin.getByTestId("member-detail-no")).toHaveText(/^IJS-\d{4}-\d{4,}$/);
  await expect(admin.getByTestId("member-detail-no")).not.toHaveText(manualNo);
  await ctx.close();

  // Public directory: listed (consented) with the consented phone in Bengali digits.
  await page.goto(`/members?q=${encodeURIComponent(paperNames[0])}`);
  await expect(page.getByTestId("members-grid")).toContainText(manualNo);
  await expect(page.getByTestId("members-grid")).toContainText(bnDigits(phone));
  await page.goto(`/members?q=${encodeURIComponent(paperNames[1])}`);
  await expect(page.getByTestId("members-count")).toHaveText("কোনো সদস্য পাওয়া যায়নি।"); // no consent → not listed
});

test("under-18 rule: a 15-year-old consenting member is listed only after the guardian's consent is recorded", async ({ browser, page }) => {
  test.setTimeout(120_000);
  const name = paperNames[2];
  const dob = dhakaDateYearsAgo(15, -40); // 15 years and 40 days old
  const { ctx, page: admin } = await login(browser, "secretary");
  await admin.goto("/admin/members/new");
  await admin.fill("#full_name", name);
  await admin.selectOption("#designation_id", { label: "সদস্য" });
  await admin.fill("#joined_on", "2025-01-15");
  await admin.fill("#date_of_birth", dob);
  await expect(admin.getByTestId("member-age")).toHaveText(/বয়স: ১৫ বছর/);
  await admin.check("#directory_consent");
  await admin.check("#show_in_directory");
  await expect(admin.getByTestId("minor-hidden-hint")).toContainText("অভিভাবকের সম্মতি চিহ্নিত নেই");
  await expect(admin.locator("#guardian_consent")).not.toBeChecked();
  await admin.getByTestId("member-save").click();
  await expect(admin).toHaveURL(/\/admin\/members\/[0-9a-f-]{36}\?created=1$/);
  await expect(admin.getByText("১৮ বছরের কম — অভিভাবকের সম্মতি নেই")).toBeVisible();
  await expect(admin.getByText("তালিকায় প্রকাশিত নয়")).toBeVisible();
  const { data: row } = await db
    .from("members")
    .select("id, date_of_birth, guardian_consent, directory_consent, show_in_directory, status")
    .eq("full_name", name)
    .single();
  expect(row).toMatchObject({ date_of_birth: dob, guardian_consent: false, directory_consent: true, show_in_directory: true, status: "active" });

  // Consenting, shown and active — but not in the public directory (view rule), in either language or via the API.
  await page.goto(`/members?q=${encodeURIComponent(name)}`);
  await expect(page.getByTestId("members-count")).toHaveText("কোনো সদস্য পাওয়া যায়নি।");
  await page.goto(`/en/members?q=${encodeURIComponent(name)}`);
  await expect(page.getByTestId("members-count")).toHaveText("No members found.");
  const anon = createClient(SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data: hiddenRows } = await anon.from("public_members").select("id").eq("id", row!.id);
  expect(hiddenRows ?? []).toHaveLength(0);
  const { data: admins } = await anon.from("members").select("date_of_birth").eq("id", row!.id);
  expect(admins ?? []).toHaveLength(0); // the date of birth itself is never public

  // Recording the guardian's consent lists the member.
  await admin.check("#guardian_consent");
  await expect(admin.getByTestId("minor-hidden-hint")).toHaveCount(0);
  await admin.getByTestId("member-save").click();
  await expect(admin.getByText("পরিবর্তন সংরক্ষণ করা হয়েছে।")).toBeVisible();
  await expect(admin.getByText("সদস্য তালিকায় প্রকাশিত", { exact: true })).toBeVisible();
  await page.goto(`/members?q=${encodeURIComponent(name)}`);
  await expect(page.getByTestId("members-grid")).toContainText(name);
  await page.goto(`/en/members?q=${encodeURIComponent(name)}`);
  await expect(page.getByTestId("members-grid")).toContainText(name);
  await expect(page.getByTestId("members-grid")).toContainText("Member");
  const html = await page.content();
  expect(html, "the date of birth is never published").not.toContain(dob);

  // Withdrawing it hides the member again.
  await admin.uncheck("#guardian_consent");
  await admin.getByTestId("member-save").click();
  await expect(admin.getByText("পরিবর্তন সংরক্ষণ করা হয়েছে।")).toBeVisible();
  await expect(admin.getByTestId("minor-hidden-hint")).toBeVisible();
  await page.goto(`/members?q=${encodeURIComponent(name)}`);
  await expect(page.getByTestId("members-count")).toHaveText("কোনো সদস্য পাওয়া যায়নি।");

  // The admin list flags it; an adult date of birth needs no guardian consent.
  await admin.goto(`/admin/members?q=${encodeURIComponent(name)}`);
  await expect(admin.getByText("অভিভাবকের সম্মতি প্রয়োজন").filter({ visible: true }).first()).toBeVisible();
  await admin.goto(`/admin/members/${row!.id}`);
  await admin.fill("#date_of_birth", dhakaDateYearsAgo(18));
  await expect(admin.getByTestId("member-age")).toHaveText(/বয়স: ১৮ বছর/);
  await expect(admin.getByTestId("minor-hidden-hint")).toHaveCount(0);
  await admin.getByTestId("member-save").click();
  await expect(admin.getByText("পরিবর্তন সংরক্ষণ করা হয়েছে।")).toBeVisible();
  await page.goto(`/members?q=${encodeURIComponent(name)}`);
  await expect(page.getByTestId("members-grid")).toContainText(name); // 18 today → listed
  await ctx.close();
});

test("public membership pages in both languages: noindex on the directory only, translated pledge page", async ({ page }) => {
  for (const url of ["/members", "/en/members"]) {
    await page.goto(url);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");
  }
  for (const url of ["/membership", "/en/membership", "/membership/status", "/en/membership/status", "/membership/terms", "/en/membership/terms"]) {
    await page.goto(url);
    await expect(page.locator('meta[name="robots"]'), url).toHaveCount(0);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]'), url).toHaveAttribute("href", /\/en\/membership/);
  }
  // Pledge page in English: reference translation, the official Bengali text one click away.
  await page.goto("/en/membership/terms");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Membership pledge & terms");
  await expect(page.getByTestId("terms-official-note")).toContainText("The Bengali text is the official pledge");
  await expect(page.getByTestId("terms-declaration")).toContainText("Applicant's name");
  await page.getByTestId("terms-declaration-original").locator("summary").click();
  await expect(page.getByTestId("terms-declaration-original")).toContainText("আবেদনকারীর নাম");
  await expect(page.getByRole("link", { name: "Application status" }).first()).toHaveAttribute("href", "/en/membership/status");
  await expectNoHorizontalOverflow(page);
  await page.goto("/membership/terms");
  await expect(page.getByTestId("terms-official-note")).toHaveCount(0);
  await expect(page.getByTestId("terms-declaration")).toContainText("আবেদনকারীর নাম");
  // Status page in English: the four statuses explained.
  await page.goto("/en/membership/status");
  await expect(page.getByTestId("status-meanings")).toContainText("Pending");
  await expect(page.getByTestId("status-meanings")).toContainText("Under review");
  await expect(page.getByTestId("status-meanings")).toContainText("Approved");
  await expect(page.getByTestId("status-meanings")).toContainText("Rejected");
});

test("long names wrap; stale admin links and out-of-range pages stay inside the admin panel", async ({ browser, page }) => {
  test.setTimeout(90_000);
  // Names typed without spaces must wrap instead of widening the page.
  const long = `টেস্ট${rand(40, BN_LETTERS)}`;
  const L: Applicant = { ...applicant(false), name: `${long}আবেদন` };
  await seedApplication(L);
  const { data: designations } = await db.from("designations").select("id, name_bn").in("name_bn", ["সহ সভাপতি", "সদস্য"]);
  const designationId = (name: string) => designations!.find((d) => d.name_bn === name)!.id;
  for (const [name, designation] of [[`${long}নেতা`, "সহ সভাপতি"], [`${long}সদস্য`, "সদস্য"]]) {
    const { data, error } = await db
      .from("members")
      .insert({ member_no: "", full_name: name, designation_id: designationId(designation), status: "active", joined_on: "2024-01-01", directory_consent: true, show_in_directory: true })
      .select("id")
      .single();
    expect(error).toBeNull();
    extraMemberIds.add(data!.id);
  }

  await page.goto("/members");
  await expect(page.getByTestId("members-leadership")).toContainText(`${long}নেতা`);
  await expectNoHorizontalOverflow(page);
  const narrow = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 360, height: 800 } });
  const small = await narrow.newPage();
  await small.goto("/members");
  await expect(small.getByTestId("members-grid")).toContainText(`${long}সদস্য`);
  await expectNoHorizontalOverflow(small);
  await narrow.close();

  for (const width of [360, 1280]) {
    const { ctx, page: admin } = await login(browser, "secretary", { viewport: { width, height: 800 } });
    for (const url of ["/admin/applications?status=all", "/admin/members", `/admin/applications/${L.id}`]) {
      await admin.goto(url);
      await expect(admin.getByText(long, { exact: false }).filter({ visible: true }).first()).toBeVisible();
      await expectNoHorizontalOverflow(admin);
    }
    if (width === 1280) {
      // The row's link stays inside the table (it used to be pushed out of view).
      await admin.goto("/admin/applications?status=all");
      const link = admin.getByRole("link", { name: `${L.name}-এর আবেদন দেখুন` });
      const box = (await link.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }

    // A missing record keeps the admin panel and offers the way back to the list.
    await admin.goto("/admin/applications/00000000-0000-4000-8000-000000000000");
    await expect(admin.getByTestId("admin-record-not-found")).toContainText("আবেদনটি খুঁজে পাওয়া যায়নি");
    await expect(admin.getByTestId("admin-record-not-found").getByRole("link", { name: "সব আবেদন" })).toBeVisible();
    await admin.goto("/admin/members/00000000-0000-4000-8000-000000000000");
    await expect(admin.getByTestId("admin-record-not-found")).toContainText("সদস্যের রেকর্ডটি খুঁজে পাওয়া যায়নি");

    // A page number past the end goes to the last page that exists.
    await admin.goto("/admin/applications?status=all&page=999");
    await expect(admin).toHaveURL(/\/admin\/applications\?status=all(&page=\d+)?$/);
    await expect(admin).not.toHaveURL(/page=999/);
    await expect(admin.getByTestId("applications-count")).toBeVisible();
    await expect(admin.getByText("এই তালিকায় কোনো আবেদন নেই")).toHaveCount(0);
    await admin.goto("/admin/members?page=999");
    await expect(admin).toHaveURL(/\/admin\/members(\?page=\d+)?$/);
    await expect(admin).not.toHaveURL(/page=999/);
    await expect(admin.getByText("কোনো সদস্য পাওয়া যায়নি")).toHaveCount(0);
    await ctx.close();
  }
});

test("closed applications: notice shown and an already-open form is refused; directory can be switched off", async ({ browser }) => {
  test.setTimeout(90_000);
  const { data: rows } = await db.from("site_settings").select("key, value").in("key", ["membership", "directory"]);
  const original = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value])) as Record<string, Record<string, unknown>>;
  expect(original.membership?.is_open, "test expects applications to be open").toBe(true);

  const ctx = await browser.newContext({ baseURL: BASE_URL, locale: "bn-BD", timezoneId: "Asia/Dhaka" });
  const page = await ctx.newPage();
  const D = applicant(true);
  await page.goto("/membership");
  // Fill the whole form while applications are still open.
  const next = page.getByRole("button", { name: "পরের ধাপ" });
  await page.fill("#full_name", D.name);
  await page.fill("#father_name", "টেস্ট পিতা");
  await page.fill("#mother_name", "টেস্ট মাতা");
  await page.fill("#date_of_birth", "2001-07-01");
  await page.selectOption("#religion", "ইসলাম");
  await page.fill("#occupation", "শিক্ষার্থী");
  await next.click();
  await page.fill("#permanent_address", D.address);
  await page.check("#same_address");
  await next.click();
  await page.check("#id_type-birth_reg");
  await page.fill("#id_number", D.nid);
  await page.fill("#mobile", D.mobile);
  await next.click();
  await page.check("#declaration");
  await page.waitForTimeout(4500);

  try {
    await db.from("site_settings").update({ value: { ...original.membership, is_open: false } }).eq("key", "membership");
    await db.from("site_settings").update({ value: { ...original.directory, enabled: false } }).eq("key", "directory");

    await page.getByTestId("submit-application").click();
    await expect(page.getByText("নতুন সদস্য আবেদন গ্রহণ বন্ধ আছে")).toBeVisible();
    const { count } = await db.from("membership_applications").select("id", { count: "exact", head: true }).eq("id_number", D.nid);
    expect(count).toBe(0);

    // /membership is a cached (ISR) page. This test edits site_settings directly,
    // which skips the revalidatePath() the admin content form performs, so on a
    // production server (E2E_SERVER=production) the cached page may still show the
    // form for up to 5 minutes; the refusal above is the security guarantee.
    if (process.env.E2E_SERVER !== "production") {
      await page.goto("/membership");
      await expect(page.getByTestId("membership-closed")).toBeVisible();
      await expect(page.getByTestId("application-form")).toHaveCount(0);
      await page.goto("/en/membership");
      await expect(page.getByTestId("membership-closed")).toContainText("New applications are paused for now");
      await expect(page.getByRole("link", { name: "Status of an earlier application" })).toHaveAttribute("href", "/en/membership/status");
      await expect(page.getByTestId("application-form")).toHaveCount(0);
    }
    const res = await page.goto("/members");
    expect(res?.status()).toBe(404);
  } finally {
    await db.from("site_settings").update({ value: original.membership }).eq("key", "membership");
    await db.from("site_settings").update({ value: original.directory }).eq("key", "directory");
    await ctx.close();
  }
});
