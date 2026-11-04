import { test, expect, type BrowserContext, type Locator, type Page, type TestInfo } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loginAs } from "./helpers/login";

/**
 * Site header & footer (chrome): language switch (keeps page + query) and
 * language memory (ijs_lang cookie, only "/" follows it), Activities ▾ and
 * social ▾ dropdowns (keyboard), menu order (decisions 2026-10-28: no Media
 * dropdown, Gallery and Notice are top-level links, Notice is always the last
 * item in the header, the mobile drawer and the footer), social links and the
 * quiz link driven by the admin content form, mobile drawer, one-line desktop
 * header from 1024px in both languages with a readable organization name,
 * axe checks and no CSP violations.
 *
 * Social / quiz settings are changed only for the duration of a test and
 * restored exactly afterwards (afterAll restores them even after a failure).
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
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

test.describe.configure({ mode: "serial" });

let original: { social: unknown; quiz: unknown } = { social: null, quiz: null };

async function setting(key: string) {
  const { data } = await db.from("site_settings").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}
async function restore(key: "social" | "quiz") {
  const value = original[key];
  if (value === null) return;
  const now = await setting(key);
  if (JSON.stringify(now) !== JSON.stringify(value)) await db.from("site_settings").update({ value: value as never }).eq("key", key);
}

test.beforeAll(async () => {
  original = { social: await setting("social"), quiz: await setting("quiz") };
});
test.afterAll(async () => {
  await restore("social");
  await restore("quiz");
});

/** Records Content-Security-Policy violations of every page in the context. */
async function trackCsp(ctx: BrowserContext) {
  await ctx.addInitScript(() => {
    const w = window as unknown as { __csp: string[] };
    w.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => w.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
}
async function expectNoCspViolations(page: Page) {
  const v = await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []);
  expect(v, `CSP violations on ${page.url()}`).toEqual([]);
}

async function expectNoHorizontalOverflow(page: Page) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw, "page must not scroll horizontally").toBeLessThanOrEqual(iw);
}

/** Header name: shown (not visually hidden) and not cut off (no ellipsis / overflowing word). */
async function nameState(page: Page): Promise<{ visible: boolean; clipped: boolean }> {
  return page.getByTestId("header-name").evaluate((el) => {
    const wrapper = el.parentElement!;
    const hidden = getComputedStyle(wrapper).position === "absolute" && wrapper.getBoundingClientRect().width <= 1;
    return { visible: !hidden && el.getBoundingClientRect().width > 1, clipped: el.scrollWidth > el.clientWidth + 1 };
  });
}

