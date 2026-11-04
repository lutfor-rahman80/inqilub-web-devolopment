import { test, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import jsQR from "jsqr";

/**
 * Public pages of the pages module in Bengali (/…) and English (/en/…):
 * about, activity areas (+ a category page with its programs and photos),
 * gallery (filters, alt text, lightbox labels), announcements (pinned first,
 * English with marked Bengali fallback), contact (details, QR, form messages
 * in the page language — also without JavaScript), privacy, address
 * “নারায়ণগঞ্জ” (no “কাশীপুর, ফতুল্লা” anywhere), share buttons, SEO files and
 * metadata, overflow at 360–1440px, axe/CSP/console checks, keep-alive cron,
 * and a minimal smoke test of the homepage (tests/e2e/home.spec.ts covers it).
 *
 * Expected organization texts are read from the database at test time.
 * Rows created here carry a unique marker and are removed afterwards.
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
const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61566432706839";
const CRON_SECRET = env.CRON_SECRET || "local-cron-secret";
const RUN = `${Date.now().toString(36)}${crypto.randomBytes(2).toString("hex")}`;
const MARKER = `ই২ই-সাইট-${RUN}`;
const CAT = "winter-clothing";
const PROD = process.env.E2E_SERVER === "production";

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Every public page this module owns (language-neutral paths). */
const OWNED_PAGES = ["/about", "/activities", `/activities/${CAT}`, "/gallery", `/gallery?category=${CAT}`, "/announcements", "/contact", "/privacy", "/faq"];

async function decodeQr(image: Buffer): Promise<string | null> {
  const { data, info } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), info.width, info.height)?.data ?? null;
}

async function expectNoHorizontalOverflow(page: Page, label = page.url()) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw, `no horizontal scroll: ${label}`).toBeLessThanOrEqual(iw);
}

