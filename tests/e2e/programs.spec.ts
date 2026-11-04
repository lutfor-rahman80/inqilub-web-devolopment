import { test, expect, type Browser, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { storageStateFor, TEST_PASSWORD } from "./helpers/login";

/**
 * Programs (কর্মসূচি): admin creates programs in every status → they appear
 * in the right /programs tabs (Bengali and English with fallback); slug lock
 * after publishing; cover/photo category rules (UI and database); unpublished
 * programs stay hidden; 404s; delete; accessibility and overflow checks.
 *
 * Creates only uniquely named data (removed afterwards). Photos are small
 * generated WebP files in two existing category folders.
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
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CAT_A = "volunteering";
const CAT_B = "awareness-campaigns";
const STATUSES = ["upcoming", "ongoing", "completed", "postponed", "cancelled"] as const;
type Status = (typeof STATUSES)[number];
const STATUS_BN: Record<Status, string> = { upcoming: "আসন্ন", ongoing: "চলমান", completed: "সম্পন্ন", postponed: "স্থগিত", cancelled: "বাতিল" };

test.describe.configure({ mode: "serial" });

let run = "";
const states: Record<string, string> = {};
const cats: Record<string, { id: string; slug: string; name_bn: string; name_en: string | null }> = {};
const images: Record<string, { id: string; storage_path: string; thumb_path: string }> = {};
const created: Record<string, { id: string; slug: string; title: string }> = {};
const storagePaths: string[] = [];

/** YYYY-MM-DD in Asia/Dhaka, shifted by `days`. */
function dhakaDate(days = 0): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date(Date.now() + days * 86_400_000));
}

const title = (s: string) => `ই২ই-কর্মসূচি-${run}-${s}`;

async function pageAs(browser: Browser, who: string | null): Promise<Page> {
  const ctx = await browser.newContext(who ? { storageState: states[who] } : {});
  return ctx.newPage();
}

async function sessionClient(who: string): Promise<SupabaseClient> {
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email: `${who}@test.local`, password: TEST_PASSWORD });
  expect(error).toBeNull();
  return client;
}

async function expectNoHorizontalOverflow(page: Page) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw, "page must not scroll horizontally").toBeLessThanOrEqual(iw);
}

