import { test, expect, type Browser, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { storageStateFor } from "./helpers/login";

/**
 * FAQ (প্রশ্নোত্তর, F10): public /faq and /en/faq (published entries only,
 * admin order, accordion with a “+” icon on the right that turns into “−”
 * when open, English with marked Bengali fallback, FAQPage JSON-LD, empty
 * state) and the admin at /admin/faq (content.manage: validation, create,
 * edit, reorder, publish toggle, delete with confirmation; committee viewers
 * are refused). The 8 suggested questions are published by migration
 * 20261028600000_faq_publish.sql (organization decision 2026-10-28).
 *
 * Creates only uniquely named entries (removed afterwards). The empty-state
 * test hides the published entries for a moment and publishes exactly those
 * again afterwards (also after a failure).
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
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

test.describe.configure({ mode: "serial" });

const PROD = process.env.E2E_SERVER === "production";

let run = "";
const states: Record<string, string> = {};
const ids: Record<string, string> = {};
const q = (key: string) => `ই২ই-প্রশ্ন-${run}-${key}?`;

async function pageAs(browser: Browser, who: string | null, opts: Parameters<Browser["newContext"]>[0] = {}): Promise<Page> {
  const ctx = await browser.newContext({ ...(who ? { storageState: states[who] } : {}), ...opts });
  await ctx.addInitScript(() => {
    const w = window as unknown as { __csp: string[] };
    w.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => w.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  return ctx.newPage();
}

async function expectNoHorizontalOverflow(page: Page) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw, `no horizontal scroll: ${page.url()}`).toBeLessThanOrEqual(iw);
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

/** Questions of this run, in the order the public page lists them. */
async function publicOrder(page: Page): Promise<string[]> {
  const texts = await page.locator('[data-testid="faq-list"] summary').allTextContents();
  return texts.map((t) => t.trim()).filter((t) => t.includes(run));
}

async function createViaForm(page: Page, v: { bn: string; answer: string; en?: string; answerEn?: string; publish: boolean }) {
  await page.goto("/admin/faq/new");
  await page.locator("#faq-question_bn").fill(v.bn);
  await page.locator("#faq-answer_bn").fill(v.answer);
  if (v.en) await page.locator("#faq-question_en").fill(v.en);
  if (v.answerEn) await page.locator("#faq-answer_en").fill(v.answerEn);
  await page.locator("#faq-published").setChecked(v.publish);
  await page.getByRole("button", { name: "প্রশ্ন যুক্ত করুন" }).click();
  await expect(page).toHaveURL(/\/admin\/faq\/[0-9a-f-]{36}\?created=1$/, { timeout: 20_000 });
  await expect(page.getByText("প্রশ্নটি তৈরি হয়েছে।")).toBeVisible();
  return new URL(page.url()).pathname.split("/").pop()!;
}

test.beforeAll(async ({ browser }, testInfo) => {
  test.setTimeout(120_000);
  run = `${testInfo.project.name.slice(0, 1)}${Date.now().toString(36)}`;
  for (const who of ["editor", "viewer"]) states[who] = await storageStateFor(browser, who);
});

test.afterAll(async () => {
  await db.from("faqs").delete().like("question_bn", `%${run}%`);
});

const SUGGESTED = [
  "সংগঠন কি কোনো রাজনৈতিক দলের সাথে যুক্ত?",
  "সংগঠনের লক্ষ্য ও উদ্দেশ্য কী?",
  "সংগঠন কোন কোন কাজ করে?",
  "সংগঠনের কর্মসূচি ও খবর কোথায় জানতে পারব?",
  "কীভাবে সদস্য হব?",
  "আবেদনের অবস্থা কীভাবে জানব?",
  "সদস্য তালিকায় আমার কোন তথ্য দেখানো হয়?",
  "সংগঠনের সাথে কীভাবে যোগাযোগ করব?",
];

test("the 8 suggested questions are published: shown on /faq and /en/faq, listed as published in the admin", async ({ browser }) => {
  const { data: rows } = await db.from("faqs").select("id, question_bn, question_en, is_published").in("question_bn", SUGGESTED);
  expect(rows).toHaveLength(SUGGESTED.length);
  expect(rows!.filter((r) => !r.is_published).map((r) => r.question_bn)).toEqual([]);
  // The public (anonymous) client sees exactly the published entries.
  const { data: visible } = await anon.from("faqs").select("id").eq("is_published", false);
  expect(visible ?? []).toEqual([]);

  const page = await pageAs(browser, null);
  await page.goto("/faq");
  await expect(page.getByTestId("faq-empty")).toHaveCount(0);
  const summaries = page.locator('[data-testid="faq-list"] summary');
  for (const question of SUGGESTED) await expect(summaries.filter({ hasText: question })).toHaveCount(1);
  // The added question points to the programs, announcements and Notice pages.
  const news = page.locator("details").filter({ hasText: "সংগঠনের কর্মসূচি ও খবর কোথায় জানতে পারব?" });
  await news.locator("summary").click();
  await expect(news).toContainText("“Notice” পাতায়");
  await page.goto("/en/faq");
  for (const r of rows!) if (r.question_en) await expect(page.locator('[data-testid="faq-list"] summary').filter({ hasText: r.question_en })).toHaveCount(1);
  await page.context().close();

  const admin = await pageAs(browser, "editor");
  await admin.goto("/admin/faq");
  const row = admin.getByTestId("faq-row").filter({ hasText: "সংগঠন কি কোনো রাজনৈতিক দলের সাথে যুক্ত?" });
  await expect(row).toHaveCount(1);
  await expect(row).not.toContainText("খসড়া");
  await expect(row.getByRole("button", { name: /^প্রকাশিত: / })).toHaveAttribute("aria-pressed", "true");
  await admin.context().close();
});

test("empty state when nothing is published (both languages)", async ({ browser }) => {
  // The entries are hidden directly in the database, which skips revalidatePath(): a production
  // server (E2E_SERVER=production) keeps serving its cached /faq, so this runs against `next dev` only.
  test.skip(PROD, "a change made directly in the database is not visible on a cached production page");
  // Create the condition for a moment: hide every published entry, then publish exactly those again.
  const { data: published } = await db.from("faqs").select("id").eq("is_published", true);
  const hidden = (published ?? []).map((r) => r.id);
  try {
    if (hidden.length) expect((await db.from("faqs").update({ is_published: false }).in("id", hidden)).error).toBeNull();
    const { count } = await anon.from("faqs").select("id", { count: "exact", head: true });
    expect(count).toBe(0);
    const page = await pageAs(browser, null);
    await page.goto("/faq");
    await expect(page.getByTestId("faq-empty")).toContainText("এখনো কোনো প্রশ্নোত্তর প্রকাশ করা হয়নি");
    await expect(page.getByTestId("faq-list")).toHaveCount(0);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
    await page.goto("/en/faq");
    await expect(page.getByTestId("faq-empty")).toContainText("No questions and answers have been published yet");
    await expect(page.getByTestId("faq-empty").getByRole("link", { name: "Contact us" })).toHaveAttribute("href", "/en/contact");
    await page.context().close();
  } finally {
    if (hidden.length) await db.from("faqs").update({ is_published: true }).in("id", hidden);
  }
  const { count: after } = await anon.from("faqs").select("id", { count: "exact", head: true });
  expect(after).toBe(hidden.length);
});

test("committee viewer cannot open the FAQ admin", async ({ browser }) => {
  const page = await pageAs(browser, "viewer");
  for (const url of ["/admin/faq", "/admin/faq/new"]) {
    await page.goto(url);
    await expect(page).toHaveURL(/\/admin\?denied=1$/);
  }
  await page.context().close();
});

test("validation, then create, edit and publish entries", async ({ browser }) => {
  const page = await pageAs(browser, "editor");
  await page.goto("/admin/faq/new");
  await page.getByRole("button", { name: "প্রশ্ন যুক্ত করুন" }).click();
  await expect(page.locator("#faq-question_bn")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#faq-question_bn")).toBeFocused();
  await expect(page.locator("#faq-question_bn-error")).toContainText("প্রশ্ন লিখুন");
  await expect(page.locator("#faq-answer_bn-error")).toContainText("উত্তর লিখুন");
  await page.locator("#faq-question_bn").fill(q("one"));
  await page.locator("#faq-answer_bn").fill("প্রথম উত্তর।");
  await page.locator("#faq-answer_en").fill("An English answer without a question.");
  await page.getByRole("button", { name: "প্রশ্ন যুক্ত করুন" }).click();
  await expect(page.locator("#faq-question_en-error")).toContainText("ইংরেজি প্রশ্নও");
  await expectNoHorizontalOverflow(page);

  ids.one = await createViaForm(page, {
    bn: q("one"),
    answer: "প্রথম উত্তরের প্রথম অনুচ্ছেদ।\n\nদ্বিতীয় অনুচ্ছেদ।",
    en: `E2E question one ${run}?`,
    answerEn: "First paragraph of the answer.\n\nSecond paragraph.",
    publish: true,
  });
  ids.two = await createViaForm(page, { bn: q("two"), answer: "শুধু বাংলায় উত্তর।", publish: true });
  ids.draft = await createViaForm(page, { bn: q("draft"), answer: "খসড়া উত্তর।", publish: false });

  // Edit: change the answer; conflict detection keeps working after a save.
  // Wait for the page's scripts: typing into the server-rendered form before React has
  // hydrated it can be merged with the original value.
  await page.goto(`/admin/faq/${ids.two}`, { waitUntil: "networkidle" });
  await expect(page.locator("#faq-answer_bn")).toHaveValue("শুধু বাংলায় উত্তর।");
  await page.locator("#faq-answer_bn").fill("শুধু বাংলায় লেখা উত্তর।");
  await expect(page.locator("#faq-answer_bn")).toHaveValue("শুধু বাংলায় লেখা উত্তর।");
  await page.getByRole("button", { name: "পরিবর্তন সংরক্ষণ করুন" }).click();
  await expect(page.getByText("প্রশ্নটি ওয়েবসাইটে প্রকাশিত")).toBeVisible();
  const { data } = await db.from("faqs").select("answer_bn, question_en, answer_en").eq("id", ids.two).single();
  expect(data).toEqual({ answer_bn: "শুধু বাংলায় লেখা উত্তর।", question_en: null, answer_en: null });
  await page.context().close();
});

test("public page: published entries in order, disclosure, JSON-LD; drafts hidden", async ({ browser }) => {
  const page = await pageAs(browser, null);
  await page.goto("/faq");
  expect(await publicOrder(page)).toEqual([q("one"), q("two")]);
  await expect(page.getByText(q("draft"))).toHaveCount(0);

  // Disclosure: closed at first; click and keyboard both toggle it. The icon on the right shows “+” closed and “−” open.
  const one = page.locator(`details[data-faq-id="${ids.one}"]`);
  const plus = one.locator("summary svg.lucide-plus");
  const minus = one.locator("summary svg.lucide-minus");
  await expect(one).not.toHaveAttribute("open", "");
  await expect(one.getByText("দ্বিতীয় অনুচ্ছেদ।")).toBeHidden();
  await expect(plus).toBeVisible();
  await expect(minus).toBeHidden();
  const [questionBox, iconBox, summaryBox] = await Promise.all([
    one.locator("summary > span").first().boundingBox(),
    plus.boundingBox(),
    one.locator("summary").boundingBox(),
  ]);
  expect(iconBox!.x, "icon right of the question").toBeGreaterThan(questionBox!.x + questionBox!.width - 1);
  expect(summaryBox!.x + summaryBox!.width - (iconBox!.x + iconBox!.width), "icon in the right corner").toBeLessThan(40);
  await one.locator("summary").click();
  await expect(one).toHaveAttribute("open", "");
  await expect(minus).toBeVisible();
  await expect(plus).toBeHidden();
  await expect(one.locator("p")).toHaveCount(2);
  await expect(one.getByText("দ্বিতীয় অনুচ্ছেদ।")).toBeVisible();
  const two = page.locator(`details[data-faq-id="${ids.two}"]`);
  await two.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(two).toHaveAttribute("open", "");
  await expect(two.locator("summary svg.lucide-minus")).toBeVisible();
  await page.keyboard.press("Space");
  await expect(two).not.toHaveAttribute("open", "");
  await expect(two.locator("summary svg.lucide-plus")).toBeVisible();
  await expect(two.locator("summary svg.lucide-minus")).toBeHidden();

  // FAQPage structured data with the visible texts.
  const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t));
  const faqLd = ld.find((d) => d["@type"] === "FAQPage");
  expect(faqLd.inLanguage).toBe("bn");
  const names = faqLd.mainEntity.map((e: { name: string }) => e.name);
  expect(names).toContain(q("one"));
  expect(names).not.toContain(q("draft"));
  expect(faqLd.mainEntity.find((e: { name: string }) => e.name === q("one")).acceptedAnswer.text).toBe(
    "প্রথম উত্তরের প্রথম অনুচ্ছেদ।\n\nদ্বিতীয় অনুচ্ছেদ।",
  );
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", /\/en\/faq$/);
  await expectNoHorizontalOverflow(page);

  // English: English text where given; Bengali fallback marked lang="bn" with a note.
  await page.goto("/en/faq");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Frequently asked questions");
  const enOne = page.locator(`details[data-faq-id="${ids.one}"]`);
  await expect(enOne.locator("summary")).toContainText(`E2E question one ${run}?`);
  await enOne.locator("summary").click();
  await expect(enOne.getByText("Second paragraph.")).toBeVisible();
  const enTwo = page.locator(`details[data-faq-id="${ids.two}"]`);
  await expect(enTwo.locator('summary [lang="bn"]')).toHaveText(q("two"));
  await expect(page.getByRole("note")).toContainText("Bengali only");
  const enLd = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t)).find((d) => d["@type"] === "FAQPage");
  expect(enLd.inLanguage).toBe("en");
  expect(enLd.mainEntity.map((e: { name: string }) => e.name)).toContain(`E2E question one ${run}?`);
  await expect(page.getByRole("link", { name: "Contact us" }).last()).toHaveAttribute("href", "/en/contact");
  await page.context().close();
});