const axePath = path.join(process.cwd(), "node_modules/axe-core/axe.min.js");
async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ path: axePath });
  const result = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe;
    return axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
  });
  return result.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(" ")}`));
}

async function context(browser: Browser, opts: Parameters<Browser["newContext"]>[0] = {}): Promise<BrowserContext> {
  const ctx = await browser.newContext({ baseURL: env.BASE_URL ?? "http://localhost:3000", locale: "bn-BD", timezoneId: "Asia/Dhaka", ...opts });
  await ctx.addInitScript(() => {
    const w = window as unknown as { __csp: string[] };
    w.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => w.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  return ctx;
}

const seeded = {
  images: [] as { id: string; storage_path: string; thumb_path: string }[],
  programId: "",
  programSlug: `e2e-site-${RUN}`,
  pinnedBnOnly: "",
  withEnglish: "",
  draft: "",
};

test.beforeAll(async () => {
  test.setTimeout(120_000);
  const { data: cat, error } = await db.from("activity_categories").select("id").eq("slug", CAT).single();
  expect(error).toBeNull();
  // Two published photos (one without a caption → alt from the category name).
  for (let i = 0; i < 2; i++) {
    const file = `e2e-site-${RUN}-${i}`;
    const full = `activities/${CAT}/${file}.webp`;
    const thumb = `activities/${CAT}/thumbs/${file}.webp`;
    const buf = await sharp({ create: { width: 640, height: 480, channels: 3, background: i ? "#8a6c22" : "#3e6b52" } }).webp().toBuffer();
    for (const p of [full, thumb]) {
      const { error: upError } = await db.storage.from("gallery").upload(p, buf, { contentType: "image/webp" });
      expect(upError).toBeNull();
    }
    const { data, error: insError } = await db
      .from("gallery_images")
      .insert({ category_id: cat!.id, storage_path: full, thumb_path: thumb, width: 640, height: 480, caption: i === 0 ? `${MARKER}-ছবি` : "", is_published: true, sort_order: -100_000 + i, source: "upload" })
      .select("id, storage_path, thumb_path")
      .single();
    expect(insError).toBeNull();
    seeded.images.push(data!);
  }
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
  const { data: program, error: progError } = await db
    .from("programs")
    .insert({ slug: seeded.programSlug, category_id: cat!.id, title_bn: `${MARKER}-কর্মসূচি`, title_en: `E2E program ${RUN}`, starts_on: today, is_published: true })
    .select("id")
    .single();
  expect(progError).toBeNull();
  seeded.programId = program!.id;

  const older = new Date(Date.now() - 3 * 86400_000).toISOString();
  const { data: anns, error: annError } = await db
    .from("announcements")
    .insert([
      // Same keys in every row (a bulk insert sends null for missing keys).
      { title: `পিন করা ঘোষণা ${MARKER}`, body: "প্রথম অনুচ্ছেদ।\nএকই অনুচ্ছেদের দ্বিতীয় লাইন।\n\nদ্বিতীয় অনুচ্ছেদ।", title_en: null, body_en: null, is_published: true, is_pinned: true, published_at: older },
      { title: `ইংরেজিসহ ঘোষণা ${MARKER}`, body: "বাংলা বিবরণ।", title_en: `Announcement with English ${RUN}`, body_en: "English details.\n\nSecond English paragraph.", is_published: true, is_pinned: false, published_at: null },
      { title: `অপ্রকাশিত ঘোষণা ${MARKER}`, body: "দেখা যাবে না।", title_en: null, body_en: null, is_published: false, is_pinned: false, published_at: null },
    ])
    .select("id, title");
  expect(annError).toBeNull();
  for (const a of anns!) {
    if (a.title.startsWith("পিন")) seeded.pinnedBnOnly = a.id;
    else if (a.title.startsWith("ইংরেজি")) seeded.withEnglish = a.id;
    else seeded.draft = a.id;
  }
});

test.afterAll(async () => {
  await db.from("contact_messages").delete().like("subject", `%${MARKER}%`);
  await db.from("contact_messages").delete().like("subject", `%${RUN}%`);
  await db.from("announcements").delete().like("title", `%${MARKER}%`);
  if (seeded.programId) await db.from("programs").delete().eq("id", seeded.programId);
  if (seeded.images.length) {
    await db.from("gallery_images").delete().in("id", seeded.images.map((i) => i.id));
    await db.storage.from("gallery").remove(seeded.images.flatMap((i) => [i.storage_path, i.thumb_path]));
  }
});

test("homepage smoke test (BN and EN)", async ({ page }) => {
  for (const [url, lang] of [["/", "bn"], ["/en", "en"]] as const) {
    const res = await page.goto(url);
    expect(res?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Current homepage (2026-10-28): hero → পরিচিতি → কার্যক্রমের ক্ষেত্র …, no slogan band
    // (the slogan is in the hero only). Full checks: tests/e2e/home.spec.ts.
    const sections = await page.locator("[data-home-section]").evaluateAll((els) => els.map((e) => e.getAttribute("data-home-section")));
    expect(sections.slice(0, 3)).toEqual(["hero", "intro", "categories"]);
    expect(sections).not.toContain("band");
    await expect(page.getByTestId("hero-slogan")).toHaveText("আনতে সুপ্রভাত, পথ দেখাবে ইনকিলাব");
  }
});

test.describe("about", () => {
  test("Bengali: organization texts verbatim, identity, numbered activities, links", async ({ page }) => {
    const { data } = await db.from("site_settings").select("value").eq("key", "about").single();
    const about = data!.value as { goal: string; objective: string; why: string; what_is: string };
    await page.goto("/about");
    await expect(page.getByTestId("about-goal")).toContainText(about.goal);
    await expect(page.getByTestId("about-objective")).toContainText(about.objective);
    await expect(page.getByTestId("about-why")).toContainText(about.why.replace(/\s+/g, " ").trim());
    expect(about.goal).toContain("আদর্শবান যুবদের সুসংগঠিত করার মাধ্যমে ইসলামিক, সামাজিক কল্যাণ, সেবা ও শিক্ষামূলক কার্যক্রম পরিচালনা করা।");
    expect(about.objective).toBe("একমাত্র মহান আল্লাহ পাকের সন্তুষ্টি অর্জন করা।");
    await expect(page.getByRole("heading", { name: "ইনকিলাব যুব সংগঠন কেন?" })).toBeVisible();
    await expect(page.getByTestId("about-identity")).toContainText("কোনো রাজনৈতিক দলের সাথে সম্পৃক্ত নয়");
    const activities = page.getByTestId("about-activities");
    await expect(activities.getByRole("listitem").first()).toContainText("১.");
    await expect(activities.locator(`a[href="/activities/${CAT}"]`)).toHaveCount(1);
    const links = page.getByTestId("about-links");
    await expect(links.locator('a[href="/notice"]')).toHaveText("Notice পাতা দেখুন");
    await expect(links.locator('a[href="/faq"]')).toHaveCount(1);
    await expect(links.locator('a[href="/contact"]')).toHaveCount(1);
    await expect(links.locator('a[href="/membership"], a[href="/membership/status"]')).toHaveCount(1);
    await expect(links).toContainText("নারায়ণগঞ্জ");
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  });

  test("English: English settings texts, English digits and /en links", async ({ page }) => {
    const { data } = await db.from("site_settings").select("value").eq("key", "about").single();
    const en = (data!.value as { en: { goal: string; objective: string; why: string } }).en;
    await page.goto("/en/about");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Inqilab Jubo Sangathan");
    if (en.goal) await expect(page.getByTestId("about-goal")).toContainText(en.goal);
    if (en.objective) await expect(page.getByTestId("about-objective")).toContainText(en.objective);
    await expect(page.getByRole("heading", { name: "Why Inqilab Jubo Sangathan?" })).toBeVisible();
    await expect(page.getByTestId("about-identity")).toContainText("not affiliated with any political party");
    const activities = page.getByTestId("about-activities");
    await expect(activities.getByRole("listitem").first()).toContainText("1.");
    await expect(activities.locator(`a[href="/en/activities/${CAT}"]`)).toContainText("Winter Clothing Distribution");
    const links = page.getByTestId("about-links");
    for (const p of ["/en/notice", "/en/faq", "/en/contact"]) await expect(links.locator(`a[href="${p}"]`)).toHaveCount(1);
    await expect(links.locator('a[href="/en/notice"]')).toHaveText("Visit the Notice page");
    await expect(links).toContainText("Narayanganj");
    // The slogan stays in Bengali, with the English rendering beneath.
    await expect(page.locator('main p[lang="bn"]').filter({ hasText: "আনতে সুপ্রভাত, পথ দেখাবে ইনকিলাব" })).toHaveCount(1);
  });
});

test.describe("activities", () => {
  test("list in both languages: every active category with its localized name", async ({ page }) => {
    const { data: cats } = await db.from("activity_categories").select("slug, name_bn, name_en").eq("is_active", true);
    await page.goto("/activities");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("কার্যক্রমের ক্ষেত্র");
    for (const c of cats!) await expect(page.locator(`a[href="/activities/${c.slug}"]`).first()).toContainText(c.name_bn);
    await page.goto("/en/activities");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Areas of work");
    for (const c of cats!) {
      const link = page.locator(`a[href="/en/activities/${c.slug}"]`).first();
      if (c.name_en) await expect(link).toContainText(c.name_en);
      else await expect(link.locator('[lang="bn"]').first()).toContainText(c.name_bn);
    }
    await expect(page.getByTestId("activity-list").getByText(/\d+ photos?|Photos coming soon/).first()).toBeVisible();
  });

  test("category page: programs of the area, photos, share links, breadcrumb JSON-LD", async ({ page }) => {
    test.skip(PROD, "seeded rows are not visible on a cached production page");
    await page.goto(`/activities/${CAT}`);
    const programs = page.getByTestId("category-programs");
    await expect(programs.getByRole("heading", { name: "এই ক্ষেত্রের কর্মসূচি" })).toBeVisible();
    await expect(programs.locator(`a[href="/programs/${seeded.programSlug}"]`)).toContainText(`${MARKER}-কর্মসূচি`);
    await expect(programs.getByRole("link", { name: /এই ক্ষেত্রের সব কর্মসূচি/ })).toHaveAttribute("href", `/programs?category=${CAT}`);
    await expect(page.getByRole("img", { name: `${MARKER}-ছবি`, exact: true })).toHaveCount(1);
    await expect(page.locator('main a[href^="https://www.facebook.com/sharer"]')).toHaveCount(1);
    await expect(page.locator('main a[href^="https://wa.me/?text="]')).toHaveAttribute("href", new RegExp(encodeURIComponent(`/activities/${CAT}`)));
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t));
    const crumbs = ld.find((d) => d["@type"] === "BreadcrumbList");
    expect(crumbs.itemListElement.map((i: { name: string }) => i.name)).toEqual(["হোম", "কার্যক্রমের ক্ষেত্র", "শীতবস্ত্র বিতরণ"]);

    await page.goto(`/en/activities/${CAT}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Winter Clothing Distribution");
    await expect(page.getByTestId("category-programs").locator(`a[href="/en/programs/${seeded.programSlug}"]`)).toContainText(`E2E program ${RUN}`);
    await expect(page.getByRole("link", { name: "Share on Facebook (opens in a new tab)" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Share on WhatsApp (opens in a new tab)" })).toBeVisible();
    // Captions are Bengali: marked lang="bn" on the English page; the uncaptioned photo's alt uses the English category name.
    await expect(page.locator(`img[alt="${MARKER}-ছবি"]`)).toHaveAttribute("lang", "bn");
    await expect(page.getByRole("img", { name: /^Winter Clothing Distribution — photo \d+$/ }).first()).toBeVisible();
    expect((await page.goto("/en/activities/does-not-exist"))?.status()).toBe(404);
  });
});