const axePath = path.join(process.cwd(), "node_modules/axe-core/axe.min.js");
/** axe-core WCAG 2 A/AA scan of the page content (<main>); violations as "rule: target" strings. */
async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ path: axePath });
  const result = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe;
    return axe.run({ include: [["main"]] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
  });
  return result.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(" ")}`));
}

/** A tiny registered photo in a category folder (file + gallery row). */
async function makeImage(key: string, slug: string, published: boolean) {
  const file = crypto.randomUUID();
  const full = `activities/${slug}/${file}.webp`;
  const thumb = `activities/${slug}/thumbs/${file}.webp`;
  const buf = await sharp({ create: { width: 320, height: 240, channels: 3, background: published ? "#3e6b52" : "#8a6c22" } }).webp().toBuffer();
  for (const p of [full, thumb]) {
    const { error } = await db.storage.from("gallery").upload(p, buf, { contentType: "image/webp" });
    expect(error).toBeNull();
    storagePaths.push(p);
  }
  const { data, error } = await db
    .from("gallery_images")
    .insert({
      category_id: cats[slug].id,
      storage_path: full,
      thumb_path: thumb,
      width: 320,
      height: 240,
      caption: `ই২ই-ছবি-${run}-${key}`,
      is_published: published,
      source: "upload",
    })
    .select("id, storage_path, thumb_path")
    .single();
  expect(error).toBeNull();
  images[key] = data as { id: string; storage_path: string; thumb_path: string };
}

/** Fills the program form (new or edit page) and saves it. */
async function fillProgram(
  page: Page,
  v: { category?: string; titleBn?: string; titleEn?: string; startsOn?: string; endsOn?: string; status?: "" | "postponed" | "cancelled"; slug?: string; publish?: boolean; summaryBn?: string; location?: string },
) {
  if (v.category) await page.locator("#category_id").selectOption(cats[v.category].id);
  if (v.titleBn !== undefined) await page.locator("#title_bn").fill(v.titleBn);
  if (v.titleEn !== undefined) await page.locator("#title_en").fill(v.titleEn);
  if (v.summaryBn !== undefined) await page.locator("#summary_bn").fill(v.summaryBn);
  if (v.location !== undefined) await page.locator("#location_bn").fill(v.location);
  if (v.startsOn !== undefined) await page.locator("#starts_on").fill(v.startsOn);
  if (v.endsOn !== undefined) await page.locator("#ends_on").fill(v.endsOn);
  if (v.status !== undefined) await page.locator("#status_override").selectOption(v.status);
  if (v.slug !== undefined) await page.locator("#slug").fill(v.slug);
  if (v.publish !== undefined) await page.locator("#is_published").setChecked(v.publish);
}

async function createProgram(page: Page, key: string, v: Parameters<typeof fillProgram>[1]) {
  await page.goto("/admin/programs/new");
  await fillProgram(page, v);
  await page.getByRole("button", { name: "কর্মসূচি তৈরি করুন" }).click();
  await expect(page).toHaveURL(/\/admin\/programs\/[0-9a-f-]{36}\?created=1$/, { timeout: 20_000 });
  await expect(page.getByText("কর্মসূচিটি তৈরি হয়েছে")).toBeVisible();
  const id = new URL(page.url()).pathname.split("/").pop()!;
  const { data } = await db.from("programs").select("id, slug, title_bn").eq("id", id).single();
  created[key] = { id: data!.id, slug: data!.slug, title: data!.title_bn };
  return created[key];
}

test.beforeAll(async ({ browser }, testInfo) => {
  test.setTimeout(120_000);
  run = `${testInfo.project.name.slice(0, 1)}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toLowerCase();
  const { data, error } = await db.from("activity_categories").select("id, slug, name_bn, name_en").in("slug", [CAT_A, CAT_B]);
  expect(error).toBeNull();
  for (const c of data!) cats[c.slug] = c;
  expect(cats[CAT_A] && cats[CAT_B]).toBeTruthy();
  for (const who of ["editor", "viewer"]) states[who] = await storageStateFor(browser, who);
  await makeImage("a1", CAT_A, true);
  await makeImage("a2", CAT_A, true);
  await makeImage("a-hidden", CAT_A, false);
  await makeImage("b1", CAT_B, true);
});

test.afterAll(async () => {
  await db.from("programs").delete().like("title_bn", `%${run}%`);
  await db.from("gallery_images").delete().like("caption", `%${run}%`);
  if (storagePaths.length) await db.storage.from("gallery").remove(storagePaths);
});

test("committee viewer cannot open the programs admin", async ({ browser }) => {
  const page = await pageAs(browser, "viewer");
  await page.goto("/admin/programs");
  await expect(page).toHaveURL(/\/admin\?denied=1$/);
  await page.goto("/admin/programs/new");
  await expect(page).toHaveURL(/\/admin\?denied=1$/);
  await page.context().close();
});

