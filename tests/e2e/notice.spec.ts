import { test, expect, type Browser, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { storageStateFor, TEST_PASSWORD } from "./helpers/login";

/**
 * Notice (organization decision Q9 — the same English word on Bengali and
 * English pages; table press_items): admin adds a news link and a YouTube
 * interview → listed on /notice (both languages, kind filter, page title
 * "Notice", menu item last), external links open safely in a new
 * tab, the YouTube player loads only after "চালান" (mouse and keyboard),
 * invalid links are refused (form and database), drafts stay hidden, the
 * interview also shows on its program's page, delete with confirmation.
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

const VIDEO_ID = "dQw4w9WgXcQ";

test.describe.configure({ mode: "serial" });

let run = "";
let program: { id: string; slug: string } = { id: "", slug: "" };
const states: Record<string, string> = {};

const title = (s: string) => `ই২ই-নোটিশ-${run}-${s}`;

function dhakaDate(days = 0): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date(Date.now() + days * 86_400_000));
}

/** Third-party media is not reachable from the test machine: answer thumbnail and player requests locally. */
async function stubYoutube(page: Page) {
  const jpg = await sharp({ create: { width: 480, height: 360, channels: 3, background: "#222" } }).jpeg().toBuffer();
  await page.route("https://i.ytimg.com/**", (route) => route.fulfill({ status: 200, contentType: "image/jpeg", body: jpg }));
  await page.route("https://www.youtube-nocookie.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>player</title><p>stub player</p>" }),
  );
}

async function pageAs(browser: Browser, who: string | null): Promise<Page> {
  const ctx = await browser.newContext(who ? { storageState: states[who] } : {});
  const page = await ctx.newPage();
  await stubYoutube(page);
  return page;
}

async function expectNoHorizontalOverflow(page: Page) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw, "page must not scroll horizontally").toBeLessThanOrEqual(iw);
}

const axePath = path.join(process.cwd(), "node_modules/axe-core/axe.min.js");
async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ path: axePath });
  const result = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe;
    return axe.run({ include: [["main"]] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
  });
  return result.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(" ")}`));
}

async function fillPress(
  page: Page,
  v: { kind?: "news" | "interview" | "video_report"; url?: string; outlet?: string; date?: string; titleBn?: string; titleEn?: string; summary?: string; program?: string; publish?: boolean },
) {
  if (v.kind) await page.locator(`input[name=kind][value=${v.kind}]`).check();
  if (v.url !== undefined) await page.locator("#url").fill(v.url);
  if (v.outlet !== undefined) await page.locator("#outlet_bn").fill(v.outlet);
  if (v.date !== undefined) await page.locator("#published_on").fill(v.date);
  if (v.titleBn !== undefined) await page.locator("#title_bn").fill(v.titleBn);
  if (v.titleEn !== undefined) await page.locator("#title_en").fill(v.titleEn);
  if (v.summary !== undefined) await page.locator("#summary_bn").fill(v.summary);
  if (v.program !== undefined) await page.locator("#program_id").selectOption(v.program);
  if (v.publish !== undefined) await page.locator("#is_published").setChecked(v.publish);
}

test.beforeAll(async ({ browser }, testInfo) => {
  run = `${testInfo.project.name.slice(0, 1)}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toLowerCase();
  for (const who of ["editor", "viewer"]) states[who] = await storageStateFor(browser, who);
  const { data: cat } = await db.from("activity_categories").select("id").eq("slug", "other-activities").single();
  const { data, error } = await db
    .from("programs")
    .insert({
      slug: `e2e-press-${run}`,
      category_id: cat!.id,
      title_bn: `ই২ই-নোটিশ-কর্মসূচি-${run}`,
      starts_on: dhakaDate(-3),
      is_published: true,
    })
    .select("id, slug")
    .single();
  expect(error).toBeNull();
  program = data!;
});

test.afterAll(async () => {
  await db.from("press_items").delete().like("title_bn", `%${run}%`);
  await db.from("programs").delete().like("title_bn", `%${run}%`);
});