test.describe("gallery", () => {
  test("English filters, counts, alt text and lightbox labels; Bengali lightbox labels", async ({ page }) => {
    test.skip(PROD, "seeded rows are not visible on a cached production page");
    await page.goto(`/en/gallery?category=${CAT}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Gallery");
    const filters = page.getByRole("navigation", { name: "Photos by category" });
    await expect(filters.locator('a[aria-current="page"]')).toContainText("Winter Clothing Distribution");
    await expect(filters.getByRole("link", { name: /^All/ })).toHaveAttribute("href", "/en/gallery");
    await expect(page.getByRole("heading", { level: 2, name: "Winter Clothing Distribution" })).toBeVisible();
    await expect(page.getByText(/\d+ photos? in total/)).toBeVisible();
    const thumb = page.getByRole("link", { name: `View larger: ${MARKER}-ছবি` });
    // Named by its content ("View larger:" + the image's alt), so the Bengali caption keeps lang="bn"
    // instead of sitting inside an English aria-label string.
    await expect(thumb).not.toHaveAttribute("aria-label");
    await expect(thumb.locator("img")).toHaveAttribute("lang", "bn");
    await thumb.click();
    const viewer = page.getByRole("dialog", { name: "Photo viewer" });
    await expect(viewer).toBeVisible();
    await expect(viewer.getByRole("button", { name: "Close (Esc)" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(viewer).toBeHidden();
    await expect(thumb).toBeFocused();

    await page.goto(`/gallery?category=${CAT}`);
    await page.getByRole("link", { name: `বড় করে দেখুন: ${MARKER}-ছবি` }).click();
    const bnViewer = page.getByRole("dialog", { name: "ছবি বড় করে দেখা" });
    await expect(bnViewer.getByRole("button", { name: "বন্ধ করুন (Esc)" })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.goto("/en/gallery?category=no-such-category");
    await expect(page.getByText("This category was not found")).toBeVisible();
    await page.goto("/gallery?category=no-such-category");
    await expect(page.getByText("ক্যাটাগরিটি খুঁজে পাওয়া যায়নি")).toBeVisible();
  });
});

test.describe("contact", () => {
  test("details with the general address, Facebook link and QR (both languages)", async ({ page, request }) => {
    const { data } = await db.from("site_settings").select("value").eq("key", "contact").single();
    const contact = data!.value as { phone: string | null; email: string | null; address: string | null };
    expect(contact.address).toBe("নারায়ণগঞ্জ");

    await page.goto("/contact");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("আমাদের সাথে যোগাযোগ করুন");
    await expect(page.locator("main").getByText("নারায়ণগঞ্জ", { exact: true })).toBeVisible();
    await expect(page.locator('main a[href^="tel:"]')).toHaveCount(contact.phone ? 1 : 0);
    await expect(page.locator('main a[href^="mailto:"]')).toHaveCount(contact.email ? 1 : 0);
    await expect(page.getByTestId("contact-faq").getByRole("link")).toHaveAttribute("href", "/faq");
    await expect(page.getByTestId("contact-official")).toContainText("শুধুমাত্র এই ওয়েবসাইটে দেওয়া মাধ্যমগুলোতে");

    const card = page.getByTestId("contact-facebook");
    await expect(card.getByRole("link", { name: /ফেসবুক পেজে যান/ })).toHaveAttribute("href", FACEBOOK_URL);
    expect(await decodeQr(await card.locator("[data-qr-url]").screenshot())).toBe(FACEBOOK_URL);
    const download = card.getByTestId("qr-download");
    await expect(download).toHaveText(/QR কোড ডাউনলোড \(প্রিন্টের জন্য\)/);
    const res = await request.get((await download.getAttribute("href"))!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
    const png = await res.body();
    const meta = await sharp(png).metadata();
    expect([meta.width, meta.height]).toEqual([1024, 1024]);
    expect(await decodeQr(png)).toBe(FACEBOOK_URL);

    await page.goto("/en/contact");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contact us");
    await expect(page.locator("main").getByText("Narayanganj", { exact: true })).toBeVisible();
    const enCard = page.getByTestId("contact-facebook");
    await expect(enCard.getByRole("link", { name: "Go to our Facebook page (opens in a new tab)" })).toHaveAttribute("href", FACEBOOK_URL);
    await expect(enCard.getByRole("img", { name: /QR code of our Facebook page/ })).toBeVisible();
    await expect(page.getByTestId("contact-faq").getByRole("link")).toHaveAttribute("href", "/en/faq");
  });

  test("Bengali form: validation and a stored message", async ({ page }) => {
    await page.goto("/contact");
    const form = page.getByTestId("contact-form");
    const submit = form.getByRole("button", { name: "বার্তা পাঠান" });
    await submit.click();
    await expect(form.getByRole("alert").first()).toContainText("চিহ্নিত ঘরগুলো ঠিক করে");
    await expect(page.locator("#name")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#name")).toHaveAttribute("aria-describedby", "name-error");
    await expect(page.locator("#mobile-error")).toContainText("অন্তত একটি");

    await page.fill("#name", "পরীক্ষক");
    await page.fill("#mobile", "01212345678");
    await page.fill("#email", "not-an-email");
    await page.fill("#subject", `বিষয় ${MARKER}`);
    await page.fill("#message", "ছোট");
    await submit.click();
    await expect(page.locator("#mobile-error")).toContainText("সঠিক মোবাইল নম্বর");
    await expect(page.locator("#email-error")).toContainText("সঠিক ইমেইল");
    await expect(page.locator("#message-error")).toContainText("কমপক্ষে ১০ অক্ষর");

    await page.fill("#mobile", "০১৭১২৩৪৫৬৭৮");
    await page.fill("#email", "");
    await page.fill("#message", "এটি একটি স্বয়ংক্রিয় পরীক্ষার বার্তা।");
    await submit.click();
    await expect(page.getByTestId("contact-success")).toContainText("ধন্যবাদ! আপনার বার্তা আমরা পেয়েছি।");
    const { data: rows } = await db.from("contact_messages").select("name, mobile, email, subject, message").eq("subject", `বিষয় ${MARKER}`);
    expect(rows).toEqual([{ name: "পরীক্ষক", mobile: "01712345678", email: null, subject: `বিষয় ${MARKER}`, message: "এটি একটি স্বয়ংক্রিয় পরীক্ষার বার্তা।" }]);
    await page.getByRole("button", { name: "আরেকটি বার্তা পাঠান" }).click();
    await expect(page.locator("#name")).toHaveValue("");
  });

  test("English form: English validation and success messages", async ({ page }) => {
    await page.goto("/en/contact");
    const form = page.getByTestId("contact-form");
    await form.getByRole("button", { name: "Send message" }).click();
    await expect(form.getByRole("alert").first()).toContainText("Please correct the marked fields");
    await expect(page.locator("#name-error")).toHaveText("Please enter your name (at least 2 characters).");
    await expect(page.locator("#mobile-error")).toContainText("Please give a mobile number or an email address");
    await page.fill("#name", "E2E tester");
    await page.fill("#email", "e2e-tester@example.com");
    await page.fill("#subject", `English subject ${RUN}`);
    await page.fill("#message", "An automated English test message.");
    await form.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByTestId("contact-success")).toContainText("Thank you! We have received your message.");
    await expect(page.getByRole("button", { name: "Send another message" })).toBeVisible();
  });

  test("the server answers in the page language (form posted without JavaScript)", async ({ browser }) => {
    const ctx = await context(browser, { javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/en/contact");
    await page.fill("#name", "E2E");
    await page.fill("#subject", `No JS ${RUN}`);
    await page.fill("#message", "short");
    // Keyboard submission (a plain HTML form post: no client-side checks run).
    await Promise.all([page.waitForNavigation(), page.getByRole("button", { name: "Send message" }).press("Enter")]);
    await expect(page.locator("#mobile-error")).toHaveText("Please give a mobile number or an email address, so that we can reply.");
    await expect(page.locator("#message-error")).toHaveText("Please write a little more (at least 10 characters).");
    await expect(page.getByText("Some of the information is not valid.")).toBeVisible();

    await page.goto("/contact");
    await page.fill("#name", "ই২ই");
    await page.fill("#subject", `জাভাস্ক্রিপ্ট ছাড়া ${RUN}`);
    await page.fill("#message", "ছোট");
    await Promise.all([page.waitForNavigation(), page.getByRole("button", { name: "বার্তা পাঠান" }).press("Enter")]);
    await expect(page.locator("#message-error")).toHaveText("বার্তাটি একটু বিস্তারিত লিখুন (কমপক্ষে ১০ অক্ষর)।");
    await ctx.close();
  });

  test("honeypot submissions are acknowledged but not stored; long resubmissions are stored once", async ({ page }) => {
    await page.goto("/contact");
    await page.fill("#name", "স্প্যাম বট");
    await page.fill("#email", "bot@example.com");
    await page.fill("#subject", `হানিপট ${MARKER}`);
    await page.fill("#message", "এটি একটি স্প্যাম বার্তা পরীক্ষা।");
    await page.locator("#contact-website").evaluate((el) => ((el as HTMLInputElement).value = "https://spam.example"));
    await page.getByRole("button", { name: "বার্তা পাঠান" }).click();
    await expect(page.getByTestId("contact-success")).toBeVisible();
    const { count: spam } = await db.from("contact_messages").select("id", { count: "exact", head: true }).eq("subject", `হানিপট ${MARKER}`);
    expect(spam).toBe(0);

    const message = "এটি একটি দীর্ঘ পরীক্ষামূলক বার্তা যা পুনরায় পাঠানো হচ্ছে। ".repeat(22).trim();
    const subject = `দীর্ঘ বার্তা ${MARKER}`;
    await page.goto("/contact");
    for (let i = 0; i < 2; i++) {
      await page.fill("#name", "পরীক্ষক");
      await page.fill("#email", "tester@example.com");
      await page.fill("#subject", subject);
      await page.fill("#message", message);
      await page.getByRole("button", { name: "বার্তা পাঠান" }).click();
      await expect(page.getByTestId("contact-success")).toBeVisible();
      if (i === 0) await page.getByRole("button", { name: "আরেকটি বার্তা পাঠান" }).click();
    }
    const { count } = await db.from("contact_messages").select("id", { count: "exact", head: true }).eq("subject", subject);
    expect(count).toBe(1);
  });
});

test.describe("announcements", () => {
  test("Bengali: pinned first, paragraphs, share and copy link, 404s", async ({ browser }) => {
    test.skip(PROD, "seeded rows are not visible on a cached production page");
    const ctx = await context(browser, { permissions: ["clipboard-read", "clipboard-write"] });
    const page = await ctx.newPage();
    await page.goto("/announcements");
    // Same word as the menu item; never "বিজ্ঞপ্তি" (≈ notice), which belongs to the separate Notice page.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("ঘোষণা");
    await expect(page.locator("[data-page-hero]")).not.toContainText("বিজ্ঞপ্তি");
    await expect(page.locator('meta[name="description"]')).not.toHaveAttribute("content", /বিজ্ঞপ্তি/);
    const titles = await page.getByTestId("announcement-list").getByRole("heading", { level: 2 }).allTextContents();
    const pinnedIdx = titles.indexOf(`পিন করা ঘোষণা ${MARKER}`);
    expect(pinnedIdx).toBeGreaterThanOrEqual(0);
    expect(titles.indexOf(`ইংরেজিসহ ঘোষণা ${MARKER}`)).toBeGreaterThan(pinnedIdx);
    expect(titles).not.toContain(`অপ্রকাশিত ঘোষণা ${MARKER}`);

    await page.getByTestId("announcement-list").getByRole("link", { name: `পিন করা ঘোষণা ${MARKER}` }).click();
    await expect(page).toHaveURL(new RegExp(`/announcements/${seeded.pinnedBnOnly}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`পিন করা ঘোষণা ${MARKER}`);
    const paragraphs = page.getByTestId("announcement-body").locator("p");
    await expect(paragraphs).toHaveCount(2);
    await expect(paragraphs.first()).toHaveText("প্রথম অনুচ্ছেদ।\nএকই অনুচ্ছেদের দ্বিতীয় লাইন।");
    await expect(page.getByRole("link", { name: /ফেসবুকে শেয়ার/ })).toHaveAttribute("href", /^https:\/\/www\.facebook\.com\/sharer\/sharer\.php\?u=/);
    await expect(page.getByRole("link", { name: /হোয়াটসঅ্যাপে শেয়ার/ })).toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=/);
    await page.getByRole("button", { name: "লিংক কপি করুন" }).click();
    await expect(page.getByRole("button", { name: "লিংক কপি হয়েছে" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(new RegExp(`/announcements/${seeded.pinnedBnOnly}$`));
    const crumbs = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t)).find((d) => d["@type"] === "BreadcrumbList");
    expect(crumbs.itemListElement).toHaveLength(3);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");

    for (const id of [seeded.draft, "00000000-0000-4000-8000-000000000000", "not-a-uuid"]) {
      expect((await page.goto(`/announcements/${id}`))?.status()).toBe(404);
      expect((await page.goto(`/en/announcements/${id}`))?.status()).toBe(404);
    }
    expect((await page.goto("/announcements?page=9999"))?.status()).toBe(404);
    expect((await page.goto("/announcements?page=abc"))?.status()).toBe(200);
    await ctx.close();
  });

  test("English: English title/body when given; Bengali fallback marked with a note", async ({ page }) => {
    test.skip(PROD, "seeded rows are not visible on a cached production page");
    await page.goto("/en/announcements");
    const list = page.getByTestId("announcement-list");
    await expect(list.getByRole("link", { name: `Announcement with English ${RUN}` })).toHaveAttribute("href", `/en/announcements/${seeded.withEnglish}`);
    await expect(list.locator('h2 [lang="bn"]').filter({ hasText: `পিন করা ঘোষণা ${MARKER}` })).toHaveCount(1);
    await expect(list.getByText("Important").first()).toBeVisible();

    await page.goto(`/en/announcements/${seeded.withEnglish}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Announcement with English ${RUN}`);
    await expect(page.getByTestId("announcement-body").locator("p")).toHaveText(["English details.", "Second English paragraph."]);
    await expect(page.getByRole("note")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Share on Facebook (opens in a new tab)" })).toHaveAttribute("href", new RegExp(encodeURIComponent(`/en/announcements/${seeded.withEnglish}`)));
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "en_US");

    await page.goto(`/en/announcements/${seeded.pinnedBnOnly}`);
    await expect(page.getByRole("heading", { level: 1 }).locator('[lang="bn"]')).toHaveText(`পিন করা ঘোষণা ${MARKER}`);
    await expect(page.getByRole("note")).toContainText("Bengali only");
    await expect(page.getByTestId("announcement-body")).toHaveAttribute("lang", "bn");
    // Share group "Share: <title>": named through a hidden element whose Bengali title is marked lang="bn".
    const share = page.getByRole("group", { name: `Share: পিন করা ঘোষণা ${MARKER}` });
    await expect(share).toBeVisible();
    await expect(share).not.toHaveAttribute("aria-label");
    await expect(share.locator('[hidden] [lang="bn"]')).toHaveText(`পিন করা ঘোষণা ${MARKER}`);
  });
});