test("form validation, slug suggestion and the computed status preview", async ({ browser }) => {
  const page = await pageAs(browser, "editor");
  await page.goto("/admin/programs/new");
  await page.getByRole("button", { name: "কর্মসূচি তৈরি করুন" }).click();
  await expect(page.locator("#category_id-error")).toContainText("ক্যাটাগরি");
  await expect(page.locator("#title_bn-error")).toBeVisible();
  await expect(page.locator("#starts_on-error")).toBeVisible();
  await expect(page.locator("#category_id")).toBeFocused();

  // The slug follows the English title (then category + date) until edited by hand.
  await fillProgram(page, { category: CAT_A, startsOn: dhakaDate(3) });
  await expect(page.locator("#slug")).toHaveValue(`${CAT_A}-${dhakaDate(3)}`);
  await fillProgram(page, { titleEn: `E2E ${run} Tree Planting` });
  await expect(page.locator("#slug")).toHaveValue(`e2e-${run}-tree-planting`);
  await expect(page.getByText("আজকের হিসাবে ওয়েবসাইটে অবস্থা").locator("..")).toContainText("আসন্ন");

  // End before start is rejected by the server (the field error is shown).
  await fillProgram(page, { titleBn: title("invalid"), endsOn: dhakaDate(1) });
  await page.getByRole("button", { name: "কর্মসূচি তৈরি করুন" }).click();
  await expect(page.locator("#ends_on-error")).toContainText("শেষের তারিখ শুরুর তারিখের আগে");
  await expectNoHorizontalOverflow(page);
  await page.context().close();
});