const axePath = path.join(process.cwd(), "node_modules/axe-core/axe.min.js");
/** axe-core WCAG 2 A/AA scan of the header / footer / open menus. */
async function axeViolations(page: Page, include: string[]): Promise<string[]> {
  await page.addScriptTag({ path: axePath });
  const result = await page.evaluate(async (sel) => {
    const axe = (window as unknown as { axe: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe;
    return axe.run({ include: sel.map((s) => [s]) }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
  }, include);
  return result.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(" ")}`));
}

const isMobile = (testInfo: TestInfo) => testInfo.project.name === "mobile";

/** On phones the language switch / social links / nav live in the drawer. */
async function openDrawerIfMobile(page: Page, testInfo: TestInfo) {
  if (!isMobile(testInfo)) return;
  const toggle = page.locator('button[aria-controls="mobile-menu"]');
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await expect(page.locator("dialog#mobile-menu")).toBeVisible();
}

async function freshPage(browser: import("@playwright/test").Browser, testInfo: TestInfo, viewport?: { width: number; height: number }) {
  const u = testInfo.project.use;
  const ctx = await browser.newContext({
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    locale: "bn-BD",
    timezoneId: "Asia/Dhaka",
    viewport: viewport ?? u.viewport,
    userAgent: u.userAgent,
    deviceScaleFactor: u.deviceScaleFactor,
    isMobile: viewport ? false : u.isMobile,
    hasTouch: viewport ? false : u.hasTouch,
  });
  await trackCsp(ctx);
  return ctx.newPage();
}

// ---------------------------------------------------------------------------

test("language switch keeps the page and the query string, in both directions", async ({ browser }, testInfo) => {
  const page = await freshPage(browser, testInfo);
  for (const [bnPath, enPath] of [
    ["/", "/en"],
    ["/about", "/en/about"],
    ["/programs?status=completed", "/en/programs?status=completed"],
    ["/contact", "/en/contact"],
    ["/notice", "/en/notice"],
  ]) {
    await page.goto(bnPath);
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
    await openDrawerIfMobile(page, testInfo);
    // WCAG 2.5.3 label in name: the visible “EN” starts the accessible name “EN – English”.
    const en = page.getByRole("link", { name: "EN – English", exact: true }).filter({ visible: true });
    await expect(en).toHaveText(/^EN\b/);
    await expect(en).toHaveAttribute("lang", "en");
    await expect(en).toHaveAttribute("hreflang", "en");
    await expect(page.getByRole("link", { name: "BN – বাংলা", exact: true }).filter({ visible: true })).toHaveAttribute("aria-current", "true");
    await en.click();
    await page.waitForURL((u) => u.pathname.startsWith("/en"));
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(enPath);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expectNoCspViolations(page);

    await openDrawerIfMobile(page, testInfo);
    await page.getByRole("link", { name: "BN – বাংলা", exact: true }).filter({ visible: true }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/en"));
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(bnPath);
    await expectNoCspViolations(page);
  }
  await page.context().close();
});

test("language memory: the switch sets ijs_lang for a year; only a page visit to / follows it", async ({ browser, request }, testInfo) => {
  const page = await freshPage(browser, testInfo);
  const langCookie = async () => (await page.context().cookies()).find((c) => c.name === "ijs_lang");
  await page.goto("/about");
  expect(await langCookie()).toBeUndefined();
  await openDrawerIfMobile(page, testInfo);
  await page.getByRole("link", { name: "EN – English", exact: true }).filter({ visible: true }).click();
  await page.waitForURL((u) => u.pathname === "/en/about");
  const cookie = await langCookie();
  expect(cookie).toMatchObject({ value: "en", path: "/", sameSite: "Lax", httpOnly: false });
  const days = (cookie!.expires - Date.now() / 1000) / 86_400;
  expect(days).toBeGreaterThan(364);
  expect(days).toBeLessThan(366);

  // The bare "/" opens the English home page; every other URL keeps its own language.
  await page.goto("/");
  expect(new URL(page.url()).pathname).toBe("/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.goto("/about");
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");

  // Choosing বাংলা is remembered too.
  await page.goto("/en/contact");
  await openDrawerIfMobile(page, testInfo);
  await page.getByRole("link", { name: "BN – বাংলা", exact: true }).filter({ visible: true }).click();
  await page.waitForURL((u) => u.pathname === "/contact");
  expect((await langCookie())?.value).toBe("bn");
  await page.goto("/");
  expect(new URL(page.url()).pathname).toBe("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  await page.context().close();

  // Server side: 307 + private/no-store only for a document request to "/" (Sec-Fetch-Dest: document, or an
  // HTML Accept header in browsers without Sec-Fetch-*); the router's fetch(), other paths and "bn" are not redirected.
  const html = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
  const get = (url: string, headers: Record<string, string>) => request.get(url, { headers, maxRedirects: 0 });
  for (const headers of [
    { cookie: "ijs_lang=en", "sec-fetch-dest": "document", accept: html } as Record<string, string>,
    { cookie: "ijs_lang=en", accept: html },
  ]) {
    const r = await get("/", headers);
    expect(r.status(), JSON.stringify(headers)).toBe(307);
    expect(r.headers()["location"]).toMatch(/\/en$/);
    expect(r.headers()["cache-control"]).toBe("private, no-store");
  }
  expect((await get("/", { cookie: "ijs_lang=en", "sec-fetch-dest": "empty", accept: "*/*" })).status()).toBe(200);
  expect((await get("/", { cookie: "ijs_lang=en", accept: "*/*" })).status()).toBe(200);
  expect((await get("/about", { cookie: "ijs_lang=en", "sec-fetch-dest": "document", accept: html })).status()).toBe(200);
  expect((await get("/", { cookie: "ijs_lang=bn", "sec-fetch-dest": "document", accept: html })).status()).toBe(200);
  expect((await get("/", { "sec-fetch-dest": "document", accept: html })).status()).toBe(200);

  // A client-side "হোম" link on a Bengali page keeps the Bengali home page even with ijs_lang=en.
  const nav = await freshPage(browser, testInfo);
  await nav.context().addCookies([{ name: "ijs_lang", value: "en", url: process.env.BASE_URL ?? "http://localhost:3000" }]);
  await nav.goto("/about");
  await expect(nav.locator("html")).toHaveAttribute("lang", "bn");
  await nav.getByTestId("header-home").click();
  await nav.waitForURL((u) => u.pathname === "/");
  await expect(nav.locator("html")).toHaveAttribute("lang", "bn");
  await expect(nav.getByRole("heading", { level: 1 })).toHaveText("ইনকিলাব যুব সংগঠন");
  await nav.context().close();
});

test("desktop menu: Activities ▾ (keyboard, Escape, outside click); Gallery and Notice are top-level links", async ({ browser }, testInfo) => {
  test.skip(isMobile(testInfo), "desktop menu");
  const page = await freshPage(browser, testInfo);
  await page.goto("/notice");
  const nav = page.getByTestId("desktop-nav");
  const activities = nav.getByRole("button", { name: "কার্যক্রম" });

  // No Media dropdown any more: Activities is the only dropdown; Notice is a top-level link for the current page.
  await expect(nav.getByRole("button")).toHaveCount(1);
  await expect(nav.getByRole("button", { name: "মিডিয়া" })).toHaveCount(0);
  const notice = nav.getByRole("link", { name: "Notice", exact: true });
  await expect(notice).toHaveAttribute("href", "/notice");
  await expect(notice).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "গ্যালারি", exact: true })).toHaveAttribute("href", "/gallery");
  await expect(activities).not.toHaveAttribute("data-active", "true");

  await activities.focus();
  await page.keyboard.press("ArrowDown");
  await expect(activities).toHaveAttribute("aria-expanded", "true");
  const panel = page.locator(`#${await activities.getAttribute("aria-controls")}`);
  await expect(panel.getByRole("link", { name: "কার্যক্রমের ক্ষেত্র" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(panel.getByRole("link", { name: "কর্মসূচি" })).toBeFocused();
  await page.keyboard.press("ArrowDown"); // wraps
  await expect(panel.getByRole("link", { name: "কার্যক্রমের ক্ষেত্র" })).toBeFocused();
  await page.keyboard.press("End");
  await expect(panel.getByRole("link", { name: "কর্মসূচি" })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(panel.getByRole("link", { name: "কার্যক্রমের ক্ষেত্র" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(activities).toHaveAttribute("aria-expanded", "false");
  await expect(activities).toBeFocused();

  // ↑ opens on the last item; Tab out closes.
  await page.keyboard.press("ArrowUp");
  await expect(panel.getByRole("link", { name: "কর্মসূচি" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(activities).toHaveAttribute("aria-expanded", "false");

  // Click opens; an outside click closes.
  await activities.click();
  await expect(activities).toHaveAttribute("aria-expanded", "true");
  await expect(panel.getByRole("link", { name: "কর্মসূচি" })).toHaveAttribute("href", "/programs");
  expect(await axeViolations(page, ["header"])).toEqual([]);
  await page.mouse.click(5, 400);
  await expect(activities).toHaveAttribute("aria-expanded", "false");

  // Following a link closes the menu and navigates; the group is then marked active.
  await activities.click();
  await panel.getByRole("link", { name: "কর্মসূচি" }).click();
  await page.waitForURL(/\/programs$/);
  await expect(activities).toHaveAttribute("aria-expanded", "false");
  await expect(activities).toHaveAttribute("data-active", "true");

  // English labels and URLs ("Announcements", never "Notices", next to "Notice").
  await page.goto("/en/gallery");
  await expect(nav.getByRole("button")).toHaveCount(1);
  await expect(nav.getByRole("button", { name: "Media" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Gallery", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Notice", exact: true })).toHaveAttribute("href", "/en/notice");
  await expect(nav.getByRole("link", { name: "Announcements", exact: true })).toHaveAttribute("href", "/en/announcements");
  for (const part of ["header", "footer"]) await expect(page.locator(part).first()).not.toContainText(/\bNotices\b|\bPress\b|\bMedia\b/);
  await expectNoCspViolations(page);
  await page.context().close();
});

/** Visible link texts (screen-reader-only hints such as “opens in a new tab” removed), in document order. */
async function linkTexts(scope: Locator): Promise<string[]> {
  return scope.evaluateAll((els) =>
    els.map((el) => {
      const copy = el.cloneNode(true) as HTMLElement;
      copy.querySelectorAll(".sr-only").forEach((n) => n.remove());
      return (copy.textContent ?? "").replace(/\s+/g, " ").trim();
    }),
  );
}

test("menu order: Notice is the last item in the header, the mobile drawer and the footer (both languages, with the quiz link)", async ({ browser }, testInfo) => {
  test.skip(process.env.E2E_SERVER === "production", "writes site_settings directly; a production server keeps serving its cached public pages");
  test.setTimeout(90_000);
  const directory = ((await setting("directory")) as { enabled?: boolean } | null)?.enabled !== false;
  const members = (label: string) => (directory ? [label] : []);
  await db.from("site_settings").update({ value: { url: "https://quiz.example.org/", label_bn: "সীরাত কুইজ", label_en: "Seerat Quiz" } as never }).eq("key", "quiz");
  try {
    const expected = {
      "/about": {
        header: ["হোম", "পরিচিতি", "কার্যক্রম", "গ্যালারি", ...members("সদস্যবৃন্দ"), "ঘোষণা", "যোগাযোগ", "সীরাত কুইজ", "Notice"],
        drawer: ["হোম", "পরিচিতি", "কার্যক্রমের ক্ষেত্র", "কর্মসূচি", "গ্যালারি", ...members("সদস্যবৃন্দ"), "ঘোষণা", "প্রশ্নোত্তর", "যোগাযোগ", "সীরাত কুইজ", "Notice"],
        footer: ["হোম", "আমাদের সম্পর্কে", "আমাদের কার্যক্রম", "কর্মসূচি", "গ্যালারি", ...members("সদস্যবৃন্দ"), "ঘোষণা", "প্রশ্নোত্তর", "যোগাযোগ", "সীরাত কুইজ", "Notice"],
      },
      "/en/about": {
        header: ["Home", "About", "Activities", "Gallery", ...members("Members"), "Announcements", "Contact", "Seerat Quiz", "Notice"],
        drawer: ["Home", "About", "Areas of work", "Programs", "Gallery", ...members("Members"), "Announcements", "FAQ", "Contact", "Seerat Quiz", "Notice"],
        footer: ["Home", "About us", "Our activities", "Programs", "Gallery", ...members("Members"), "Announcements", "FAQ", "Contact", "Seerat Quiz", "Notice"],
      },
    } as const;
    const page = await freshPage(browser, testInfo);
    for (const [url, want] of Object.entries(expected)) {
      await page.goto(url);
      if (isMobile(testInfo)) {
        await openDrawerIfMobile(page, testInfo);
        expect(await linkTexts(page.locator("dialog#mobile-menu nav").locator("a")), `${url} drawer`).toEqual(want.drawer);
        await page.keyboard.press("Escape");
      } else {
        const top = page.getByTestId("desktop-nav").locator(":scope > ul > li > a, :scope > ul > li > div > button");
        expect(await linkTexts(top), `${url} header`).toEqual(want.header);
      }
      expect(await linkTexts(page.locator('footer nav[aria-labelledby="footer-explore"] a')), `${url} footer`).toEqual(want.footer);
      const lang = url.startsWith("/en") ? "/en" : "";
      await expect(page.locator('footer nav[aria-labelledby="footer-explore"] a').last()).toHaveAttribute("href", `${lang}/notice`);
      await expect(page.locator('footer nav[aria-labelledby="footer-explore"] a[href$="/faq"]')).toHaveCount(1);
    }
    await page.context().close();
  } finally {
    await restore("quiz");
  }
});

test("social menu lists only saved links (YouTube added and removed through the admin form)", async ({ browser }, testInfo) => {
  test.setTimeout(120_000);
  const contact = (await setting("contact")) as { facebook_url?: string | null } | null;
  const hasFacebook = Boolean(contact?.facebook_url);
  const youtube = `https://www.youtube.com/@ijs-e2e-${Date.now().toString(36)}`;

  // Start from no extra links.
  await db.from("site_settings").update({ value: { links: [] } as never }).eq("key", "social");

  const admin = await freshPage(browser, testInfo);
  await loginAs(admin, "editor");
  await admin.goto("/admin/content?section=social");
  await admin.getByTestId("social-add").click();
  const row = admin.getByTestId("social-row").first();
  await row.getByLabel(/মাধ্যম/).selectOption("youtube");
  // Invalid host: refused in the browser, values kept.
  await row.getByLabel(/লিংক/).fill("https://evil.example/youtube.com/x");
  await admin.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  await expect(admin.locator("#social-0-url-error")).toBeVisible();
  await expect(row.getByLabel(/লিংক/)).toHaveValue("https://evil.example/youtube.com/x");
  await row.getByLabel(/লিংক/).fill(youtube);
  await admin.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  await expect(admin.getByText("পরিবর্তন সংরক্ষিত হয়েছে।")).toBeVisible();
  expect(await setting("social")).toEqual({ links: [{ platform: "youtube", url: youtube }] });
  await expectNoCspViolations(admin);

  const page = await freshPage(browser, testInfo);
  await page.goto("/about");
  await openDrawerIfMobile(page, testInfo);
  const socialButton = page.getByTestId("desktop-tools").getByRole("button", { name: "সামাজিক মাধ্যম" });
  if (!isMobile(testInfo)) {
    await socialButton.click();
    await expect(socialButton).toHaveAttribute("aria-expanded", "true");
  }
  const scope = isMobile(testInfo) ? page.locator("dialog#mobile-menu") : page.locator(`#${await socialButton.getAttribute("aria-controls")}`);
  const yt = scope.locator('a[data-platform="youtube"]');
  await expect(yt).toHaveAttribute("href", youtube);
  await expect(yt).toHaveAttribute("target", "_blank");
  await expect(yt).toHaveAttribute("rel", "noopener noreferrer");
  await expect(yt).toContainText("ইউটিউব");
  await expect(yt).toContainText("(নতুন ট্যাবে খুলবে)");
  await expect(scope.locator('a[data-platform="facebook"]')).toHaveCount(hasFacebook ? 1 : 0);
  await expect(scope.locator("a[data-platform]")).toHaveCount(hasFacebook ? 2 : 1);
  if (!isMobile(testInfo)) {
    // Keyboard: ↓ moves through the links, Escape returns to the button.
    const btn = socialButton;
    await btn.focus();
    await page.keyboard.press("Escape");
    await btn.press("ArrowDown");
    await expect(scope.locator("a[data-platform]").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(btn).toBeFocused();
  }
  await expect(page.getByTestId("footer-social").locator('a[data-platform="youtube"]')).toHaveAttribute("href", youtube);
  await expectNoCspViolations(page);

  // Remove it again through the form.
  await admin.reload();
  await admin.getByRole("button", { name: /সারি ১ মুছুন/ }).click();
  await admin.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  await expect(admin.getByText("পরিবর্তন সংরক্ষিত হয়েছে।")).toBeVisible();
  expect(await setting("social")).toEqual({ links: [] });

  await page.goto("/about");
  await expect(page.locator('a[data-platform="youtube"]')).toHaveCount(0);
  if (!hasFacebook) {
    await expect(page.getByRole("button", { name: "সামাজিক মাধ্যম" })).toHaveCount(0);
    await expect(page.getByTestId("footer-social")).toHaveCount(0);
  }
  await restore("social");
  await admin.context().close();
  await page.context().close();
});

/**
 * Quiz link assertions are scoped to the site chrome (header, mobile drawer,
 * footer): page content such as a published announcement “সীরাত কুইজ
 * প্রতিযোগিতার নিবন্ধন শুরু” may mention the quiz as well.
 * Accessible names include the screen-reader note “(opens in a new tab)”.
 */
const QUIZ_NAME = { bn: "সীরাত কুইজ (নতুন ট্যাবে খুলবে)", en: "Seerat Quiz (opens in a new tab)" } as const;

/** The quiz link of the menu that is in use: the desktop header or (phones) the open drawer. */
async function menuQuizLink(page: Page, testInfo: TestInfo, lang: "bn" | "en"): Promise<Locator> {
  await openDrawerIfMobile(page, testInfo);
  const menu = isMobile(testInfo) ? page.locator("dialog#mobile-menu nav") : page.getByTestId("desktop-nav");
  return menu.getByRole("link", { name: QUIZ_NAME[lang], exact: true });
}

/** No quiz link anywhere in the chrome: header markup, the drawer's menu (phones) and the footer quick links. */
async function expectNoQuizLink(page: Page, testInfo: TestInfo) {
  await expect(page.getByTestId("quiz-link")).toHaveCount(0);
  await expect(page.getByTestId("footer-quiz-link")).toHaveCount(0);
  if (isMobile(testInfo)) {
    await openDrawerIfMobile(page, testInfo);
    // The only external item the drawer menu can have is the quiz link (social links are outside its <nav>).
    await expect(page.locator("dialog#mobile-menu nav a[target=\"_blank\"]")).toHaveCount(0);
    await page.keyboard.press("Escape");
  }
}

test("quiz link appears only when configured (new tab, both languages)", async ({ browser }, testInfo) => {
  test.setTimeout(120_000);
  await db.from("site_settings").update({ value: { url: null, label_bn: "সীরাত কুইজ", label_en: "Seerat Quiz" } as never }).eq("key", "quiz");
  const page = await freshPage(browser, testInfo);
  await page.goto("/");
  await expectNoQuizLink(page, testInfo);

  const admin = await freshPage(browser, testInfo);
  await loginAs(admin, "editor");
  await admin.goto("/admin/content?section=quiz");
  await admin.fill("#quiz-url", "http://quiz.example.org/");
  await admin.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  await expect(admin.locator("#quiz-url-error")).toBeVisible();
  await admin.fill("#quiz-url", "https://quiz.example.org/seerat");
  await admin.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  await expect(admin.getByText("পরিবর্তন সংরক্ষিত হয়েছে।")).toBeVisible();

  await page.goto("/");
  const quiz = await menuQuizLink(page, testInfo, "bn");
  await expect(quiz).toBeVisible();
  await expect(quiz).toHaveAttribute("href", "https://quiz.example.org/seerat");
  await expect(quiz).toHaveAttribute("target", "_blank");
  await expect(quiz).toHaveAttribute("rel", "noopener noreferrer");
  const footerQuiz = page.getByTestId("footer-quiz-link");
  await expect(footerQuiz).toHaveAccessibleName(QUIZ_NAME.bn);
  await expect(footerQuiz).toHaveAttribute("href", "https://quiz.example.org/seerat");
  await page.goto("/en");
  await expect(await menuQuizLink(page, testInfo, "en")).toBeVisible();
  await expect(page.getByTestId("footer-quiz-link")).toHaveAccessibleName(QUIZ_NAME.en);
  await expectNoCspViolations(page);

  await admin.fill("#quiz-url", "");
  await admin.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  await expect(admin.getByText("পরিবর্তন সংরক্ষিত হয়েছে।")).toBeVisible();
  await page.goto("/");
  await expectNoQuizLink(page, testInfo);
  await page.goto("/en");
  await expectNoQuizLink(page, testInfo);
  await restore("quiz");
  await admin.context().close();
  await page.context().close();
});

test("mobile drawer: every item, language and social at the bottom, focus and scroll handling", async ({ browser }, testInfo) => {
  test.skip(!isMobile(testInfo), "phones only");
  const page = await freshPage(browser, testInfo);
  await page.goto("/en/about");
  const toggle = page.getByRole("button", { name: "Open menu" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  const drawer = page.locator("dialog#mobile-menu");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Close menu" })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");
  for (const name of ["Home", "About", "Areas of work", "Programs", "Gallery", "Announcements", "FAQ", "Contact", "Notice"]) {
    await expect(drawer.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await expect(drawer.getByRole("link", { name: /Notices|Press/ })).toHaveCount(0);
  await expect(drawer.getByRole("link", { name: "About", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(drawer.getByRole("group", { name: "Choose language" })).toBeVisible();
  // 44px targets.
  for (const box of await drawer.locator("a, button").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
    expect(box).toBeGreaterThanOrEqual(44);
  }
  expect(await axeViolations(page, ["dialog#mobile-menu"])).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(toggle).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");

  // A link inside navigates and closes the drawer.
  await toggle.click();
  await drawer.getByRole("link", { name: "Notice", exact: true }).click();
  await page.waitForURL(/\/en\/notice$/);
  await expect(drawer).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");

  // Close button.
  await toggle.click();
  await drawer.getByRole("button", { name: "Close menu" }).click();
  await expect(drawer).toBeHidden();
  await expectNoHorizontalOverflow(page);
  await expectNoCspViolations(page);
  await page.context().close();
});

test("desktop header fits on one line from 1024px in both languages (with every optional item)", async ({ browser }, testInfo) => {
  test.skip(isMobile(testInfo), "desktop widths");
  test.skip(process.env.E2E_SERVER === "production", "writes site_settings directly; a production server keeps serving its cached public pages");
  // Worst case: members directory + quiz link shown.
  await db.from("site_settings").update({ value: { url: "https://quiz.example.org/", label_bn: "সীরাত কুইজ", label_en: "Seerat Quiz" } as never }).eq("key", "quiz");
  try {
    for (const width of [1024, 1180, 1280, 1440]) {
      const page = await freshPage(browser, testInfo, { width, height: 800 });
      for (const url of ["/about", "/en/about"]) {
        await page.goto(url);
        await expect(page.getByTestId("desktop-nav").getByRole("link", { name: /Seerat Quiz|সীরাত কুইজ/ })).toBeVisible();
        const m = await page.evaluate(() => {
          const header = document.querySelector("header")!;
          const items = [...document.querySelectorAll('[data-testid="desktop-nav"] > ul > li')];
          const tops = new Set(items.map((li) => Math.round(li.getBoundingClientRect().top)));
          const inner = header.firstElementChild as HTMLElement;
          return { rows: tops.size, height: header.getBoundingClientRect().height, overflow: inner.scrollWidth - inner.clientWidth };
        });
        expect(m.rows, `${url} @${width}: nav items on one row`).toBe(1);
        expect(m.height, `${url} @${width}: header height`).toBeLessThan(72);
        expect(m.overflow, `${url} @${width}: no clipped header`).toBeLessThanOrEqual(0);
        // With the quiz link the name stays readable at every width (two-line compact form at 1024–1279px).
        await expect(page.getByTestId("header-home")).toHaveAccessibleName(url.startsWith("/en") ? "Inqilab Jubo Sangathan" : "ইনকিলাব যুব সংগঠন");
        expect(await nameState(page), `${url} @${width}: name`).toEqual({ visible: true, clipped: false });
        await expectNoHorizontalOverflow(page);
        await expect(page.getByRole("group", { name: /ভাষা নির্বাচন|Choose language/ })).toBeVisible();
      }
      await page.context().close();
    }
  } finally {
    await restore("quiz");
  }
});

test("organization name is fully readable next to the desktop menu at 1024–1440px (English two lines, Bengali one)", async ({ browser }, testInfo) => {
  test.skip(isMobile(testInfo), "desktop widths");
  await db.from("site_settings").update({ value: { url: null, label_bn: "সীরাত কুইজ", label_en: "Seerat Quiz" } as never }).eq("key", "quiz");
  try {
    for (const width of [1024, 1180, 1280, 1440]) {
      const page = await freshPage(browser, testInfo, { width, height: 800 });
      for (const [url, name, lines] of [["/about", "ইনকিলাব যুব সংগঠন", 1], ["/en/about", "Inqilab Jubo Sangathan", 2]] as const) {
        await page.goto(url);
        const el = page.getByTestId("header-name");
        await expect(el).toHaveText(name);
        expect(await nameState(page), `${url} @${width}`).toEqual({ visible: true, clipped: false });
        const box = await el.evaluate((e) => ({ h: e.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(e).lineHeight) }));
        expect(Math.round(box.h / box.lh), `${url} @${width}: lines`).toBe(lines);
        const rows = await page.evaluate(() => new Set([...document.querySelectorAll('[data-testid="desktop-nav"] > ul > li')].map((li) => Math.round(li.getBoundingClientRect().top))).size);
        expect(rows, `${url} @${width}: menu on one line`).toBe(1);
        await page.screenshot({ path: testInfo.outputPath(`header-${url === "/about" ? "bn" : "en"}-${width}.png`), clip: { x: 0, y: 0, width, height: 80 } });
      }
      await page.context().close();
    }
  } finally {
    await restore("quiz");
  }
});

test("header and footer pass axe and show no CSP violations on every public page (both languages)", async ({ browser }, testInfo) => {
  test.setTimeout(180_000);
  const page = await freshPage(browser, testInfo);
  const { data: cat } = await db.from("activity_categories").select("slug").eq("is_active", true).limit(1).maybeSingle();
  const paths = [
    "/",
    "/about",
    "/activities",
    ...(cat ? [`/activities/${cat.slug}`] : []),
    "/programs",
    "/gallery",
    "/notice",
    "/faq",
    "/members",
    "/announcements",
    "/contact",
    "/membership",
    "/membership/status",
    "/membership/terms",
    "/privacy",
  ];
  for (const p of [...paths, ...paths.map((x) => (x === "/" ? "/en" : `/en${x}`))]) {
    await page.goto(p);
    await expectNoHorizontalOverflow(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expectNoCspViolations(page);
  }
  for (const p of ["/", "/en/about"]) {
    await page.goto(p);
    expect(await axeViolations(page, ["header", "footer"]), p).toEqual([]);
  }
  // Footer: localized links.
  await page.goto("/en");
  const footer = page.locator("footer");
  await expect(footer.getByRole("link", { name: "Notice", exact: true })).toHaveAttribute("href", "/en/notice");
  await expect(footer.getByRole("link", { name: "FAQ", exact: true })).toHaveAttribute("href", "/en/faq");
  await expect(footer.getByRole("link", { name: "Announcements", exact: true })).toHaveAttribute("href", "/en/announcements");
  await expect(footer.getByRole("link", { name: "Programs", exact: true })).toHaveAttribute("href", "/en/programs");
  await expect(footer.getByRole("link", { name: "Privacy policy" })).toHaveAttribute("href", "/en/privacy");
  await expect(footer).toContainText("not affiliated with any political party");
  await page.context().close();
});