test.describe("privacy", () => {
  test("Bengali: honest data description incl. Phase 2 rules", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("গোপনীয়তা নীতি");
    await expect(page.getByText("আবেদন ফর্মে আবেদনকারীর কোনো ছবি নেওয়া হয় না।")).toBeVisible();
    await expect(page.locator("#cookies")).toContainText("কোনো বিজ্ঞাপন, ট্র্যাকিং বা অ্যানালিটিক্স টুল নেই");
    await expect(page.locator("#cookies")).toContainText("sessionStorage");
    await expect(page.locator("#storage")).toContainText("বাংলাদেশের বাইরে");
    await expect(page.locator("#access")).toContainText("ধর্ম, জাতীয়তা, পেশা, রক্তের গ্রুপ");
    await expect(page.locator("#directory")).toContainText("সুস্পষ্ট সম্মতি");
    await expect(page.locator("#directory")).toContainText("১৮ বছরের কম");
    await expect(page.locator("#security")).toContainText("দুই ধাপের লগইন");
    await expect(page.locator("#security")).toContainText("CSP");
    await expect(page.locator("#public-content")).toContainText("youtube-nocookie.com");
    await expect(page.locator("#public-content")).toContainText("“Notice” পাতায়");
    await expect(page.locator("#cookies")).toContainText("ijs_lang");
    await expect(page.locator("#cookies")).toContainText("ভাষা (বাংলা/English) বদলালে লেখা হারিয়ে না যায়");
    await expect(page.locator("#languages")).toContainText("/en");
    await expect(page.locator("#contact-form").getByRole("link")).toHaveAttribute("href", "/contact");
    await expect(page.getByRole("navigation", { name: "এই পৃষ্ঠার বিষয়সূচি" }).getByRole("link")).toHaveCount(17);
  });

  test("English: the same sections in English", async ({ page }) => {
    await page.goto("/en/privacy");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy policy");
    await expect(page.locator("#directory")).toContainText("under 18");
    await expect(page.locator("#security")).toContainText("two-step login");
    await expect(page.locator("#public-content")).toContainText("Notice page");
    await expect(page.locator("#public-content")).toContainText("youtube-nocookie.com");
    await expect(page.locator("#cookies")).toContainText("ijs_lang");
    await expect(page.locator("#cookies")).toContainText("no advertising, tracking or analytics", { ignoreCase: true });
    await expect(page.locator("#contact-form").getByRole("link", { name: "the contact page" })).toHaveAttribute("href", "/en/contact");
    await expect(page.locator("#retention").getByRole("link", { name: "Who can see applications" })).toHaveAttribute("href", "#access");
    await expect(page.getByRole("navigation", { name: "Contents of this page" }).getByRole("link")).toHaveCount(17);
    await expect(page.getByText("Last updated: 28 October 2026")).toBeVisible();
  });
});