test("reorder with up/down: the public order follows; focus stays on the control", async ({ browser }) => {
  const page = await pageAs(browser, "editor");
  await page.goto("/admin/faq");
  const rowTwo = page.locator(`[data-testid="faq-row"][data-faq-id="${ids.two}"]`);
  const up = rowTwo.getByRole("button", { name: /^উপরে: / });
  await up.focus();
  await page.keyboard.press("Enter");
  await expect(rowTwo.getByText("প্রশ্নটি এক ধাপ উপরে সরানো হয়েছে।")).toBeVisible();
  const rowOrder = () => page.getByTestId("faq-row").evaluateAll((rows) => rows.map((r) => r.getAttribute("data-faq-id")));
  await expect.poll(async () => {
    const order = await rowOrder();
    return order.indexOf(ids.two) - order.indexOf(ids.one);
  }).toBe(-1);
  await expect(page.locator(`[data-faq-id="${ids.two}"]`).getByRole("button", { name: /^(উপরে|নিচে): / }).first()).toBeFocused();

  const pub = await pageAs(browser, null);
  await pub.goto("/faq");
  expect(await publicOrder(pub)).toEqual([q("two"), q("one")]);

  // And back down.
  await page.locator(`[data-testid="faq-row"][data-faq-id="${ids.two}"]`).getByRole("button", { name: /^নিচে: / }).click();
  await expect(page.locator(`[data-faq-id="${ids.two}"]`).getByText("প্রশ্নটি এক ধাপ নিচে সরানো হয়েছে।")).toBeVisible();
  await expect.poll(async () => {
    const order = await rowOrder();
    return order.indexOf(ids.two) - order.indexOf(ids.one);
  }).toBe(1);
  await pub.reload();
  expect(await publicOrder(pub)).toEqual([q("one"), q("two")]);
  await expectNoHorizontalOverflow(page);
  await pub.context().close();
  await page.context().close();
});