test("committee viewer cannot open the Notice admin", async ({ browser }) => {
  const page = await pageAs(browser, "viewer");
  await page.goto("/admin/notice");
  await expect(page).toHaveURL(/\/admin\?denied=1$/);
  await page.context().close();
});

test("invalid links are refused by the form and by the database", async ({ browser }) => {
  const page = await pageAs(browser, "editor");
  await page.goto("/admin/notice/new");
  // Admin labels: "Notice" in the title, heading and sidebar (decision Q9).
  await expect(page).toHaveTitle("Notice — নতুন আইটেম | অ্যাডমিন");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Notice — নতুন আইটেম");
  // Sidebar entry (on phones the sidebar sits behind the menu button, so check the markup).
  await expect(page.locator('nav[aria-label="অ্যাডমিন মেনু"] a[href="/admin/notice"]').first()).toHaveText(/Notice/);
  await page.getByRole("button", { name: "প্রতিবেদন যুক্ত করুন" }).click();
  await expect(page.locator("#url-error")).toBeVisible();
  await expect(page.locator("#outlet_bn-error")).toBeVisible();
  await expect(page.locator("#title_bn-error")).toBeVisible();

  for (const bad of ["http://www.example.com/news/1", "javascript:alert(1)", "www.example.com/news"]) {
    await fillPress(page, { url: bad, outlet: "উদাহরণ", date: dhakaDate(-1), titleBn: title("invalid") });
    await expect(page.getByText("লিংকটি এখনো সঠিক নয়")).toBeVisible();
    await page.getByRole("button", { name: "প্রতিবেদন যুক্ত করুন" }).click();
    await expect(page.locator("#url-error")).toContainText("https://");
    await expect(page).toHaveURL(/\/admin\/notice\/new$/);
  }
  // A future date is refused too.
  await fillPress(page, { url: "https://www.example.com/news/1", date: dhakaDate(5) });
  await page.getByRole("button", { name: "প্রতিবেদন যুক্ত করুন" }).click();
  await expect(page.locator("#published_on-error")).toContainText("ভবিষ্যতের");
  await page.context().close();

  // Database check constraint (any client).
  const editorDb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  expect((await editorDb.auth.signInWithPassword({ email: "editor@test.local", password: TEST_PASSWORD })).error).toBeNull();
  const { error } = await editorDb.from("press_items").insert({
    kind: "news",
    title_bn: title("db-invalid"),
    outlet_bn: "উদাহরণ",
    url: "javascript:alert(1)",
    published_on: dhakaDate(-1),
  });
  expect(error?.code).toBe("23514");
  // Anonymous visitors cannot write.
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anonInsert = await anon.from("press_items").insert({
    kind: "news",
    title_bn: title("anon"),
    outlet_bn: "উদাহরণ",
    url: "https://www.example.com/",
    published_on: dhakaDate(-1),
    is_published: true,
  });
  expect(anonInsert.error).not.toBeNull();
});