test("address: “নারায়ণগঞ্জ” only — no “কাশীপুর, ফতুল্লা” in the HTML of any page (both languages)", async ({ request }) => {
  for (const p of [...OWNED_PAGES, `/announcements/${seeded.withEnglish}`, "/"]) {
    for (const url of [p, p === "/" ? "/en" : `/en${p}`]) {
      const res = await request.get(url);
      expect(res.status(), url).toBe(200);
      const html = await res.text();
      expect(html, url).not.toContain("কাশীপুর");
      expect(html, url).not.toContain("ফতুল্লা");
      expect(html.toLowerCase(), url).not.toContain("kashipur");
      expect(html.toLowerCase(), url).not.toContain("fatullah");
    }
  }
  const { data } = await db.from("site_settings").select("value").eq("key", "organization").single();
  expect((data!.value as { location: string }).location).toBe("নারায়ণগঞ্জ");
});

test("SEO: hreflang alternates, OG locale and image, sitemap in both languages, robots", async ({ page, request }) => {
  await page.goto("/about");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/about$/);
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", /\/en\/about$/);
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute("href", /\/about$/);
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "bn_BD");
  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /\/brand\/og-default\.png$/);
  await page.goto("/en/contact");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en\/contact$/);
  await expect(page.locator('link[rel="alternate"][hreflang="bn"]')).toHaveAttribute("href", /\/contact$/);
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "en_US");
  await expect(page).toHaveTitle("Contact | Inqilab Jubo Sangathan");

  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  expect(robots).toContain("Disallow: /api");
  expect(robots).toMatch(/Sitemap: .+\/sitemap\.xml/);

  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const p of ["/about", "/contact", "/announcements", "/privacy", "/faq", "/notice", "/programs", "/membership/terms", `/activities/${CAT}`]) {
    expect(sitemap, p).toContain(`${p}</loc>`);
    expect(sitemap, `/en${p}`).toContain(`/en${p}</loc>`);
  }
  expect(sitemap).toMatch(/hreflang="en" href="[^"]+\/en\/faq"/);
  expect(sitemap).toMatch(/hreflang="x-default" href="[^"]+\/faq"/);
  expect(sitemap).not.toContain("/members</loc>");
  if (!PROD) {
    expect(sitemap).toContain(`/programs/${seeded.programSlug}</loc>`);
    expect(sitemap).toContain(`/en/announcements/${seeded.withEnglish}</loc>`);
    expect(sitemap).not.toContain(seeded.draft);
  }
});