test("publish toggle hides and shows an entry; delete asks for confirmation", async ({ browser }) => {
  const page = await pageAs(browser, "editor");
  await page.goto("/admin/faq");
  const row = page.locator(`[data-testid="faq-row"][data-faq-id="${ids.one}"]`);
  const toggle = row.getByRole("button", { name: /^প্রকাশিত: / });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(row.getByText("প্রশ্নটি ওয়েবসাইট থেকে লুকানো হয়েছে")).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(row).toContainText("খসড়া");
  const pub = await pageAs(browser, null);
  await pub.goto("/faq");
  expect(await publicOrder(pub)).toEqual([q("two")]);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await pub.reload();
  expect(await publicOrder(pub)).toEqual([q("one"), q("two")]);

  // Delete: Cancel has the initial focus; confirming removes the entry everywhere.
  const draftRow = page.locator(`[data-testid="faq-row"][data-faq-id="${ids.draft}"]`);
  await draftRow.getByRole("button", { name: /^মুছুন: / }).click();
  const dialog = page.getByRole("dialog", { name: "প্রশ্নটি মুছে ফেলবেন?" });
  await expect(dialog.getByRole("button", { name: "বাতিল" })).toBeFocused();
  await dialog.getByRole("button", { name: "বাতিল" }).click();
  await expect(dialog).toBeHidden();
  await draftRow.getByRole("button", { name: /^মুছুন: / }).click();
  await page.getByRole("dialog", { name: "প্রশ্নটি মুছে ফেলবেন?" }).getByRole("button", { name: "হ্যাঁ, মুছে ফেলুন" }).click();
  await expect(page.getByText("প্রশ্নটি মুছে ফেলা হয়েছে।")).toBeVisible();
  const { count } = await db.from("faqs").select("id", { count: "exact", head: true }).eq("id", ids.draft);
  expect(count).toBe(0);

  // A stale edit link answers 404 inside the admin panel.
  const gone = await page.goto(`/admin/faq/${ids.draft}`);
  expect(gone?.status()).toBe(404);
  await expect(page.getByText("প্রশ্নটি খুঁজে পাওয়া যায়নি")).toBeVisible();
  expect((await page.goto("/admin/faq/not-an-id"))?.status()).toBe(404);
  await pub.context().close();
  await page.context().close();
});

test("FAQ pages pass axe, show no CSP violations and fit every width (both languages)", async ({ browser }) => {
  const page = await pageAs(browser, null);
  for (const url of ["/faq", "/en/faq"]) {
    await page.goto(url);
    await page.locator("details summary").first().click();
    expect(await axeViolations(page), url).toEqual([]);
    expect(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp), url).toEqual([]);
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      await expectNoHorizontalOverflow(page);
    }
  }
  await page.context().close();
  const admin = await pageAs(browser, "editor");
  await admin.goto("/admin/faq");
  expect(await axeViolations(admin), "/admin/faq").toEqual([]);
  await admin.goto(`/admin/faq/${ids.one}`);
  expect(await axeViolations(admin), "/admin/faq/[id]").toEqual([]);
  await admin.context().close();
});