test("news link and YouTube interview are listed; links open safely; player loads only on request", async ({ browser }) => {
  test.slow();
  const page = await pageAs(browser, "editor");
  await page.goto("/admin/notice/new");
  await fillPress(page, {
    kind: "news",
    url: "https://www.example.com/bangladesh/winter-2026",
    outlet: `দৈনিক উদাহরণ ${run}`,
    date: dhakaDate(-2),
    titleBn: title("news"),
    titleEn: `E2E ${run} news`,
    summary: "স্থানীয় পত্রিকার প্রতিবেদন।",
    publish: true,
  });
  await expect(page.getByText("ওয়েবসাইটে মূল প্রতিবেদনের লিংক দেখাবে")).toBeVisible();
  await page.getByRole("button", { name: "প্রতিবেদন যুক্ত করুন" }).click();
  await expect(page).toHaveURL(/\/admin\/notice\/[0-9a-f-]{36}\?created=1$/);
  await expect(page.getByText("প্রতিবেদনটি যুক্ত হয়েছে।")).toBeVisible();

  await page.goto("/admin/notice/new");
  await fillPress(page, {
    kind: "interview",
    url: `https://youtu.be/${VIDEO_ID}?si=share`,
    outlet: `উদাহরণ টিভি ${run}`,
    date: dhakaDate(-1),
    titleBn: title("interview"),
    program: program.id,
    publish: true,
  });
  await expect(page.getByTestId("youtube-preview")).toContainText(VIDEO_ID);
  await page.getByRole("button", { name: "প্রতিবেদন যুক্ত করুন" }).click();
  await expect(page).toHaveURL(/\/admin\/notice\/[0-9a-f-]{36}\?created=1$/);
  await page.goto(`/admin/notice?q=${encodeURIComponent(run)}`);
  await expect(page.getByTestId("press-row")).toHaveCount(2);
  await page.context().close();

  const pub = await pageAs(browser, null);
  await pub.goto("/notice");
  // "Notice" is an English word on the Bengali page too (marked lang="en"); title, breadcrumb and menu agree.
  await expect(pub.getByRole("heading", { level: 1 })).toHaveText("Notice");
  await expect(pub.getByRole("heading", { level: 1 }).locator('span[lang="en"]')).toHaveText("Notice");
  await expect(pub).toHaveTitle("Notice | ইনকিলাব যুব সংগঠন");
  await expect(pub.getByRole("navigation", { name: "পৃষ্ঠার অবস্থান" }).locator('[aria-current="page"]')).toHaveText("Notice");
  await expect(pub.locator("main")).not.toContainText("প্রেস");
  await expect(pub.getByText("সংবাদের লেখা বা ভিডিও এই ওয়েবসাইটে কপি করে রাখা হয় না")).toBeVisible();
  const news = pub.getByTestId("press-item").filter({ hasText: title("news") });
  await expect(news).toContainText(`দৈনিক উদাহরণ ${run}`);
  await expect(news).toContainText("সংবাদ");
  const newsLink = news.getByRole("link", { name: new RegExp(`সংবাদটি পড়ুন.*${title("news")}.*নতুন ট্যাবে খুলবে`) });
  await expect(newsLink).toHaveAttribute("href", "https://www.example.com/bangladesh/winter-2026");
  await expect(newsLink).toHaveAttribute("target", "_blank");
  await expect(newsLink).toHaveAttribute("rel", "noopener noreferrer");

  // Interview: thumbnail + "চালান"; no player until pressed.
  const interview = pub.getByTestId("press-item").filter({ hasText: title("interview") });
  await expect(interview.getByRole("link", { name: `ই২ই-নোটিশ-কর্মসূচি-${run}` })).toHaveAttribute("href", `/programs/${program.slug}`);
  await expect(interview.locator("iframe")).toHaveCount(0);
  await expect(interview.locator("img")).toHaveAttribute("src", `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`);
  const play = interview.getByRole("button", { name: `ভিডিও চালান: ${title("interview")}` });
  await play.click();
  const frame = interview.getByTestId("youtube-frame");
  await expect(frame).toHaveAttribute("src", `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0`);
  await expect(frame).toHaveAttribute("title", `${title("interview")} — ভিডিও`);
  await expect(frame).toBeFocused();
  await expect(interview.getByRole("link", { name: /ইউটিউবে দেখুন/ })).toHaveAttribute("href", `https://youtu.be/${VIDEO_ID}?si=share`);
  await expectNoHorizontalOverflow(pub);

  // Keyboard: Tab to the play button and press Enter.
  await pub.reload();
  const play2 = pub.getByTestId("press-item").filter({ hasText: title("interview") }).getByRole("button", { name: /ভিডিও চালান/ });
  await play2.focus();
  await expect(play2).toBeFocused();
  await pub.keyboard.press("Enter");
  await expect(pub.getByTestId("press-item").filter({ hasText: title("interview") }).getByTestId("youtube-frame")).toBeVisible();

  // Kind filter.
  await pub.goto("/notice?kind=interview");
  await expect(pub.getByTestId("press-item").filter({ hasText: title("interview") })).toHaveCount(1);
  await expect(pub.getByTestId("press-item").filter({ hasText: title("news") })).toHaveCount(0);
  await expect(pub.locator('nav a[aria-current="page"]').filter({ hasText: "সাক্ষাৎকার" })).toBeVisible();

  // English page: translated title where given, Bengali fallback marked, English labels.
  await pub.goto("/en/notice");
  await expect(pub.getByRole("heading", { level: 1 })).toHaveText("Notice");
  await expect(pub).toHaveTitle("Notice | Inqilab Jubo Sangathan");
  await expect(pub.locator("main")).not.toContainText(/\bPress\b/);
  await expect(pub.getByTestId("press-item").filter({ hasText: `E2E ${run} news` }).getByRole("link", { name: /Read the news/ })).toBeVisible();
  const enInterview = pub.getByTestId("press-item").filter({ hasText: title("interview") });
  await expect(enInterview.locator("h2 span[lang=bn]")).toHaveText(title("interview"));
  await expect(enInterview.getByRole("button", { name: /^Play video:/ })).toBeVisible();
  await expect(pub.locator('link[rel="alternate"][hreflang="bn"]')).toHaveAttribute("href", /^(https?:\/\/[^/]+)?\/notice$/);
  await expectNoHorizontalOverflow(pub);

  // The program page lists its press coverage.
  await pub.goto(`/programs/${program.slug}`);
  await expect(pub.getByRole("heading", { name: "Notice — গণমাধ্যমে এই কর্মসূচি" })).toBeVisible();
  await expect(pub.getByTestId("press-item").filter({ hasText: title("interview") })).toHaveCount(1);
  await pub.context().close();
});