test("detail pages render on demand in both languages — also on a production build (E2E_SERVER=production)", async ({ page }) => {
  // None of these pages is prerendered at build time; a production server renders each on its first
  // visit. (A `dynamicParams = false` in a parent layout once turned all of them into 404s there.)
  for (const url of [
    `/activities/${CAT}`,
    `/en/activities/${CAT}`,
    `/programs/${seeded.programSlug}`,
    `/en/programs/${seeded.programSlug}`,
    `/announcements/${seeded.withEnglish}`,
    `/en/announcements/${seeded.withEnglish}`,
  ]) {
    expect((await page.goto(url))?.status(), url).toBe(200);
  }
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Announcement with English ${RUN}`);
  await page.goto(`/en/programs/${seeded.programSlug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`E2E program ${RUN}`);
  // Also URLs the proxy does not rewrite (they end in a file extension), whose first segment is no language: 404, not 500.
  for (const url of ["/programs/no-such-program-e2e", "/en/activities/no-such-area-e2e", "/xx/about", "/wp-login.php", "/x/programs/a.json", "/x/about.txt"]) {
    expect((await page.goto(url))?.status(), url).toBe(404);
  }
});

test("unknown URLs: localized 404 inside the site header and footer, in the URL's language", async ({ page }) => {
  for (const [url, lang, title] of [
    ["/no-such-page-e2e", "bn", "পৃষ্ঠাটি খুঁজে পাওয়া যায়নি"],
    ["/about/no/such/page", "bn", "পৃষ্ঠাটি খুঁজে পাওয়া যায়নি"],
    ["/en/no-such-page-e2e", "en", "Page not found"],
    ["/en/about/no/such/page", "en", "Page not found"],
  ] as const) {
    expect((await page.goto(url))?.status(), url).toBe(404);
    await expect(page.locator("html"), url).toHaveAttribute("lang", lang);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page).toHaveTitle(new RegExp(`^${title} \\| `));
    const robots = await page.locator('meta[name="robots"]').evaluateAll((els) => els.map((e) => e.getAttribute("content") ?? ""));
    expect(robots.length, url).toBeGreaterThan(0);
    expect(robots.every((c) => c.includes("noindex")), `${url}: ${robots.join(" / ")}`).toBe(true);
    // Site chrome in the same language: header home link and footer.
    await expect(page.getByTestId("header-home")).toHaveAttribute("href", lang === "en" ? "/en" : "/");
    await expect(page.locator("footer")).toBeVisible();
    await expect(page.locator("main").getByRole("link", { name: lang === "en" ? "Back to the home page" : "হোম পেজে ফিরে যান" })).toHaveAttribute("href", lang === "en" ? "/en" : "/");
  }
});