test("admin creates programs in every status; they appear in the right tabs (BN and EN)", async ({ browser }) => {
  test.slow();
  const page = await pageAs(browser, "editor");
  const plans: Record<Status, Parameters<typeof fillProgram>[1]> = {
    upcoming: { startsOn: dhakaDate(10), titleEn: `E2E ${run} upcoming`, location: "নারায়ণগঞ্জ" },
    ongoing: { startsOn: dhakaDate(-2), endsOn: dhakaDate(2) },
    completed: { startsOn: dhakaDate(-30) },
    postponed: { startsOn: dhakaDate(5), status: "postponed" },
    cancelled: { startsOn: dhakaDate(-5), status: "cancelled" },
  };
  for (const s of STATUSES) {
    await createProgram(page, s, {
      category: CAT_A,
      titleBn: title(s),
      summaryBn: `সারাংশ ${s}`,
      slug: `e2e-${run}-${s}`,
      publish: true,
      ...plans[s],
    });
  }
  // The admin list shows the computed status.
  await page.goto(`/admin/programs?q=${encodeURIComponent(run)}`);
  for (const s of STATUSES) {
    await expect(page.locator(`li[data-slug="e2e-${run}-${s}"]`)).toContainText(STATUS_BN[s]);
  }
  await page.goto(`/admin/programs?q=${encodeURIComponent(run)}&status=ongoing`);
  await expect(page.locator("li[data-testid=program-row]")).toHaveCount(1);
  await page.context().close();

  const pub = await pageAs(browser, null);
  const inList = (s: Status) => pub.locator("[data-testid=program-list]").getByRole("link", { name: title(s), exact: true });
  for (const tab of ["upcoming", "ongoing", "completed"] as const) {
    await pub.goto(`/programs?status=${tab}&category=${CAT_A}`);
    await expect(pub.locator('nav a[aria-current="page"]').filter({ hasText: STATUS_BN[tab] })).toBeVisible();
    for (const s of STATUSES) await expect(inList(s)).toHaveCount(s === tab ? 1 : 0);
  }
  // "All" lists postponed/cancelled too, with their badges.
  await pub.goto(`/programs?category=${CAT_A}`);
  for (const s of STATUSES) await expect(inList(s)).toHaveCount(1);
  for (const s of ["postponed", "cancelled"] as const) {
    const card = pub.locator("[data-testid=program-list] article").filter({ has: pub.getByRole("link", { name: title(s), exact: true }) });
    await expect(card).toContainText(STATUS_BN[s]);
  }
  await expectNoHorizontalOverflow(pub);

  // English: translated title where given; Bengali fallback marked lang="bn".
  await pub.goto(`/en/programs?status=upcoming&category=${CAT_A}`);
  await expect(pub.locator("html")).toHaveAttribute("lang", "en");
  await expect(pub.getByRole("link", { name: `E2E ${run} upcoming`, exact: true })).toBeVisible();
  await expect(pub.locator('nav a[aria-current="page"]').filter({ hasText: "Upcoming" })).toBeVisible();
  await pub.goto(`/en/programs?status=ongoing&category=${CAT_A}`);
  const fallback = pub.getByRole("link", { name: title("ongoing"), exact: true });
  await expect(fallback).toBeVisible();
  await expect(fallback.locator("span[lang=bn]")).toHaveCount(1);
  await expectNoHorizontalOverflow(pub);

  // Detail pages (Bengali and English), JSON-LD event status.
  await pub.goto(`/programs/e2e-${run}-cancelled`);
  await expect(pub.getByRole("heading", { level: 1 })).toHaveText(title("cancelled"));
  await expect(pub.getByText("এই কর্মসূচিটি বাতিল করা হয়েছে।")).toBeVisible();
  const ld = JSON.parse((await pub.locator('script[type="application/ld+json"]').first().textContent()) ?? "{}");
  expect(ld).toMatchObject({ "@type": "Event", eventStatus: "https://schema.org/EventCancelled", startDate: dhakaDate(-5) });
  await expect(pub.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/programs/e2e-${run}-cancelled$`));
  await expect(pub.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", new RegExp(`/en/programs/e2e-${run}-cancelled$`));
  await expect(pub.locator("aside").getByRole("link", { name: cats[CAT_A].name_bn })).toHaveAttribute("href", `/activities/${CAT_A}`);

  await pub.goto(`/en/programs/e2e-${run}-ongoing`);
  await expect(pub.getByText("This program has not been described in English yet")).toBeVisible();
  await expect(pub.getByRole("heading", { level: 1 }).locator("span[lang=bn]")).toHaveText(title("ongoing"));
  await expect(pub.getByRole("link", { name: "All programs" })).toHaveAttribute("href", "/en/programs");
  await pub.goto(`/en/programs/e2e-${run}-upcoming`);
  await expect(pub.getByRole("heading", { level: 1 })).toHaveText(`E2E ${run} upcoming`);
  await expect(pub.locator('meta[property="og:locale"]')).toHaveAttribute("content", "en_US");
  await pub.context().close();
});

test("public program pages pass axe (WCAG 2 AA) in both languages", async ({ browser }) => {
  const pub = await pageAs(browser, null);
  for (const url of [`/programs?category=${CAT_A}`, `/en/programs?category=${CAT_A}`, `/programs/e2e-${run}-postponed`, `/en/programs/e2e-${run}-upcoming`]) {
    await pub.goto(url);
    expect(await axeViolations(pub), url).toEqual([]);
  }
  await pub.context().close();
});

test("the slug is locked once a program has been published", async ({ browser }) => {
  const page = await pageAs(browser, "editor");
  const draft = await createProgram(page, "draft", {
    category: CAT_A,
    titleBn: title("draft"),
    startsOn: dhakaDate(20),
    slug: `e2e-${run}-draft`,
    publish: false,
  });
  // A draft's slug can still change.
  await fillProgram(page, { slug: `e2e-${run}-draft-renamed` });
  await page.getByRole("button", { name: "পরিবর্তন সংরক্ষণ করুন" }).click();
  await expect(page.getByText("পরিবর্তন সংরক্ষিত হয়েছে। কর্মসূচিটি খসড়া হিসেবে আছে")).toBeVisible();
  // Unpublished: not public.
  const pub = await pageAs(browser, null);
  expect((await pub.goto(`/programs/e2e-${run}-draft-renamed`))?.status()).toBe(404);
  await pub.goto(`/programs?category=${CAT_A}`);
  await expect(pub.getByRole("link", { name: title("draft") })).toHaveCount(0);

  // Publish → the slug field becomes read-only.
  await fillProgram(page, { publish: true });
  await page.getByRole("button", { name: "পরিবর্তন সংরক্ষণ করুন" }).click();
  await expect(page.getByText("কর্মসূচিটি ওয়েবসাইটে প্রকাশিত")).toBeVisible();
  await page.reload();
  await expect(page.locator("#slug")).toHaveAttribute("readonly", "");
  await expect(page.getByText("এই কর্মসূচি একবার প্রকাশিত হয়েছে, তাই ঠিকানাটি স্থায়ী")).toBeVisible();
  expect((await pub.goto(`/programs/e2e-${run}-draft-renamed`))?.status()).toBe(200);

  // Bypassing the read-only field: the database refuses (PROGRAM_SLUG_LOCKED) and the form says why.
  await page.locator("#slug").evaluate((el) => el.removeAttribute("readonly"));
  await page.locator("#slug").fill(`e2e-${run}-changed`);
  await page.getByRole("button", { name: "পরিবর্তন সংরক্ষণ করুন" }).click();
  await expect(page.locator("#slug-error")).toContainText("প্রকাশিত কর্মসূচির স্লাগ");
  const editorDb = await sessionClient("editor");
  const { error } = await editorDb.from("programs").update({ slug: `e2e-${run}-changed` }).eq("id", draft.id);
  expect(error?.message).toContain("PROGRAM_SLUG_LOCKED");
  // Unpublishing does not unlock it either.
  const { error: again } = await editorDb.from("programs").update({ is_published: false, slug: `e2e-${run}-changed` }).eq("id", draft.id);
  expect(again?.message).toContain("PROGRAM_SLUG_LOCKED");
  await page.context().close();
  await pub.context().close();
});

test("cover and photos must come from the program's category; unpublished photos stay hidden", async ({ browser }) => {
  test.slow();
  const program = created.upcoming;
  const page = await pageAs(browser, "editor");
  await page.goto(`/admin/programs/${program.id}`);

  // Cover choices are this category's photos only.
  await expect(page.locator(`input[name=cover][value="${images.a1.id}"]`)).toHaveCount(1);
  await expect(page.locator(`input[name=cover][value="${images.b1.id}"]`)).toHaveCount(0);
  await page.locator(`input[name=cover][value="${images.a1.id}"]`).locator("xpath=..").click();
  await page.getByRole("button", { name: "পরিবর্তন সংরক্ষণ করুন" }).click();
  await expect(page.getByText("পরিবর্তন সংরক্ষিত হয়েছে")).toBeVisible();
  const { data: withCover } = await db.from("programs").select("cover_image_id").eq("id", program.id).single();
  expect(withCover!.cover_image_id).toBe(images.a1.id);

  // Link photos (one published, one not) through the chooser.
  await page.getByRole("button", { name: "ছবি যুক্ত করুন" }).click();
  const chooser = page.getByRole("list", { name: "যুক্ত করার মতো ছবি" });
  await expect(chooser).toBeVisible();
  for (const key of ["a2", "a-hidden"]) {
    await chooser.getByRole("checkbox", { name: new RegExp(`ই২ই-ছবি-${run}-${key}\\)`) }).check();
  }
  await expect(chooser.getByRole("checkbox", { name: new RegExp(`ই২ই-ছবি-${run}-b1`) })).toHaveCount(0);
  await page.getByRole("button", { name: /নির্বাচিত ছবি যুক্ত করুন/ }).click();
  await expect(page.getByText("২টি ছবি কর্মসূচিতে যুক্ত হয়েছে।")).toBeVisible();
  await expect(page.getByTestId("linked-photos").locator("li")).toHaveCount(2);

  // The database enforces both rules for any client.
  const editorDb = await sessionClient("editor");
  const cover = await editorDb.from("programs").update({ cover_image_id: images.b1.id }).eq("id", program.id);
  expect(cover.error?.message).toContain("PROGRAM_COVER_MISMATCH");
  const link = await editorDb.from("gallery_images").update({ program_id: program.id }).eq("id", images.b1.id);
  expect(link.error?.message).toContain("PROGRAM_CATEGORY_MISMATCH");

  // Public page: cover + the published linked photo only (lightbox opens).
  const pub = await pageAs(browser, null);
  await pub.goto(`/programs/${program.slug}`);
  await expect(pub.locator("figure img").first()).toHaveAttribute("src", new RegExp(images.a1.storage_path.split("/").pop()!));
  await expect(pub.getByRole("img", { name: `ই২ই-ছবি-${run}-a2`, exact: true })).toHaveCount(1);
  await expect(pub.getByRole("img", { name: `ই২ই-ছবি-${run}-a-hidden`, exact: true })).toHaveCount(0);
  await pub.getByRole("link", { name: new RegExp(`ই২ই-ছবি-${run}-a2`) }).click();
  await expect(pub.getByRole("dialog")).toBeVisible();
  await pub.keyboard.press("Escape");
  await expect(pub.getByRole("dialog")).toBeHidden();
  await expectNoHorizontalOverflow(pub);

  // Unlink one photo: it disappears from the program page (stays in the gallery).
  await page.getByRole("button", { name: new RegExp(`কর্মসূচি থেকে সরান: .*ই২ই-ছবি-${run}-a2`) }).click();
  await expect(page.getByText("ছবিটি কর্মসূচি থেকে সরানো হয়েছে")).toBeVisible();
  const { data: a2 } = await db.from("gallery_images").select("program_id").eq("id", images.a2.id).single();
  expect(a2!.program_id).toBeNull();

  // Changing the program's category unlinks the remaining photo and clears the cover.
  await page.locator("#category_id").selectOption(cats[CAT_B].id);
  await page.getByRole("button", { name: "পরিবর্তন সংরক্ষণ করুন" }).click();
  await expect(page.getByText("পরিবর্তন সংরক্ষিত হয়েছে")).toBeVisible();
  const { data: hidden } = await db.from("gallery_images").select("program_id").eq("id", images["a-hidden"].id).single();
  expect(hidden!.program_id).toBeNull();
  const { data: moved } = await db.from("programs").select("cover_image_id, category_id").eq("id", program.id).single();
  expect(moved).toEqual({ cover_image_id: null, category_id: cats[CAT_B].id });
  await page.context().close();
  await pub.context().close();
});

test("unknown, malformed and unpublished program URLs are 404 in both languages", async ({ browser }) => {
  const pub = await pageAs(browser, null);
  for (const url of [`/programs/e2e-${run}-nope`, `/en/programs/e2e-${run}-nope`, "/programs/Bad_Slug", "/programs/%3Cscript%3E"]) {
    expect((await pub.goto(url))?.status(), url).toBe(404);
  }
  // Unknown filters show friendly empty states instead of errors.
  await pub.goto("/programs?category=no-such-area");
  await expect(pub.getByText("কার্যক্রমের ক্ষেত্রটি খুঁজে পাওয়া যায়নি")).toBeVisible();
  await pub.goto("/programs?status=ongoing&year=2001");
  await expect(pub.getByText("এই ফিল্টারে কোনো কর্মসূচি পাওয়া যায়নি")).toBeVisible();
  await pub.goto("/en/programs?page=999");
  await expect(pub.getByText("There are no programs on this page")).toBeVisible();
  await pub.context().close();
});

test("delete asks for confirmation and removes the program (photos stay in the gallery)", async ({ browser }) => {
  const page = await pageAs(browser, "editor");
  const target = created.completed;
  await page.goto(`/admin/programs?q=${encodeURIComponent(run)}`);
  const row = page.locator(`li[data-slug="${target.slug}"]`);
  await row.getByRole("button", { name: /মুছে ফেলুন/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "বাতিল" })).toBeFocused();
  await dialog.getByRole("button", { name: "হ্যাঁ, মুছে ফেলুন" }).click();
  await expect(page).toHaveURL(/\/admin\/programs\?deleted=1$/);
  await expect(page.getByText("কর্মসূচিটি মুছে ফেলা হয়েছে।")).toBeVisible();
  const { data } = await db.from("programs").select("id").eq("id", target.id);
  expect(data).toHaveLength(0);
  const pub = await pageAs(browser, null);
  expect((await pub.goto(`/programs/${target.slug}`))?.status()).toBe(404);
  await page.context().close();
  await pub.context().close();
});