test("Notice pages pass axe (WCAG 2 AA) in both languages", async ({ browser }) => {
  const pub = await pageAs(browser, null);
  for (const url of ["/notice", "/en/notice", "/notice?kind=news"]) {
    await pub.goto(url);
    expect(await axeViolations(pub), url).toEqual([]);
  }
  await pub.context().close();
});

test("unpublished items stay hidden; delete asks for confirmation", async ({ browser }) => {
  const page = await pageAs(browser, "editor");
  await page.goto("/admin/notice/new");
  await fillPress(page, {
    kind: "video_report",
    url: "https://www.facebook.com/examplenews/videos/1234567890",
    outlet: "উদাহরণ নিউজ",
    date: dhakaDate(-1),
    titleBn: title("draft"),
    publish: false,
  });
  await expect(page.getByText("ভিডিও লিংক (ইউটিউব নয়)")).toBeVisible();
  await page.getByRole("button", { name: "প্রতিবেদন যুক্ত করুন" }).click();
  await expect(page).toHaveURL(/\/admin\/notice\/[0-9a-f-]{36}\?created=1$/);

  const pub = await pageAs(browser, null);
  await pub.goto("/notice?kind=video_report");
  await expect(pub.getByText(title("draft"))).toHaveCount(0);

  // Publish: a Facebook video only links out (no embed).
  await page.locator("#is_published").check();
  await page.getByRole("button", { name: "পরিবর্তন সংরক্ষণ করুন" }).click();
  await expect(page.getByText("প্রতিবেদনটি ওয়েবসাইটের “Notice” পাতায় প্রকাশিত")).toBeVisible();
  await pub.goto("/notice?kind=video_report");
  const item = pub.getByTestId("press-item").filter({ hasText: title("draft") });
  await expect(item.getByRole("link", { name: /ভিডিও দেখুন/ })).toHaveAttribute("href", "https://www.facebook.com/examplenews/videos/1234567890");
  await expect(item.locator("iframe, button")).toHaveCount(0);

  // Delete from the list (cancel first, then confirm).
  await page.goto(`/admin/notice?q=${encodeURIComponent(title("draft"))}`);
  await page.getByRole("button", { name: `“${title("draft")}” মুছে ফেলুন` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "বাতিল" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: `“${title("draft")}” মুছে ফেলুন` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "হ্যাঁ, মুছে ফেলুন" }).click();
  await expect(page).toHaveURL(/\/admin\/notice\?deleted=1$/);
  const { data } = await db.from("press_items").select("id").eq("title_bn", title("draft"));
  expect(data).toHaveLength(0);
  await page.context().close();
  await pub.context().close();
});