test("mobile menu on short phones: every item is reachable, Notice last, language and social after the menu", async ({ browser }) => {
  for (const viewport of [{ width: 360, height: 640 }, { width: 320, height: 568 }]) {
    const ctx = await context(browser, { viewport, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    for (const [url, open, faq, language] of [
      ["/about", "মেনু খুলুন", "প্রশ্নোত্তর", "ভাষা নির্বাচন"],
      ["/en/about", "Open menu", "FAQ", "Choose language"],
    ] as const) {
      const where = `${url} at ${viewport.width}×${viewport.height}`;
      await page.goto(url);
      await page.getByRole("button", { name: open }).click();
      const drawer = page.locator("dialog#mobile-menu");
      await expect(drawer).toBeVisible();
      const links = drawer.getByRole("navigation").getByRole("link");
      await expect(links.last(), where).toHaveText("Notice");
      // Nothing is pinned over the list: on a 360×640 phone every item down to Notice is fully visible at once.
      await expect(drawer.getByRole("link", { name: faq, exact: true }), where).toBeVisible();
      if (viewport.height >= 640) await expect(links.last(), where).toBeInViewport({ ratio: 1 });
      // The whole panel scrolls; at its end the language switch (and social links) are on screen.
      await drawer.getByTestId("drawer-scroll").evaluate((el) => el.scrollTo(0, el.scrollHeight));
      await expect(drawer.getByRole("group", { name: language }), where).toBeInViewport({ ratio: 1 });
      await expect(drawer.getByRole("link", { name: /^BN|^EN/ }).first(), where).toBeInViewport();
      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
      await expectNoHorizontalOverflow(page, where);
    }
    await ctx.close();
  }
});

test("desktop header with the quiz link: the organization name stays visible at 1024–1279px", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop widths");
  test.skip(PROD, "a setting changed directly in the database is not visible on a cached production page");
  const { data: before } = await db.from("site_settings").select("value").eq("key", "quiz").single();
  const original = before!.value as { url: string | null; label_bn: string; label_en: string };
  await db.from("site_settings").update({ value: { ...original, url: "https://quiz.example.org/e2e" } as never }).eq("key", "quiz");
  try {
    for (const width of [1024, 1100, 1180, 1279]) {
      const ctx = await context(browser, { viewport: { width, height: 800 } });
      const page = await ctx.newPage();
      for (const [url, name] of [["/about", "ইনকিলাব যুব সংগঠন"], ["/en/about", "Inqilab Jubo Sangathan"]] as const) {
        const where = `${url} @${width}`;
        await page.goto(url);
        await expect(page.getByTestId("quiz-link"), where).toBeVisible();
        const el = page.getByTestId("header-name");
        await expect(el, where).toHaveText(name);
        await expect(el, where).toBeVisible();
        const m = await el.evaluate((e) => {
          const r = e.getBoundingClientRect();
          const inner = document.querySelector("header")!.firstElementChild as HTMLElement;
          return {
            lines: Math.round(r.height / parseFloat(getComputedStyle(e).lineHeight)),
            clipped: e.scrollWidth > e.clientWidth + 1,
            header: document.querySelector("header")!.getBoundingClientRect().height,
            overflow: inner.scrollWidth - inner.clientWidth,
            rows: new Set([...document.querySelectorAll('[data-testid="desktop-nav"] > ul > li')].map((li) => Math.round(li.getBoundingClientRect().top))).size,
          };
        });
        expect(m.lines, `${where}: name on at most two lines`).toBeLessThanOrEqual(2);
        expect(m.clipped, `${where}: name not cut off`).toBe(false);
        expect(m.header, `${where}: header height`).toBeLessThan(72);
        expect(m.overflow, `${where}: nothing pushed out of the header`).toBeLessThanOrEqual(0);
        expect(m.rows, `${where}: menu on one line`).toBe(1);
      }
      await ctx.close();
    }
  } finally {
    const { data: now } = await db.from("site_settings").select("value").eq("key", "quiz").single();
    if (JSON.stringify(now?.value) !== JSON.stringify(original)) await db.from("site_settings").update({ value: original as never }).eq("key", "quiz");
  }
});

test("breadcrumb: a long current title is cut to one line with nothing showing below it (360px)", async ({ browser }) => {
  test.skip(PROD, "seeded rows are not visible on a cached production page");
  const { data: ann, error } = await db
    .from("announcements")
    .insert({
      title: `দীর্ঘ শিরোনামের ঘোষণা ${MARKER}`,
      title_en: `Relief distribution and volunteer work in flood-affected areas of the district ${RUN}`,
      body: "বিবরণ।",
      body_en: "Details.",
      is_published: true,
      published_at: new Date(Date.now() - 30 * 86400_000).toISOString(),
    })
    .select("id")
    .single();
  expect(error).toBeNull();
  const ctx = await context(browser, { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  for (const url of [`/en/announcements/${ann!.id}`, `/announcements/${ann!.id}`]) {
    await page.goto(url);
    const current = page.locator('[data-page-hero] nav [aria-current="page"]');
    const m = await current.evaluate((el) => {
      const text = el.firstElementChild as HTMLElement;
      const cs = getComputedStyle(text);
      return {
        outer: el.getBoundingClientRect().height,
        visible: text.getBoundingClientRect().height,
        line: parseFloat(cs.lineHeight),
        padding: parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom),
      };
    });
    expect(m.outer, `${url}: 44px row like the links`).toBeGreaterThanOrEqual(44);
    expect(m.padding, `${url}: no padding around the clamped text`).toBe(0);
    expect(m.visible, `${url}: exactly one visible line`).toBeLessThanOrEqual(m.line + 1);
  }
  await ctx.close();
});

test("no horizontal overflow at 360–1440px on every page (both languages)", async ({ page }) => {
  test.slow();
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const p of [...OWNED_PAGES, `/announcements/${seeded.pinnedBnOnly}`]) {
      for (const url of [p, `/en${p}`]) {
        await page.goto(url);
        await expectNoHorizontalOverflow(page, `${url} @${width}`);
      }
    }
  }
});

test("axe (WCAG 2 A/AA), no CSP violations and no console errors on every page (both languages)", async ({ browser }) => {
  test.slow();
  const ctx = await context(browser);
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${page.url()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  for (const p of [...OWNED_PAGES, `/announcements/${seeded.withEnglish}`]) {
    for (const url of [p, `/en${p}`]) {
      await page.goto(url, { waitUntil: "networkidle" });
      expect(await axeViolations(page), url).toEqual([]);
      expect(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp), url).toEqual([]);
    }
  }
  expect(errors).toEqual([]);
  await ctx.close();
});

test("keep-alive cron requires the secret", async ({ request }) => {
  expect((await request.get("/api/cron/keepalive")).status()).toBe(401);
  expect((await request.get("/api/cron/keepalive", { headers: { Authorization: "Bearer wrong-secret" } })).status()).toBe(401);
  const ok = await request.get("/api/cron/keepalive", { headers: { Authorization: `Bearer ${CRON_SECRET}` } });
  expect(ok.status()).toBe(200);
  expect(ok.headers()["cache-control"]).toContain("no-store");
  expect(await ok.json()).toMatchObject({ ok: true });
});

test("long URLs and unbroken words in announcements never widen the page", async ({ page }) => {
  const { data: created, error } = await db
    .from("announcements")
    .insert([
      {
        title: `লম্বা লিংক ${MARKER}`,
        body: "নিবন্ধনের লিংক: https://docs.google.com/forms/d/e/1FAIpQLSfD3x9kQ7Zt2mVbN8yWcH5rLpA0uJ4eK6sT1gO/viewform?usp=sf_link",
        title_en: "Averyveryverylongenglishwordwithoutanyspacesthatcouldbreakthelayoutofthecard",
        is_published: true,
        is_pinned: true,
        published_at: new Date().toISOString(),
      },
    ])
    .select("id");
  expect(error).toBeNull();
  for (const width of [360, 768]) {
    await page.setViewportSize({ width, height: 800 });
    for (const p of ["/announcements", "/en/announcements", `/announcements/${created![0].id}`, `/en/announcements/${created![0].id}`]) {
      await page.goto(p);
      await expectNoHorizontalOverflow(page, `${p} @${width}`);
    }
  }
  await db.from("announcements").delete().eq("id", created![0].id);
});
