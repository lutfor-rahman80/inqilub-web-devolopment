import { test, expect, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { storageStateFor } from "./helpers/login";

/**
 * Homepage (BN at /, EN at /en): section order, hero without logo, no
 * statistics card and no slogan band (removed 2026-10-28: the slogan is in the
 * hero and the objective in the পরিচিতি cards), the three program sections in
 * the organization's order (ongoing → completed → upcoming) and their
 * visibility, the program zig-zag (design option 2: title block and cards side
 * by side from 1024px with alternating sides, title block first in the DOM,
 * total count, a wide card for a single program, a scrolling row with
 * prev/next buttons that are disabled at the ends and hidden when nothing
 * scrolls, stacked on phones, no endless animation), English texts with marked
 * Bengali fallbacks, JSON-LD, overflow at 360–1440px, axe and CSP/console
 * checks.
 *
 * Hero (design C, 2026-10-28): the featured photos fill the whole hero from
 * 1024px with the text in the right half; on phones the photo is a band above
 * the caption, the controls and the text (DOM order = visual reading order:
 * text first from 1024px, slider first on phones). Per photo a caption from
 * real data (linked program's title or the category — at most two lines —
 * and the photo's or the program's date on a line of its own, "view this
 * activity" link) whose reserved height does not depend on the web fonts,
 * controls on one row (pause first, progress segments, previous/next, 44px;
 * previous/next wrap below on narrow phones), autoplay 6 s with a filling
 * progress segment, the current segment always marked (also while paused),
 * pause on hover/keyboard focus/hidden tab, ←/→ keys, swipe (photo band on
 * phones, anywhere on the hero but links/buttons from 1024px), a polite
 * announcement only for the visitor's own changes, reduced motion (pause
 * button hidden from the first paint), one, two and six photos, the admin's
 * "shown on the homepage" placement, and the empty state (no photos:
 * Facebook invitation).
 *
 * Seeds only uniquely named rows (programs, featured photos in one category
 * folder, one announcement) through the service client and removes them
 * afterwards. Data-dependent checks need a server that renders fresh data
 * (`next dev`); against a production server (E2E_SERVER=production) pages are
 * cached for up to 5 minutes, so those checks are skipped there.
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
/** Anonymous client: sees exactly what the public pages see (RLS). */
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PROD = process.env.E2E_SERVER === "production";
const RUN = `${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`;
const MARK = `ই২ই-হোম-${RUN}`;
const CAT = "other-activities";
const SLOGAN = "আনতে সুপ্রভাত, পথ দেখাবে ইনকিলাব";
const SECTION_ORDER = [
  "hero",
  "intro",
  "categories",
  "programs-ongoing",
  "programs-completed",
  "programs-upcoming",
  "photos",
  "announcements",
  "membership",
  "social",
];
const STATUSES = ["ongoing", "completed", "upcoming"] as const;
type HomeStatus = (typeof STATUSES)[number];
const STATUS_TITLE_BN: Record<HomeStatus, string> = {
  ongoing: "চলমান কার্যক্রম",
  completed: "সাম্প্রতিক সম্পন্ন কার্যক্রম",
  upcoming: "ভবিষ্যৎ কার্যক্রম",
};

/** YYYY-MM-DD in Asia/Dhaka, shifted by `days`. */
function dhakaDate(days = 0): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date(Date.now() + days * 86_400_000));
}

async function expectNoHorizontalOverflow(page: Page, label = page.url()) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw, `no horizontal scroll: ${label}`).toBeLessThanOrEqual(iw);
}

const axePath = path.join(process.cwd(), "node_modules/axe-core/axe.min.js");
/** axe-core WCAG 2 A/AA scan of <main>; violations as "rule: target" strings. */
async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ path: axePath });
  const result = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe;
    return axe.run({ include: [["main"]] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
  });
  return result.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(" ")}`));
}

async function sectionNames(page: Page): Promise<string[]> {
  return page.locator("[data-home-section]").evaluateAll((els) => els.map((e) => e.getAttribute("data-home-section") ?? ""));
}

/** Visible program sections, in page order ("ongoing", "completed", "upcoming"). */
async function programStatuses(page: Page): Promise<HomeStatus[]> {
  return (await sectionNames(page)).filter((n) => n.startsWith("programs-")).map((n) => n.slice("programs-".length) as HomeStatus);
}

/** From 1024px: 1st visible section title left / cards right, 2nd the other way round, and so on. */
async function expectSides(page: Page, visible: HomeStatus[]) {
  for (const [i, status] of visible.entries()) {
    const section = page.getByTestId(`home-programs-${status}`);
    const title = (await section.getByTestId("program-section-title").boundingBox())!;
    const cards = (await section.getByTestId("program-section-cards").boundingBox())!;
    if (i % 2 === 0) expect(title.x + title.width, `${status}: title block left of the cards`).toBeLessThanOrEqual(cards.x + 1);
    else expect(cards.x + cards.width, `${status}: cards left of the title block`).toBeLessThanOrEqual(title.x + 1);
    // Side by side (overlapping vertically), the cards taking about two thirds.
    expect(title.y, `${status}: side by side`).toBeLessThan(cards.y + cards.height);
    expect(cards.y, `${status}: side by side`).toBeLessThan(title.y + title.height);
    expect(cards.width / title.width).toBeGreaterThan(1.7);
  }
}

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
/** The title block's total: "মোট ৩টি কর্মসূচি" / "3 programs", "1 program". */
function countText(lang: "bn" | "en", n: number): string {
  if (lang === "bn") return `মোট ${String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)])}টি কর্মসূচি`;
  return n === 1 ? "1 program" : `${n} programs`;
}

/** Count of published programs per computed status, as the anonymous visitor sees them (mirrors the page query). */
async function publicProgramCount(status: HomeStatus): Promise<number> {
  const today = dhakaDate();
  let q = anon.from("programs").select("id", { count: "exact", head: true }).eq("is_published", true).is("status_override", null);
  if (status === "upcoming") q = q.gt("starts_on", today);
  else if (status === "ongoing") q = q.lte("starts_on", today).or(`ends_on.gte.${today},and(ends_on.is.null,starts_on.eq.${today})`);
  else q = q.or(`ends_on.lt.${today},and(ends_on.is.null,starts_on.lt.${today})`);
  const { count, error } = await q;
  expect(error).toBeNull();
  return count ?? 0;
}

async function freshContext(browser: Browser, opts: Parameters<Browser["newContext"]>[0] = {}): Promise<BrowserContext> {
  const ctx = await browser.newContext({ baseURL: env.BASE_URL ?? "http://localhost:3000", locale: "bn-BD", timezoneId: "Asia/Dhaka", ...opts });
  await ctx.addInitScript(() => {
    const w = window as unknown as { __csp: string[] };
    w.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => w.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  return ctx;
}

/** Moves the pointer off the slider and focus out of it (so autoplay may run). */
async function leaveSlider(page: Page) {
  await page.mouse.move(2, 2);
  await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    el?.blur();
  });
}

const slider = (page: Page) => page.getByTestId("hero-slider");
/** After hydration the slider knows the layout (from 1024px the text comes first in the DOM). */
const waitForLayout = (page: Page, width: number) =>
  expect(slider(page)).toHaveAttribute("data-layout", width >= 1024 ? "wide" : "narrow");
const selectedOf = async (s: Locator) => Number(await s.getAttribute("data-selected"));

const bnNum = (v: number | string) => String(v).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
const pad2 = (v: number) => String(v).padStart(2, "0");
const BN_MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "2026-03-14" → "১৪ মার্চ ২০২৬" / "14 March 2026" (as the site formats dates). */
function dateText(iso: string, lang: "bn" | "en"): string {
  const [y, m, d] = iso.split("-").map(Number);
  return lang === "bn" ? `${bnNum(d)} ${BN_MONTHS[m - 1]} ${bnNum(y)}` : `${d} ${EN_MONTHS[m - 1]} ${y}`;
}

type Stop = { x: number; y: number; w: number; h: number; inSlider: boolean; name: string };
/** Keyboard tab stops inside the hero, in focus order (page coordinates). */
async function heroTabStops(page: Page): Promise<Stop[]> {
  const stops: Stop[] = [];
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press("Tab");
    const d = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      if (!a || !a.closest('[data-home-section="hero"]')) return null;
      const r = a.getBoundingClientRect();
      return {
        x: r.x + scrollX,
        y: r.y + scrollY,
        w: r.width,
        h: r.height,
        inSlider: !!a.closest('[data-testid="hero-slider"]'),
        name: (a.getAttribute("aria-label") ?? a.textContent ?? "").trim().slice(0, 30),
      };
    });
    if (!d) {
      if (stops.length) break;
      continue;
    }
    stops.push(d);
  }
  return stops;
}
/** Each stop is to the right of the previous one on the same row, or on a lower row. */
function expectReadingOrder(stops: Stop[], label: string) {
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    const sameRow = Math.abs(b.y + b.h / 2 - (a.y + a.h / 2)) < 12;
    const ok = sameRow ? b.x >= a.x + a.w - 1 : b.y + b.h / 2 > a.y + a.h / 2;
    expect(ok, `${label}: "${b.name}" follows "${a.name}" visually`).toBe(true);
  }
}

/** Tabs from the top of the page until keyboard focus is inside `root`. */
async function tabInto(page: Page, root: Locator) {
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    if (await root.evaluate((el) => el.contains(document.activeElement))) return;
  }
  throw new Error("focus never reached the element");
}

/** The hero's control buttons grouped by row (accessible names, left to right). */
async function controlRows(page: Page): Promise<string[][]> {
  const boxes = await page
    .getByTestId("hero-controls")
    .getByRole("button")
    .evaluateAll((els) => els.map((e) => ({ name: e.getAttribute("aria-label") ?? "", y: e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2, x: e.getBoundingClientRect().left })));
  const rows: { y: number; items: { name: string; x: number }[] }[] = [];
  for (const b of boxes) {
    const row = rows.find((r) => Math.abs(r.y - b.y) < 6);
    if (row) row.items.push(b);
    else rows.push({ y: b.y, items: [b] });
  }
  return rows.sort((a, b) => a.y - b.y).map((r) => r.items.sort((a, b) => a.x - b.x).map((i) => i.name));
}

/**
 * The current photo's progress segment is marked while the slideshow waits: filled completely
 * (no timer running), while the photos after it show the empty track.
 */
async function expectMarkedSegment(s: Locator, index: number) {
  const fill = s.getByTestId("hero-progress-fill");
  await expect(fill).toHaveAttribute("data-timed", "false");
  await expect(fill).toHaveCSS("animation-name", "none");
  const segments = s.getByTestId("hero-progress").getByRole("button");
  await expect(segments.nth(index)).toHaveAttribute("aria-current", "true");
  const widths = await fill.evaluate((el) => [el.getBoundingClientRect().width, el.parentElement!.getBoundingClientRect().width]);
  expect(widths[0], "the current segment is filled").toBeGreaterThan(widths[1] - 1);
  const count = await segments.count();
  if (index + 1 < count) await expect(segments.nth(index + 1).locator("span span")).toHaveCount(0);
}

/** Dispatches a horizontal touch swipe (pointer events) across `el`. */
async function swipe(el: Locator, fromX: number, toX: number) {
  await el.evaluate(
    (node, [a, b]) => {
      const box = node.getBoundingClientRect();
      const at = (x: number) => ({ bubbles: true, pointerType: "touch", pointerId: 7, isPrimary: true, clientX: x, clientY: box.top + box.height / 2 });
      node.dispatchEvent(new PointerEvent("pointerdown", at(a)));
      node.dispatchEvent(new PointerEvent("pointerup", at(b)));
    },
    [fromX, toX],
  );
}

// ---------------------------------------------------------------- no seeds

test("hero without photos: deep green, text first, Facebook invitation; with photos: the slider", async ({ page }) => {
  const [{ count }, { data: contact }] = await Promise.all([
    anon.from("gallery_images").select("id", { count: "exact", head: true }).eq("is_published", true),
    db.from("site_settings").select("value").eq("key", "contact").single(),
  ]);
  const facebook = (contact!.value as { facebook_url: string | null }).facebook_url;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const hero = page.locator('[data-home-section="hero"]');
  if ((count ?? 0) > 0) {
    await expect(slider(page).locator("[data-slide]").first()).toBeVisible();
    await expect(hero).not.toHaveAttribute("data-hero-empty", "true");
    return;
  }
  // Empty state (what production shows until photos are published): no slider, the invitation.
  await expect(hero).toHaveAttribute("data-hero-empty", "true");
  await expect(slider(page)).toHaveCount(0);
  await expect(hero.locator("img")).toHaveCount(0);
  const invite = page.getByTestId("hero-empty");
  await expect(invite).toContainText("ছবি শীঘ্রই আসছে");
  await expect(invite).toContainText("কার্যক্রমের ছবি শীঘ্রই এখানে দেখা যাবে");
  if (facebook) {
    const fb = invite.getByRole("link", { name: /ফেসবুক পেজ অনুসরণ করুন/ });
    await expect(fb).toHaveAttribute("href", /facebook\.com/);
    await expect(fb).toHaveAttribute("target", "_blank");
    await expect(fb).toHaveAttribute("rel", /noopener/);
  } else {
    await expect(invite.getByRole("link", { name: "আমাদের কার্যক্রম" })).toHaveAttribute("href", "/activities");
  }
  // From 1024px: text in the right half, the invitation bottom-left; on phones the text comes first (DOM and screen).
  for (const [w, h] of [[1280, 800], [1024, 768], [390, 844]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/");
    const content = (await page.getByTestId("hero-content").boundingBox())!;
    const inv = (await page.getByTestId("hero-empty").locator("[data-hero-content]").boundingBox())!;
    if (w >= 1024) {
      expect(content.x, `${w}px: text in the right half`).toBeGreaterThanOrEqual(w / 2);
      expect(inv.x + inv.width, `${w}px: invitation left of the text`).toBeLessThanOrEqual(content.x);
    } else {
      expect(content.y + content.height, `${w}px: text above the invitation`).toBeLessThanOrEqual(inv.y + 1);
    }
    expectReadingOrder(await heroTabStops(page), `empty hero at ${w}px`);
    await expectNoHorizontalOverflow(page, `empty hero at ${w}px`);
  }
  await page.goto("/en");
  await expect(page.getByTestId("hero-empty")).toContainText("Photos of our activities will appear here soon");
  await expect(page.getByTestId("hero-empty")).toContainText("Photos coming soon");
});

// ------------------------------------------------------------- with seeds

test.describe("with seeded programs, photos and a notice", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(PROD, "seeded rows are not visible on a cached production page");

  const programs: Record<string, { id: string; slug: string; title_bn: string; title_en: string | null }> = {};
  const images: { id: string; storage_path: string; thumb_path: string; caption: string }[] = [];
  let announcementId = "";
  let categoryName = "";
  let categoryNameEn: string | null = null;
  let categoryId = "";

  /** One featured photo (a plain-colour WebP and its thumbnail) in the test category. */
  async function seedPhoto(key: string, fields: { caption: string; sort_order: number; program_id?: string; event_date?: string; color?: string }) {
    const file = `e2e-home-${RUN}-${key}`;
    const full = `activities/${CAT}/${file}.webp`;
    const thumb = `activities/${CAT}/thumbs/${file}.webp`;
    const buf = await sharp({ create: { width: 800, height: 450, channels: 3, background: fields.color ?? "#3e6b52" } }).webp().toBuffer();
    for (const p of [full, thumb]) {
      const { error } = await db.storage.from("gallery").upload(p, buf, { contentType: "image/webp" });
      expect(error).toBeNull();
    }
    const { data, error } = await db
      .from("gallery_images")
      .insert({
        category_id: categoryId,
        storage_path: full,
        thumb_path: thumb,
        width: 800,
        height: 450,
        caption: fields.caption,
        event_date: fields.event_date ?? null,
        program_id: fields.program_id ?? null,
        is_published: true,
        is_featured: true,
        sort_order: fields.sort_order,
        source: "upload",
      })
      .select("id, storage_path, thumb_path, caption")
      .single();
    expect(error).toBeNull();
    images.push(data as (typeof images)[number]);
    return data!;
  }

  test.beforeAll(async () => {
    const { data: cat, error: catError } = await db.from("activity_categories").select("id, name_bn, name_en").eq("slug", CAT).single();
    expect(catError).toBeNull();
    categoryName = cat!.name_bn;
    categoryNameEn = cat!.name_en?.trim() || null;
    categoryId = cat!.id;

    // A realistic mix, each sorted first in its section: 1 ongoing, 3 completed (one Bengali-only), 2 upcoming.
    const rows = [
      { key: "ongoing", starts_on: dhakaDate(0), ends_on: dhakaDate(3), title_en: `E2E ongoing ${RUN}`, sort_order: -100_000 },
      { key: "completed", starts_on: dhakaDate(-1), ends_on: null, title_en: `E2E completed ${RUN}`, sort_order: -100_000 },
      { key: "completed2", starts_on: dhakaDate(-2), ends_on: dhakaDate(-1), title_en: `E2E completed two ${RUN}`, sort_order: -100_000 },
      { key: "bnOnly", starts_on: dhakaDate(-3), ends_on: null, title_en: null, sort_order: -100_000 },
      { key: "upcoming", starts_on: dhakaDate(1), ends_on: null, title_en: `E2E upcoming ${RUN}`, sort_order: -100_000 },
      { key: "upcoming2", starts_on: dhakaDate(2), ends_on: dhakaDate(4), title_en: `E2E upcoming two ${RUN}`, sort_order: -100_000 },
    ];
    for (const r of rows) {
      const slug = `e2e-home-${RUN}-${r.key.toLowerCase()}`;
      const title_bn = `${MARK}-${r.key}`;
      const { data, error } = await db
        .from("programs")
        .insert({
          slug,
          category_id: cat!.id,
          title_bn,
          title_en: r.title_en,
          summary_bn: "ই২ই পরীক্ষার কর্মসূচি।",
          starts_on: r.starts_on,
          ends_on: r.ends_on,
          is_published: true,
          sort_order: r.sort_order,
        })
        .select("id, slug, title_bn, title_en")
        .single();
      expect(error).toBeNull();
      programs[r.key] = data!;
    }

    // Four featured ("হিরো স্লাইডার") photos, first in display order, covering every caption source:
    // 1 linked to the ongoing program (its title and dates), 2 with its own date (category name),
    // 3 without a caption, linked to the Bengali-only program (alt = its title), 4 with neither.
    await seedPhoto("0", { caption: `${MARK}-ছবি-1`, sort_order: -100_000, program_id: programs.ongoing.id, color: "#3e6b52" });
    await seedPhoto("1", { caption: `${MARK}-ছবি-2`, sort_order: -99_999, event_date: "2026-03-14", color: "#8a6c22" });
    await seedPhoto("2", { caption: "", sort_order: -99_998, program_id: programs.bnOnly.id, color: "#24473a" });
    await seedPhoto("3", { caption: `${MARK}-ছবি-4`, sort_order: -99_997, color: "#7d9a74" });

    // A pinned notice without an English title (English page shows it marked lang="bn").
    const { data: ann, error: annError } = await db
      .from("announcements")
      .insert({ title: `${MARK}-ঘোষণা`, body: "ই২ই পরীক্ষার ঘোষণা।", is_published: true, is_pinned: true, published_at: new Date().toISOString() })
      .select("id")
      .single();
    expect(annError).toBeNull();
    announcementId = ann!.id;
  });

  test.afterAll(async () => {
    await db.from("programs").delete().like("slug", `e2e-home-${RUN}-%`);
    if (images.length) {
      await db.from("gallery_images").delete().in("id", images.map((i) => i.id));
      await db.storage.from("gallery").remove(images.flatMap((i) => [i.storage_path, i.thumb_path]));
    }
    if (announcementId) await db.from("announcements").delete().eq("id", announcementId);
  });

  test("Bengali: sections in order, no hero logo, exact slogan once, no slogan band and no statistics", async ({ page }) => {
    const [{ data: settings }, { data: about }, { data: contact }, { data: membership }, { data: categories }] = await Promise.all([
      db.from("site_settings").select("value").eq("key", "organization").single(),
      db.from("site_settings").select("value").eq("key", "about").single(),
      db.from("site_settings").select("value").eq("key", "contact").single(),
      db.from("site_settings").select("value").eq("key", "membership").single(),
      db.from("activity_categories").select("slug, name_bn").eq("is_active", true).order("sort_order"),
    ]);
    const org = settings!.value as { name_bn: string; tagline: string; slogan: string; location: string };
    const aboutValue = about!.value as { objective: string };
    const facebook = (contact!.value as { facebook_url: string | null }).facebook_url;
    const membershipOpen = (membership!.value as { is_open?: boolean }).is_open !== false;

    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
    expect(await sectionNames(page)).toEqual(SECTION_ORDER.filter((s) => s !== "social" || facebook));

    // Hero: name, tagline, exact slogan, location, buttons — and no logo.
    const hero = page.locator('[data-home-section="hero"]');
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(org.name_bn);
    await expect(hero).toContainText(org.tagline);
    expect(org.slogan).toBe(SLOGAN);
    expect(await page.getByTestId("hero-slogan").textContent()).toBe(SLOGAN);
    // The slogan band was removed (decision 2026-10-28): the slogan appears once on the page body.
    await expect(page.locator("main").getByText(SLOGAN, { exact: true })).toHaveCount(1);
    await expect(hero).toContainText("নারায়ণগঞ্জ");
    await expect(hero.locator('img[src*="/brand/"]')).toHaveCount(0);
    await expect(hero.getByRole("img", { name: /লোগো|logo/i })).toHaveCount(0);
    await expect(hero.getByRole("link", { name: "আমাদের কার্যক্রম" })).toHaveAttribute("href", "/activities");
    await expect(hero.getByRole("link", { name: "সদস্য হোন" })).toHaveCount(membershipOpen ? 1 : 0);
    await expect(hero.getByRole("link", { name: "কর্মসূচি দেখুন" })).toHaveAttribute("href", "/programs");

    // No slogan band; the objective is shown once, in the পরিচিতি cards. The statistics card is gone (no number-only values anywhere).
    await expect(page.locator('[data-home-section="band"]')).toHaveCount(0);
    await expect(page.getByTestId("band-slogan")).toHaveCount(0);
    await expect(page.locator('[data-home-section="intro"]')).toContainText(aboutValue.objective);
    await expect(page.locator("main").getByText(aboutValue.objective, { exact: true })).toHaveCount(1);
    await expect(page.locator('main dl[aria-label="এক নজরে"]')).toHaveCount(0);
    await expect(page.getByText("প্রকাশিত ছবি", { exact: true })).toHaveCount(0);
    await expect(page.getByText("সক্রিয় সদস্য", { exact: true })).toHaveCount(0);
    const numberOnly = await page
      .locator("main dd, main dt, main strong, main p")
      .evaluateAll((els) => els.map((e) => (e.textContent ?? "").trim()).filter((t) => /^[\d০-৯]+$/.test(t)));
    expect(numberOnly, "no statistics numbers on the homepage").toEqual([]);

    // Every active category (the organization's 13) links to its page.
    const list = page.getByTestId("home-categories");
    expect(categories!.length).toBeGreaterThanOrEqual(13);
    await expect(list.getByRole("listitem")).toHaveCount(categories!.length);
    for (const c of categories!) await expect(list.locator(`a[href="/activities/${c.slug}"]`)).toContainText(c.name_bn);

    // Intro → /about#why, photos → /gallery, membership steps and tracking number.
    await expect(page.locator('[data-home-section="intro"] a[href="/about#why"]')).toBeVisible();
    await expect(page.getByRole("link", { name: /সব ছবি দেখুন/ })).toHaveAttribute("href", "/gallery");
    await expect(page.getByTestId("membership-tracking")).toContainText("ট্র্যাকিং নম্বর");
    await expect(page.getByRole("link", { name: "আবেদনের অবস্থা যাচাই" })).toHaveAttribute("href", "/membership/status");

    // Metadata and Organization JSON-LD.
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https?:\/\/[^/]+\/?$/);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", /\/en$/);
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? "{}");
    expect(ld["@type"]).toBe("Organization");
    expect(ld.name).toBe(org.name_bn);
    expect(ld.logo).toMatch(/\/brand\/logo\.png$/);
    expect(ld.address).toMatchObject({ "@type": "PostalAddress", addressLocality: "নারায়ণগঞ্জ", addressCountry: "BD" });
    if (facebook) expect(ld.sameAs).toContain(facebook);
  });

  test("program sections: ongoing → completed → upcoming, total count, see-all links, hidden when empty", async ({ page }) => {
    await page.goto("/");
    expect(await programStatuses(page)).toEqual(["ongoing", "completed", "upcoming"]);
    for (const status of STATUSES) {
      const section = page.getByTestId(`home-programs-${status}`);
      const total = await publicProgramCount(status);
      await expect(section.getByRole("heading", { level: 2 })).toHaveText(STATUS_TITLE_BN[status]);
      await expect(section.getByRole("link", { name: programs[status].title_bn, exact: true })).toHaveAttribute("href", `/programs/${programs[status].slug}`);
      await expect(section.getByRole("link", { name: /সব দেখুন/ })).toHaveAttribute("href", `/programs?status=${status}`);
      await expect(section.getByRole("link", { name: /সব দেখুন/ })).toHaveAccessibleName(new RegExp(`^সব দেখুন\\s*: ${STATUS_TITLE_BN[status]}$`));
      // The real total of published programs with this status (Bengali digits), not just the cards shown (at most 3).
      await expect(section.getByTestId("program-count")).toHaveText(countText("bn", total));
      await expect(section.getByRole("article")).toHaveCount(Math.min(total, 3));
    }
    await expect(page.getByTestId("home-programs-completed").getByRole("link", { name: programs.bnOnly.title_bn })).toHaveAttribute("href", `/programs/${programs.bnOnly.slug}`);

    // A fourth completed program: still three cards, but the total says four (or more).
    const { data: extra, error: extraError } = await db
      .from("programs")
      .insert({
        slug: `e2e-home-${RUN}-completed4`,
        category_id: (await db.from("activity_categories").select("id").eq("slug", CAT).single()).data!.id,
        title_bn: `${MARK}-completed4`,
        summary_bn: "ই২ই পরীক্ষার কর্মসূচি।",
        starts_on: dhakaDate(-4),
        is_published: true,
        sort_order: -100_000,
      })
      .select("id")
      .single();
    expect(extraError).toBeNull();
    try {
      await page.goto("/");
      const completed = page.getByTestId("home-programs-completed");
      const total = await publicProgramCount("completed");
      expect(total).toBeGreaterThanOrEqual(4);
      await expect(completed.getByRole("article")).toHaveCount(3);
      await expect(completed.getByTestId("program-count")).toHaveText(countText("bn", total));
    } finally {
      await db.from("programs").delete().eq("id", extra!.id);
    }

    // Unpublish the completed ones → that section is hidden (when nothing else is public) and the rest re-alternate.
    const completedIds = [programs.completed.id, programs.completed2.id, programs.bnOnly.id];
    const { error } = await db.from("programs").update({ is_published: false }).in("id", completedIds);
    expect(error).toBeNull();
    try {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/");
      await expect(page.getByRole("link", { name: programs.completed.title_bn, exact: true })).toHaveCount(0);
      for (const status of STATUSES) {
        const expected = (await publicProgramCount(status)) > 0 ? 1 : 0;
        await expect(page.getByTestId(`home-programs-${status}`), `${status} section visibility`).toHaveCount(expected);
      }
      const visible = await programStatuses(page);
      for (const [i, status] of visible.entries()) {
        await expect(page.getByTestId(`home-programs-${status}`)).toHaveAttribute("data-side", i % 2 === 0 ? "start" : "end");
      }
      if ((await publicProgramCount("completed")) === 0) {
        expect(visible).toEqual(["ongoing", "upcoming"]);
        await expectSides(page, visible);
      }
    } finally {
      await db.from("programs").update({ is_published: true }).in("id", completedIds);
    }
  });

  test("zig-zag from 1024px: sides alternate, title block first in the DOM, wide card for a single program", async ({ page }) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [1280, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const p of ["/", "/en"]) {
        await page.goto(p);
        const visible = await programStatuses(page);
        expect(visible, `${p} at ${width}px`).toEqual(["ongoing", "completed", "upcoming"]);
        await expectSides(page, visible);
        const tones: string[] = [];
        for (const status of visible) {
          const section = page.getByTestId(`home-programs-${status}`);
          tones.push((await section.getAttribute("data-tone")) ?? "");
          // Title block first in the grid and the heading before the first card (screen readers hear the heading first).
          const order = await section.evaluate((s) => {
            const title = s.querySelector('[data-testid="program-section-title"]')!;
            const h2 = s.querySelector("h2")!;
            const card = s.querySelector("article")!;
            return {
              firstChild: title.parentElement!.firstElementChild?.getAttribute("data-testid"),
              headingFirst: !!(h2.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING),
            };
          });
          expect(order).toEqual({ firstChild: "program-section-title", headingFirst: true });
          // Headings stay at most ~36px and wrap to at most two lines (English titles are longer).
          const h2 = await section.getByRole("heading", { level: 2 }).evaluate((e) => ({
            size: parseFloat(getComputedStyle(e).fontSize),
            lines: Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight)),
          }));
          expect(h2.size, `${status} h2 size on ${p} at ${width}px`).toBeLessThanOrEqual(36.5);
          expect(h2.lines, `${status} h2 lines on ${p} at ${width}px`).toBeLessThanOrEqual(2);
        }
        // Alternating backgrounds; the last section is the plain one.
        for (let i = 1; i < tones.length; i++) expect(tones[i]).not.toBe(tones[i - 1]);
        expect(tones.at(-1)).toBe("plain");
        await expectNoHorizontalOverflow(page, `${p} at ${width}px`);
      }
    }

    // Exactly one ongoing program (the seeded one, when nothing else is public) → the wide horizontal card, no row.
    if ((await publicProgramCount("ongoing")) === 1) {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/");
      const section = page.getByTestId("home-programs-ongoing");
      await expect(section).toHaveAttribute("data-layout", "single");
      await expect(section.getByTestId("program-rail")).toHaveCount(0);
      const card = section.getByRole("article");
      await expect(card).toHaveAttribute("data-layout", "horizontal");
      const media = (await card.locator("[data-card-media]").boundingBox())!;
      const body = (await card.locator("[data-card-body]").boundingBox())!;
      expect(media.x + media.width, "image beside the text").toBeLessThanOrEqual(body.x + 1);
      expect(Math.abs(media.height - body.height), "image as tall as the text").toBeLessThan(2);
      // The /programs list keeps the vertical card.
      await page.goto("/programs");
      await expect(page.locator('main article[data-layout="horizontal"]')).toHaveCount(0);
    }
  });

  test("scrolling row: arrows move it, are disabled at the ends, keyboard works, hidden when nothing scrolls", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    const section = page.getByTestId("home-programs-completed");
    const list = section.getByRole("list", { name: `${STATUS_TITLE_BN.completed}: কর্মসূচির তালিকা` });
    await expect(list.getByRole("listitem")).toHaveCount(3);
    await expect(list).toHaveCSS("scroll-snap-type", "x mandatory");
    const prev = section.getByRole("button", { name: "আগের কর্মসূচি" });
    const next = section.getByRole("button", { name: "পরের কর্মসূচি" });
    await expect(next).toBeVisible();
    await expect(next).toHaveAttribute("aria-controls", (await list.getAttribute("id"))!);
    for (const b of [prev, next]) {
      const box = (await b.boundingBox())!;
      expect(Math.min(box.width, box.height), "44px touch target").toBeGreaterThanOrEqual(44);
    }
    const scrollLeft = () => list.evaluate((el) => el.scrollLeft);
    const left = (await list.boundingBox())!;

    // Start: previous disabled; the third card peeks in at the edge.
    await expect(prev).toHaveAttribute("aria-disabled", "true");
    await expect(next).toHaveAttribute("aria-disabled", "false");
    const third = list.getByRole("listitem").nth(2);
    const peek = (await third.boundingBox())!;
    expect(peek.x, "third card starts inside the row").toBeLessThan(left.x + left.width);
    expect(peek.x + peek.width, "…and is cut off (peek)").toBeGreaterThan(left.x + left.width);

    // A disabled button (aria-disabled, so it keeps focus) does nothing.
    await prev.click({ force: true });
    await page.waitForTimeout(200);
    expect(await scrollLeft()).toBe(0);
    await next.click();
    await expect.poll(scrollLeft).toBeGreaterThan(100);
    await expect(prev).toHaveAttribute("aria-disabled", "false");
    for (let i = 0; i < 4 && (await next.getAttribute("aria-disabled")) !== "true"; i++) {
      await next.click();
      await page.waitForTimeout(150);
    }
    await expect(next).toHaveAttribute("aria-disabled", "true");
    expect(await list.evaluate((el) => el.scrollWidth - el.clientWidth - el.scrollLeft), "scrolled to the end").toBeLessThanOrEqual(3);
    const end = await scrollLeft();
    await next.click({ force: true });
    await page.waitForTimeout(200);
    expect(await scrollLeft(), "disabled at the end").toBe(end);

    // Keyboard: Enter on the focused previous button scrolls back; focus stays on it when it becomes disabled.
    await prev.focus();
    for (let i = 0; i < 5 && (await prev.getAttribute("aria-disabled")) !== "true"; i++) {
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
    }
    await expect(prev).toHaveAttribute("aria-disabled", "true");
    expect(await scrollLeft()).toBe(0);
    await expect(prev).toBeFocused();

    // Tab from the second card's link to the third: the third card scrolls fully into view.
    await list.getByRole("listitem").nth(1).getByRole("link").focus();
    await page.keyboard.press("Tab");
    await expect(third.getByRole("link")).toBeFocused();
    await expect
      .poll(async () => {
        const b = (await third.boundingBox())!;
        return b.x + b.width <= left.x + left.width + 1;
      })
      .toBe(true);

    // Two programs fit side by side from 640px: nothing scrolls, no controls.
    const upcoming = page.getByTestId("home-programs-upcoming");
    if ((await upcoming.getByRole("article").count()) === 2) {
      await expect(upcoming.getByTestId("program-rail-controls")).toBeHidden();
      await expect(upcoming.getByRole("button", { name: "পরের কর্মসূচি" })).toBeHidden();
      expect(await upcoming.getByRole("list").evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(2);
    }
  });

  test("phones: title block above the cards, swipeable row with controls", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    for (const p of ["/", "/en"]) {
      await page.goto(p);
      const en = p === "/en";
      for (const status of await programStatuses(page)) {
        const section = page.getByTestId(`home-programs-${status}`);
        const title = (await section.getByTestId("program-section-title").boundingBox())!;
        const cards = (await section.getByTestId("program-section-cards").boundingBox())!;
        expect(title.y + title.height, `${p} ${status}: title block above the cards`).toBeLessThanOrEqual(cards.y + 1);
        expect(Math.abs(title.x - cards.x), `${p} ${status}: same column`).toBeLessThan(2);
        const n = await section.getByRole("article").count();
        if (n === 1) {
          // The single (wide) card stacks like a normal card on phones.
          const card = section.getByRole("article");
          const media = (await card.locator("[data-card-media]").boundingBox())!;
          const body = (await card.locator("[data-card-body]").boundingBox())!;
          expect(media.y + media.height).toBeLessThanOrEqual(body.y + 1);
          continue;
        }
        // Two or more: a row to swipe (scroll-snap), with prev/next and the progress bar.
        const list = section.getByRole("list");
        await expect(list).toHaveCSS("overflow-x", "auto");
        await expect(list).toHaveCSS("scroll-snap-type", "x mandatory");
        expect(await list.evaluate((el) => el.scrollWidth - el.clientWidth), `${p} ${status}: row scrolls`).toBeGreaterThan(50);
        const next = section.getByRole("button", { name: en ? "Next program" : "পরের কর্মসূচি" });
        await expect(next).toBeVisible();
        await expect(next).toHaveAttribute("aria-disabled", "false");
        // A swipe to the end (scrolling the row) updates the buttons.
        await list.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
        await expect(next).toHaveAttribute("aria-disabled", "true");
        await expect(section.getByRole("button", { name: en ? "Previous program" : "আগের কর্মসূচি" })).toHaveAttribute("aria-disabled", "false");
      }
      await expectNoHorizontalOverflow(page, `${p} at 390px`);
    }
  });

  test("motion: no endless animation; nothing moves under prefers-reduced-motion", async ({ page }) => {
    const animations = (root: Locator) =>
      root.evaluate((el) =>
        [el, ...el.querySelectorAll("*")].flatMap((n) =>
          [null, "::before", "::after"].map((pseudo) => {
            const cs = getComputedStyle(n, pseudo);
            return { name: cs.animationName, count: cs.animationIterationCount };
          }),
        ),
      );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    const area = page.getByTestId("home-programs");
    const moving = (await animations(area)).filter((a) => a.name !== "none");
    expect(moving.length, "entrance/marker animations exist").toBeGreaterThan(0);
    expect(moving.filter((a) => a.count === "infinite"), "no infinite animation (WCAG 2.2.2)").toEqual([]);
    // The "live" marker of the ongoing section pulses twice (4.8 s) and stops.
    const live = await page
      .getByTestId("home-programs-ongoing")
      .locator(".hp-live")
      .evaluate((el) => ({ name: getComputedStyle(el, "::after").animationName, count: getComputedStyle(el, "::after").animationIterationCount }));
    expect(live).toEqual({ name: "hp-pulse", count: "2" });

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    expect((await animations(page.getByTestId("home-programs"))).filter((a) => a.name !== "none"), "static under reduced motion").toEqual([]);
  });

  test("English: English texts and links, Bengali fallbacks marked lang=bn", async ({ page }) => {
    const [{ data: settings }, { data: about }, { data: categories }] = await Promise.all([
      db.from("site_settings").select("value").eq("key", "organization").single(),
      db.from("site_settings").select("value").eq("key", "about").single(),
      db.from("activity_categories").select("slug, name_bn, name_en").eq("is_active", true).order("sort_order"),
    ]);
    const org = settings!.value as { en: { name: string; tagline: string; slogan: string; location: string } };
    const aboutEn = (about!.value as { en: { objective: string; goal: string } }).en;

    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    expect((await sectionNames(page)).slice(0, 3)).toEqual(["hero", "intro", "categories"]);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(org.en.name);
    const hero = page.locator('[data-home-section="hero"]');
    await expect(hero).toContainText(org.en.tagline);
    await expect(hero).toContainText("Narayanganj");
    // The slogan stays Bengali (marked), with the English rendering beneath it.
    const slogan = page.getByTestId("hero-slogan");
    expect(await slogan.textContent()).toBe(SLOGAN);
    await expect(slogan.locator("xpath=..")).toHaveAttribute("lang", "bn");
    if (org.en.slogan) await expect(page.getByTestId("hero-slogan-translation")).toHaveText(org.en.slogan);
    await expect(hero.getByRole("link", { name: "Our activities" })).toHaveAttribute("href", "/en/activities");
    await expect(page.locator('[data-home-section="band"]')).toHaveCount(0);
    await expect(page.locator('[data-home-section="intro"]')).toContainText(aboutEn.objective);
    await expect(page.getByRole("heading", { name: "Who we are" })).toBeVisible();

    const list = page.getByTestId("home-categories");
    for (const c of categories!) {
      const link = list.locator(`a[href="/en/activities/${c.slug}"]`);
      if (c.name_en) await expect(link).toContainText(c.name_en);
      else await expect(link.locator('[lang="bn"]').first()).toContainText(c.name_bn);
    }

    // Programs: English title when given; a Bengali-only title is marked lang="bn"; see-all keeps /en; English count.
    const ongoing = page.getByTestId("home-programs-ongoing");
    await expect(ongoing.getByRole("heading", { level: 2 })).toHaveText("Ongoing activities");
    await expect(ongoing.getByRole("link", { name: programs.ongoing.title_en! })).toHaveAttribute("href", `/en/programs/${programs.ongoing.slug}`);
    await expect(ongoing.getByRole("link", { name: /See all/ })).toHaveAttribute("href", "/en/programs?status=ongoing");
    const titlesEn = { ongoing: "Ongoing activities", completed: "Recently completed activities", upcoming: "Upcoming activities" };
    for (const status of STATUSES) {
      const section = page.getByTestId(`home-programs-${status}`);
      await expect(section.getByRole("heading", { level: 2 })).toHaveText(titlesEn[status]);
      await expect(section.getByTestId("program-count")).toHaveText(countText("en", await publicProgramCount(status)));
      await expect(section.getByRole("link", { name: /See all/ })).toHaveAttribute("href", `/en/programs?status=${status}`);
    }
    const completed = page.getByTestId("home-programs-completed");
    await expect(completed.locator(`[lang="bn"]`, { hasText: programs.bnOnly.title_bn })).toBeAttached();
    await expect(completed.getByRole("list", { name: "Recently completed activities: list of programs" })).toBeVisible();
    await expect(completed.getByRole("button", { name: "Next program" })).toBeVisible();
    await expect(completed.getByRole("button", { name: "Previous program" })).toHaveAttribute("aria-disabled", "true");

    // Notice without an English title: Bengali text marked lang="bn", link stays in English.
    const notices = page.getByTestId("home-announcements");
    const notice = notices.locator(`a[href="/en/announcements/${announcementId}"]`);
    await expect(notice.locator('[lang="bn"]')).toHaveText(`${MARK}-ঘোষণা`);
    // Its Bengali excerpt is marked as well (the card follows the title's language).
    await expect(notices.locator("article", { has: page.locator(`a[href="/en/announcements/${announcementId}"]`) }).locator('p[lang="bn"]')).toHaveText("ই২ই পরীক্ষার ঘোষণা।");
    await expect(page.getByRole("heading", { name: "Would you like to become a member?" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Check application status" })).toHaveAttribute("href", "/en/membership/status");

    // Slider labels and numbers in English.
    await expect(page.getByRole("button", { name: "Next photo" })).toBeVisible();
    await expect(page.locator('[data-slide="0"]')).toHaveAttribute("aria-label", /^1 of \d+$/);
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? "{}");
    expect(ld.name).toBe(org.en.name);
    expect(ld.url).toMatch(/\/en$/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en$/);
  });

  // ------------------------------------------------------------------ hero (design C)

  /** DOM order of the hero's slider and text, the first heading in <main>, headings inside the slider. */
  const heroOrder = (page: Page) =>
    page.evaluate(() => {
      const s = document.querySelector('[data-testid="hero-slider"]')!;
      const c = document.querySelector('[data-testid="hero-content"]')!;
      return {
        sliderFirst: !!(s.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING),
        firstHeading: document.querySelector("main :is(h1, h2, h3)")?.tagName,
        sliderHeadings: s.querySelectorAll("h1, h2, h3, h4").length,
      };
    });

  test("hero layout: photos full-bleed with the text in the right half from 1024px; band, caption and controls above the text on phones", async ({ page }) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const p of ["/", "/en"]) {
      for (const [w, h] of [[1440, 900], [1280, 800], [1024, 768]] as const) {
        await page.setViewportSize({ width: w, height: h });
        await page.goto(p);
        await waitForLayout(page, w);
        const label = `${p} at ${w}px`;
        const hero = (await page.locator('[data-home-section="hero"]').boundingBox())!;
        const media = (await page.getByTestId("hero-media").boundingBox())!;
        const content = (await page.getByTestId("hero-content").boundingBox())!;
        const caption = (await page.getByTestId("hero-caption").boundingBox())!;
        expect(media.x, `${label}: photos start at the left edge`).toBeLessThanOrEqual(0.5);
        expect(media.width, `${label}: photos span the viewport`).toBeGreaterThanOrEqual(w - 1);
        expect(Math.abs(media.y - hero.y) + Math.abs(media.height - hero.height), `${label}: photos fill the hero`).toBeLessThan(2);
        expect(content.x, `${label}: text in the right half`).toBeGreaterThanOrEqual(w / 2);
        expect(caption.x + caption.width, `${label}: caption left of the text`).toBeLessThanOrEqual(content.x);
        expect(caption.y + caption.height, `${label}: caption at the bottom`).toBeGreaterThan(hero.y + hero.height * 0.6);
        if (w === 1280) expect(hero.y + hero.height, `${label}: the next section peeks in`).toBeLessThan(h - 40);
        // The current photo is visible (no logo anywhere in the hero).
        await expect(slider(page).locator('[data-slide="0"] img')).toBeVisible();
        await expect(page.locator('[data-home-section="hero"] img[src*="/brand/"]')).toHaveCount(0);
        // Reading order = what is higher up: the text (h1, buttons) first, then the caption and controls bottom-left.
        expect(await heroOrder(page), label).toEqual({ sliderFirst: false, firstHeading: "H1", sliderHeadings: 0 });
        await expectNoHorizontalOverflow(page, label);
      }
      for (const [w, h] of [[390, 844], [360, 740]] as const) {
        await page.setViewportSize({ width: w, height: h });
        await page.goto(p);
        await waitForLayout(page, w);
        const label = `${p} at ${w}px`;
        const media = (await page.getByTestId("hero-media").boundingBox())!;
        const caption = (await page.getByTestId("hero-caption").boundingBox())!;
        const content = (await page.getByTestId("hero-content").boundingBox())!;
        expect(media.width, `${label}: full-width photo band`).toBeGreaterThanOrEqual(w - 1);
        expect(media.y + media.height, `${label}: photo above the caption`).toBeLessThanOrEqual(caption.y + 1);
        expect(caption.y + caption.height, `${label}: caption and controls above the text`).toBeLessThanOrEqual(content.y + 1);
        // DOM order = visual order: the slider comes before the text, and the h1 is still the first heading.
        expect(await heroOrder(page), label).toEqual({ sliderFirst: true, firstHeading: "H1", sliderHeadings: 0 });
        await expectNoHorizontalOverflow(page, label);
      }
    }
  });

  test("focus order follows the visual order at every width", async ({ page }) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    for (const [w, h] of [[1440, 900], [1280, 800], [1024, 768], [768, 1024], [390, 844], [360, 740]] as const) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/");
      await waitForLayout(page, w);
      const stops = await heroTabStops(page);
      const label = `${w}px`;
      expect(stops.length, label).toBeGreaterThanOrEqual(8);
      // In the slider: the caption link, then pause/play (the first control), the segments and previous/next.
      const sliderStops = stops.filter((s) => s.inSlider);
      expect(sliderStops[0].name, label).toMatch(/^এই কার্যক্রম দেখুন/);
      expect(sliderStops[1].name, label).toBe("স্বয়ংক্রিয় স্লাইড থামান");
      expect(sliderStops.at(-1)!.name, label).toBe("পরের ছবি");
      if (w >= 1024) {
        // Two columns: the text (right half, higher up: h1 and the main buttons) before the caption and
        // controls (bottom-left); nothing of the text after the slider.
        const firstSlider = stops.findIndex((s) => s.inSlider);
        expect(firstSlider, label).toBeGreaterThan(1);
        expect(stops.slice(firstSlider).every((s) => s.inSlider), `${label}: nothing of the text after the slider`).toBe(true);
        const content = (await page.getByTestId("hero-content").boundingBox())!;
        expect(stops.slice(0, firstSlider).every((s) => s.x >= content.x - 1), `${label}: text stops in the right column`).toBe(true);
        expect(stops.slice(firstSlider).every((s) => s.x + s.w <= content.x), `${label}: slider stops in the left column`).toBe(true);
        expect(stops[0].y, `${label}: the text starts higher up than the caption`).toBeLessThan(stops[firstSlider].y);
        expectReadingOrder(stops.slice(0, firstSlider), `${label} (right column)`);
        expectReadingOrder(stops.slice(firstSlider), `${label} (left column)`);
      } else {
        // One column: the photo band's caption and controls first, then the text.
        const firstText = stops.findIndex((s) => !s.inSlider);
        expect(firstText, label).toBeGreaterThan(2);
        expect(stops.slice(firstText).every((s) => !s.inSlider), `${label}: nothing of the slider after the text`).toBe(true);
        expectReadingOrder(stops, label);
      }
    }
  });

  test("slides: caption, date and link from the photo's program or activity; alt text; image loading", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const s = slider(page);
    await expect(s).toHaveAttribute("role", "region");
    await expect(s).toHaveAttribute("aria-roledescription", "ছবির স্লাইডশো");
    // Its own name — the photo section further down is "কার্যক্রমের ছবি" (landmark names must be unique).
    await expect(s).toHaveAttribute("aria-label", "নির্বাচিত ছবি");
    const slides = s.locator("[data-slide]");
    const total = await slides.count();
    expect(total).toBeGreaterThanOrEqual(4);
    expect(total, "at most 6 photos").toBeLessThanOrEqual(6);
    // The first photo is the page's main image; the next one may load lazily; the rest are not requested yet.
    const first = slides.nth(0).locator("img");
    await expect(first).toHaveAttribute("loading", "eager");
    await expect(first).toHaveAttribute("fetchpriority", "high");
    await expect(first).toHaveAttribute("sizes", "100vw");
    await expect(first).toHaveAttribute("srcset", /480w, .+ 800w$/);
    await expect(first).toHaveCSS("object-fit", "cover");
    await expect(slides.nth(1).locator("img")).toHaveAttribute("loading", "lazy");
    for (let i = 2; i < total; i++) await expect(slides.nth(i).locator("img")).toHaveCount(0);
    await expect(slides.nth(0)).toHaveAttribute("aria-roledescription", "স্লাইড");
    await expect(slides.nth(0)).toHaveAttribute("aria-label", `১ / ${bnNum(total)}`);

    const caption = page.getByTestId("hero-caption-text");
    const date = page.getByTestId("hero-caption-date");
    const link = page.getByTestId("hero-caption-link");
    const expected = [
      { label: programs.ongoing.title_bn, date: `${dateText(dhakaDate(0), "bn")} – ${dateText(dhakaDate(3), "bn")}`, href: `/programs/${programs.ongoing.slug}`, alt: `${MARK}-ছবি-1` },
      { label: categoryName, date: "১৪ মার্চ ২০২৬", href: `/activities/${CAT}`, alt: `${MARK}-ছবি-2` },
      { label: programs.bnOnly.title_bn, date: dateText(dhakaDate(-3), "bn"), href: `/programs/${programs.bnOnly.slug}`, alt: programs.bnOnly.title_bn },
      { label: categoryName, date: null, href: `/activities/${CAT}`, alt: `${MARK}-ছবি-4` },
    ];
    const next = s.getByRole("button", { name: "পরের ছবি" });
    for (const [i, e] of expected.entries()) {
      if (i > 0) await next.click();
      await expect(s).toHaveAttribute("data-selected", String(i));
      await expect(page.getByTestId("hero-caption-label")).toHaveText(e.label);
      // The date on a line of its own, below the title.
      if (e.date) await expect(date).toHaveText(e.date);
      else await expect(date).toHaveCount(0);
      await expect(caption).toContainText(e.label);
      await expect(link).toHaveAttribute("href", e.href);
      await expect(link).toHaveAccessibleName(`এই কার্যক্রম দেখুন — ${e.label}`);
      await expect(slides.nth(i).locator("img")).toHaveAttribute("alt", e.alt);
      await expect(page.getByTestId("hero-counter")).toHaveText(`${bnNum(pad2(i + 1))} / ${bnNum(pad2(total))}`);
      // Only the current photo is exposed.
      await expect(slides.nth(i)).not.toHaveAttribute("inert");
      await expect(slides.nth((i + 1) % total)).toHaveAttribute("inert");
      await expect(slides.nth((i + 1) % total)).toHaveAttribute("aria-hidden", "true");
    }
    // The visitor's own change is announced politely.
    const announcer = page.getByTestId("hero-announcer");
    await expect(announcer).toHaveAttribute("aria-live", "polite");
    await expect(announcer).toHaveText(`ছবি ৪ / ${bnNum(total)}: ${categoryName}`);
  });

  test("English: caption in English with Bengali fallbacks marked, English dates, numbers and labels", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en");
    const s = slider(page);
    const total = await s.locator("[data-slide]").count();
    await expect(s).toHaveAttribute("aria-label", "Featured photos");
    await expect(s).toHaveAttribute("aria-roledescription", "photo slideshow");
    await expect(s.locator('[data-slide="0"]')).toHaveAttribute("aria-label", `1 of ${total}`);
    const caption = page.getByTestId("hero-caption-text");
    const link = page.getByTestId("hero-caption-link");
    await expect(caption).toContainText(programs.ongoing.title_en!);
    await expect(page.getByTestId("hero-caption-date")).toHaveText(`${dateText(dhakaDate(0), "en")} – ${dateText(dhakaDate(3), "en")}`);
    await expect(link).toHaveAttribute("href", `/en/programs/${programs.ongoing.slug}`);
    await expect(link).toHaveAccessibleName(`View this activity — ${programs.ongoing.title_en}`);
    await expect(page.getByTestId("hero-counter")).toHaveText(`01 / ${pad2(total)}`);
    // Captions are Bengali only: as alt text they are marked lang="bn".
    await expect(s.locator('[data-slide="0"] img')).toHaveAttribute("alt", `${MARK}-ছবি-1`);
    await expect(s.locator('[data-slide="0"] img')).toHaveAttribute("lang", "bn");
    await s.getByRole("button", { name: "Photo 2", exact: true }).click();
    await expect(caption).toContainText(categoryNameEn ?? categoryName);
    await expect(page.getByTestId("hero-caption-date")).toHaveText("14 March 2026");
    await expect(link).toHaveAttribute("href", `/en/activities/${CAT}`);
    await s.getByRole("button", { name: "Next photo" }).click();
    // A program without an English title: its Bengali title, marked, in the caption, the link name and the announcement.
    await expect(caption.locator('[lang="bn"]')).toHaveText(programs.bnOnly.title_bn);
    await expect(link.locator('[lang="bn"]')).toHaveText(programs.bnOnly.title_bn);
    await expect(page.getByTestId("hero-announcer")).toHaveText(`Photo 3 of ${total}: ${programs.bnOnly.title_bn}, ${dateText(dhakaDate(-3), "en")}`);
    await expect(page.getByTestId("hero-announcer").locator('[lang="bn"]')).toHaveText(programs.bnOnly.title_bn);
  });

  test("caption: a long title is cut at two lines but the date always shows in full; a range breaks only before its dash; the height does not depend on the web fonts", async ({ browser }) => {
    test.setTimeout(120_000);
    const longBn = `${MARK} কাশীপুর ও আশপাশের এলাকায় বৃক্ষরোপণ, পরিচ্ছন্নতা অভিযান, স্বাস্থ্য সচেতনতা ক্যাম্প এবং শিশু-কিশোরদের জন্য বিনামূল্যে শিক্ষা উপকরণ বিতরণ`;
    const longEn = `E2E ${RUN} tree planting, clean-up drive, health awareness camp and free study materials for children in Kashipur and nearby areas`;
    const { error } = await db.from("programs").update({ title_bn: longBn, title_en: longEn }).eq("id", programs.ongoing.id);
    expect(error).toBeNull();
    try {
      for (const [p, lang] of [["/", "bn"], ["/en", "en"]] as const) {
        for (const [w, h] of [[360, 740], [1024, 768]] as const) {
          const ctx = await freshContext(browser, { reducedMotion: "reduce", viewport: { width: w, height: h } });
          const page = await ctx.newPage();
          await page.goto(p);
          const where = `${p} at ${w}px`;
          const label = page.getByTestId("hero-caption-label");
          const date = page.getByTestId("hero-caption-date");
          await expect(label).toHaveText(lang === "bn" ? longBn : longEn);
          // The title is cut at two lines …
          const l = await label.evaluate((el) => ({ sh: el.scrollHeight, ch: el.clientHeight, lh: parseFloat(getComputedStyle(el).lineHeight) }));
          expect(l.sh, `${where}: long title is cut`).toBeGreaterThan(l.ch + 2);
          expect(Math.round(l.ch / l.lh), `${where}: two lines`).toBe(2);
          // … the date below it is shown in full, inside the caption block, and the link names the whole title.
          await expect(date).toBeVisible();
          await expect(date).toHaveText(`${dateText(dhakaDate(0), lang)} – ${dateText(dhakaDate(3), lang)}`);
          const d = await date.evaluate((el) => ({ overflow: getComputedStyle(el).overflow, clamp: getComputedStyle(el).webkitLineClamp }));
          expect(d, `${where}: date never cut`).toEqual({ overflow: "visible", clamp: "none" });
          const [lb, dbx, cb] = await Promise.all([label.boundingBox(), date.boundingBox(), page.getByTestId("hero-caption-box").boundingBox()]);
          expect(dbx!.y, `${where}: date under the title`).toBeGreaterThanOrEqual(lb!.y + lb!.height - 1);
          expect(dbx!.y + dbx!.height, `${where}: date inside the caption block`).toBeLessThanOrEqual(cb!.y + cb!.height + 1);
          await expect(page.getByTestId("hero-caption-link")).toHaveAccessibleName(lang === "bn" ? `এই কার্যক্রম দেখুন — ${longBn}` : `View this activity — ${longEn}`);
          // A range breaks only before its dash: squeeze the date line and see where the second line starts.
          const parts = await date.evaluate((el) => {
            el.style.width = "9rem";
            const out = [...el.querySelectorAll(":scope > span")].map((x) => ({ text: x.textContent ?? "", top: x.getBoundingClientRect().top }));
            el.style.width = "";
            return out;
          });
          expect(parts.map((x) => x.text)).toEqual([dateText(dhakaDate(0), lang), `– ${dateText(dhakaDate(3), lang)}`]);
          expect(parts[1].top, `${where}: the second date (with its dash) on the next line`).toBeGreaterThan(parts[0].top);
          await expectNoHorizontalOverflow(page, where);
          await ctx.close();
        }
      }
    } finally {
      await db.from("programs").update({ title_bn: programs.ongoing.title_bn, title_en: programs.ongoing.title_en }).eq("id", programs.ongoing.id);
    }

    // Phones: the caption block sits above the hero text, so its height must not change when the web fonts
    // arrive (font-display: swap), or the whole text moves down (layout shift). Same page with the fonts
    // blocked (fallback fonts) and loaded.
    for (const [p, w, h] of [["/", 360, 740], ["/", 390, 844], ["/", 412, 915], ["/en", 390, 844]] as const) {
      const measure = async (blockFonts: boolean) => {
        const ctx = await freshContext(browser, { reducedMotion: "reduce", viewport: { width: w, height: h } });
        const page = await ctx.newPage();
        if (blockFonts) await page.route(/\.(woff2?|ttf)(\?|$)/, (r) => r.abort());
        await page.goto(p);
        await page.evaluate(() => document.fonts.ready);
        const r = await page.evaluate(() => ({
          caption: document.querySelector('[data-testid="hero-caption-box"]')!.getBoundingClientRect().height,
          textTop: document.querySelector('[data-testid="hero-content"]')!.getBoundingClientRect().top,
          webFonts: [...document.fonts].filter((f) => f.status === "loaded").length,
        }));
        await ctx.close();
        return r;
      };
      const loaded = await measure(false);
      const fallback = await measure(true);
      const where = `${p} at ${w}px`;
      expect(loaded.webFonts, `${where}: web fonts loaded`).toBeGreaterThan(0);
      expect(fallback.webFonts, `${where}: web fonts blocked`).toBe(0);
      expect(Math.abs(loaded.caption - fallback.caption), `${where}: caption height ${loaded.caption} vs ${fallback.caption}`).toBeLessThan(1);
      expect(Math.abs(loaded.textTop - fallback.textTop), `${where}: hero text position ${loaded.textTop} vs ${fallback.textTop}`).toBeLessThan(1);
    }
  });

  test("controls: pause first, then the progress segments and previous/next; 44px targets; segments navigate", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    for (const [w, h] of [[1280, 800], [1024, 768], [390, 844], [360, 740]] as const) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/");
      const total = await slider(page).locator("[data-slide]").count();
      const controls = page.getByTestId("hero-controls");
      const names = await controls.getByRole("button").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
      const segments = Array.from({ length: total }, (_, i) => `ছবি ${bnNum(i + 1)}`);
      expect(names, `${w}px`).toEqual(["স্বয়ংক্রিয় স্লাইড থামান", ...segments, "আগের ছবি", "পরের ছবি"]);
      for (const box of await controls.getByRole("button").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON() as DOMRect))) {
        expect(Math.min(box.width, box.height), `${w}px: 44px touch target`).toBeGreaterThanOrEqual(44);
      }
      await expectNoHorizontalOverflow(page, `controls at ${w}px`);
    }
    const s = slider(page);
    const total = await s.locator("[data-slide]").count();
    await s.getByRole("button", { name: "ছবি ৩", exact: true }).click();
    await expect(s).toHaveAttribute("data-selected", "2");
    await expect(s.getByRole("button", { name: "ছবি ৩", exact: true })).toHaveAttribute("aria-current", "true");
    await expect(s.getByRole("button", { name: "ছবি ১", exact: true })).not.toHaveAttribute("aria-current");
    // Previous from the first photo wraps to the last one, next from the last back to the first.
    await s.getByRole("button", { name: "ছবি ১", exact: true }).click();
    await s.getByRole("button", { name: "আগের ছবি" }).click();
    await expect(s).toHaveAttribute("data-selected", String(total - 1));
    await s.getByRole("button", { name: "পরের ছবি" }).click();
    await expect(s).toHaveAttribute("data-selected", "0");
  });

  test("autoplay: next photo after about 6 s with a filling progress segment and a 700 ms crossfade; pause stops it; play resumes", async ({ page }) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const s = slider(page);
    await leaveSlider(page);
    await expect(s).toHaveAttribute("data-autoplay", "running");
    const fill = s.getByTestId("hero-progress-fill");
    await expect(fill).toHaveCSS("animation-name", "hero-progress");
    await expect(fill).toHaveCSS("animation-duration", "6s");
    await expect(s.locator("[data-slide]").first()).toHaveCSS("transition-duration", "0.7s");
    await expect(s.locator('[data-slide="0"] img')).toHaveCSS("animation-name", "hero-kenburns");
    const start = await selectedOf(s);
    await expect.poll(() => selectedOf(s), { timeout: 9_000, intervals: [250] }).not.toBe(start);
    // Changes made by autoplay are not announced.
    await expect(page.getByTestId("hero-announcer")).toHaveText("");

    const toggle = page.getByTestId("slider-toggle");
    await expect(toggle).toHaveAccessibleName("স্বয়ংক্রিয় স্লাইড থামান");
    await toggle.click();
    await leaveSlider(page);
    await expect(toggle).toHaveAccessibleName("স্বয়ংক্রিয় স্লাইড চালান");
    await expect(s).toHaveAttribute("data-autoplay", "stopped");
    await expect(fill).toHaveCSS("animation-play-state", "paused");
    const stopped = await selectedOf(s);
    await page.waitForTimeout(7_000);
    expect(await selectedOf(s), "no change while paused").toBe(stopped);

    // Paused, the visitor moves on: the new photo's segment is marked (filled completely, no timer).
    const total = await s.locator("[data-slide]").count();
    await s.getByRole("button", { name: "পরের ছবি" }).click();
    await leaveSlider(page);
    const paused = (stopped + 1) % total;
    await expect(s).toHaveAttribute("data-selected", String(paused));
    await expectMarkedSegment(s, paused);

    await toggle.click();
    await leaveSlider(page);
    await expect(toggle).toHaveAccessibleName("স্বয়ংক্রিয় স্লাইড থামান");
    await expect(s).toHaveAttribute("data-autoplay", "running");
    // Playing again: the timer starts on this photo.
    await expect(fill).toHaveAttribute("data-timed", "true");
    await expect(fill).toHaveCSS("animation-name", "hero-progress");
    await expect.poll(() => selectedOf(s), { timeout: 9_000, intervals: [250] }).not.toBe(paused);
  });

  test("pauses on hover, keyboard focus and a hidden tab; ←/→ change the photo, keep focus and are announced", async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const s = slider(page);
    const link = page.getByTestId("hero-caption-link");
    const total = await s.locator("[data-slide]").count();
    await leaveSlider(page);
    await expect(s).toHaveAttribute("data-autoplay", "running");

    await tabInto(page, s);
    await expect(link, "the caption link is the slider's first tab stop").toBeFocused();
    await expect(s).toHaveAttribute("data-autoplay", "stopped");
    const start = await selectedOf(s);
    await page.keyboard.press("ArrowRight");
    await expect(s).toHaveAttribute("data-selected", String((start + 1) % total));
    // Paused by keyboard focus: the chosen photo's segment is still marked as the current one.
    await expectMarkedSegment(s, (start + 1) % total);
    // The same link keeps focus and now leads to the new photo's page.
    await expect(link).toBeFocused();
    await expect(page.getByTestId("hero-announcer")).toContainText(`ছবি ${bnNum(((start + 1) % total) + 1)} / ${bnNum(total)}:`);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(s).toHaveAttribute("data-selected", String((start - 1 + total) % total));
    await expect(s.locator(`[data-slide="${(start - 1 + total) % total}"]`)).not.toHaveAttribute("inert");

    await leaveSlider(page);
    await expect(s).toHaveAttribute("data-autoplay", "running");
    if (!isMobile) {
      await page.getByTestId("hero-media").hover({ position: { x: 120, y: 120 } });
      await expect(s).toHaveAttribute("data-autoplay", "stopped");
      await leaveSlider(page);
      await expect(s).toHaveAttribute("data-autoplay", "running");
    }

    const setVisibility = (state: "hidden" | "visible") =>
      page.evaluate((v) => {
        Object.defineProperty(document, "hidden", { value: v === "hidden", configurable: true });
        Object.defineProperty(document, "visibilityState", { value: v, configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
      }, state);
    await setVisibility("hidden");
    await expect(s).toHaveAttribute("data-autoplay", "stopped");
    await setVisibility("visible");
    await expect(s).toHaveAttribute("data-autoplay", "running");
  });

  test("swipe changes the photo on touch screens: on the photo band on phones, anywhere on the hero but links from 1024px", async ({ browser }) => {
    const ctx = await freshContext(browser, { reducedMotion: "reduce", viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto("/");
    await waitForLayout(page, 390);
    const s = slider(page);
    const band = page.getByTestId("hero-media");
    // Vertical scrolling and pinch-zoom stay with the browser.
    await expect(page.getByTestId("hero-band")).toHaveCSS("touch-action", "pan-y pinch-zoom");
    await swipe(band, 320, 120);
    await expect(s).toHaveAttribute("data-selected", "1");
    await swipe(band, 80, 300);
    await expect(s).toHaveAttribute("data-selected", "0");
    await swipe(band, 200, 175);
    await expect(s, "a short movement is not a swipe").toHaveAttribute("data-selected", "0");
    // Phones: the text is below the photo band; a swipe there does not change the photo.
    await swipe(page.locator("#hero-title"), 320, 60);
    await expect(s).toHaveAttribute("data-selected", "0");
    await ctx.close();

    // Tablets in landscape and desktops: the photo is the whole hero's background, the text sits on it.
    for (const [w, h] of [[1024, 768], [1180, 820]] as const) {
      const wide = await freshContext(browser, { reducedMotion: "reduce", viewport: { width: w, height: h }, hasTouch: true });
      const p2 = await wide.newPage();
      await p2.goto("/en");
      await waitForLayout(p2, w);
      const s2 = slider(p2);
      await expect(p2.locator('[data-home-section="hero"]')).toHaveCSS("touch-action", "pan-y pinch-zoom");
      const content = p2.getByTestId("hero-content");
      const box = (await content.boundingBox())!;
      await swipe(content.locator("p").last(), box.x + box.width - 20, box.x + box.width - 260);
      await expect(s2, `${w}px: swipe on the text`).toHaveAttribute("data-selected", "1");
      await swipe(p2.locator("#hero-title"), box.x + 40, box.x + 300);
      await expect(s2, `${w}px: swipe back on the heading`).toHaveAttribute("data-selected", "0");
      // Not when it starts on a link or button.
      await swipe(content.getByRole("link").first(), box.x + 200, box.x + 20);
      await expect(s2, `${w}px: a swipe that starts on a link`).toHaveAttribute("data-selected", "0");
      await wide.close();
    }
  });

  test("prefers-reduced-motion: no autoplay, no pause button, no zoom, a still progress bar; manual navigation works", async ({ browser }) => {
    test.setTimeout(60_000);
    // The server cannot know the setting: the pause button it renders is hidden by CSS from the first paint
    // (nothing moves when the page becomes interactive).
    const noJs = await freshContext(browser, { reducedMotion: "reduce", viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    const first = await noJs.newPage();
    await first.goto("/");
    await expect(first.getByTestId("slider-toggle")).toHaveCount(1);
    await expect(first.getByTestId("slider-toggle")).toBeHidden();
    const ssr = (await first.getByTestId("hero-progress").boundingBox())!;
    await noJs.close();
    const hydrated = await freshContext(browser, { reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
    const second = await hydrated.newPage();
    await second.goto("/");
    await expect(second.getByTestId("slider-toggle")).toHaveCount(0);
    expect((await second.getByTestId("hero-progress").boundingBox())!.x, "progress bar does not move after hydration").toBeCloseTo(ssr.x, 0);
    await hydrated.close();

    const ctx = await freshContext(browser, { reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto("/");
    const s = slider(page);
    await expect(s.locator("[data-slide]").first()).toBeVisible();
    await expect(page.getByTestId("slider-toggle")).toHaveCount(0);
    await leaveSlider(page);
    await page.waitForTimeout(7_000);
    await expect(s).toHaveAttribute("data-autoplay", "stopped");
    await expect(s).toHaveAttribute("data-selected", "0");
    const fill = s.getByTestId("hero-progress-fill");
    await expect(fill).toHaveCSS("animation-name", "none");
    await expect(fill).toHaveCSS("transform", "none");
    await expect(s.locator('[data-slide="0"] img')).toHaveCSS("animation-name", "none");
    await s.getByRole("button", { name: "পরের ছবি" }).click();
    await expect(s).toHaveAttribute("data-selected", "1");
    await expect(page.getByTestId("hero-announcer")).toContainText("ছবি ২ /");
    await ctx.close();
  });

  test("one photo: just the photo and its caption; two: the full controls; six: one row (previous/next below on phones); the admin sees which are shown", async ({ page, browser }) => {
    test.setTimeout(90_000);
    const { count } = await anon.from("gallery_images").select("id", { count: "exact", head: true }).eq("is_published", true).eq("is_featured", true);
    test.skip(count !== images.length, "other featured photos are published in this database");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const s = slider(page);
    const others = images.slice(1).map((i) => i.id);
    const { error } = await db.from("gallery_images").update({ is_featured: false }).in("id", others);
    expect(error).toBeNull();
    try {
      await page.goto("/");
      await expect(s).toHaveAttribute("data-count", "1");
      await expect(s).not.toHaveAttribute("role", "region");
      await expect(s.locator("[data-slide]")).toHaveCount(1);
      await expect(s.locator("[data-slide]")).not.toHaveAttribute("aria-roledescription");
      for (const id of ["hero-controls", "slider-toggle", "hero-counter", "hero-announcer", "hero-progress"]) await expect(page.getByTestId(id), id).toHaveCount(0);
      await expect(page.getByTestId("hero-caption-text")).toContainText(programs.ongoing.title_bn);
      await expect(page.getByTestId("hero-caption-link")).toHaveAttribute("href", `/programs/${programs.ongoing.slug}`);
      await expect(s.locator("img")).toHaveAttribute("alt", `${MARK}-ছবি-1`);
      await expect(s).toHaveAttribute("data-autoplay", "stopped");
      await expectNoHorizontalOverflow(page, "one photo");

      await db.from("gallery_images").update({ is_featured: true }).eq("id", images[1].id);
      await page.goto("/");
      await expect(s).toHaveAttribute("role", "region");
      await expect(page.getByTestId("hero-progress").getByRole("button")).toHaveCount(2);
      await expect(page.getByTestId("slider-toggle")).toBeVisible();
      expect(await controlRows(page), "two photos: one row of controls").toHaveLength(1);
      await leaveSlider(page);
      await expect(s).toHaveAttribute("data-autoplay", "running");
    } finally {
      await db.from("gallery_images").update({ is_featured: true }).in("id", others);
    }

    // Six photos (the most shown; a seventh marked one is not): one row of controls (pause, segments,
    // previous/next) on wide screens; on phones previous/next wrap below and every segment stays 44px wide.
    await seedPhoto("4", { caption: `${MARK}-ছবি-5`, sort_order: -99_996, color: "#4e7d62" });
    await seedPhoto("5", { caption: `${MARK}-ছবি-6`, sort_order: -99_995, color: "#a8862f" });
    await seedPhoto("6", { caption: `${MARK}-ছবি-7`, sort_order: -99_994, color: "#1a372c" });
    for (const [w, h] of [[360, 740], [390, 844], [1024, 768], [1280, 800]] as const) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/");
      await expect(s.locator("[data-slide]"), "at most 6 photos").toHaveCount(6);
      const rows = await controlRows(page);
      const segs = await page.getByTestId("hero-progress").getByRole("button").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON() as DOMRect));
      expect(segs).toHaveLength(6);
      for (const b of segs) expect(b.width, `${w}px: segment width`).toBeGreaterThanOrEqual(44);
      if (w >= 1024) {
        expect(rows, `${w}px: one row`).toEqual([["স্বয়ংক্রিয় স্লাইড থামান", ...Array.from({ length: 6 }, (_, i) => `ছবি ${bnNum(i + 1)}`), "আগের ছবি", "পরের ছবি"]]);
      } else {
        expect(rows, `${w}px: pause and the segments, then previous/next`).toEqual([
          ["স্বয়ংক্রিয় স্লাইড থামান", ...Array.from({ length: 6 }, (_, i) => `ছবি ${bnNum(i + 1)}`)],
          ["আগের ছবি", "পরের ছবি"],
        ]);
      }
      await expectNoHorizontalOverflow(page, `six photos at ${w}px`);
    }

    // The admin gallery tells which marked photos the homepage shows, and why the seventh is not shown.
    const admin = await browser.newContext({ baseURL: env.BASE_URL ?? "http://localhost:3000", storageState: await storageStateFor(browser, "editor") });
    const ap = await admin.newPage();
    await ap.goto(`/admin/gallery?category=${categoryId}`);
    await expect(ap.getByTestId("hero-summary")).toContainText("হিরো স্লাইডারে চিহ্নিত ৭টি ছবি · হোমপেজে দেখাচ্ছে ৬টি");
    const card = (i: number) => ap.locator(`li[data-image-id="${images[i].id}"]`);
    await expect(card(0).getByTestId("hero-placement")).toHaveText("হোমপেজে দেখাচ্ছে (১ নম্বর)");
    await expect(card(5).getByTestId("hero-placement")).toHaveText("হোমপেজে দেখাচ্ছে (৬ নম্বর)");
    await expect(card(6).getByTestId("hero-placement")).toHaveAttribute("data-status", "over-limit");
    await expect(card(6).getByTestId("hero-placement")).toHaveText("হোমপেজে দেখাচ্ছে না — প্রথম ৬টিই দেখায়");
    // Marking it again says the homepage does not show it (instead of "added to the hero slider").
    const star = card(6).getByRole("button", { name: /^হিরো স্লাইডারে:/ });
    await star.click();
    await expect(ap.getByText("হিরো স্লাইডার থেকে সরানো হয়েছে।")).toBeVisible();
    await expect(star).toHaveAttribute("aria-pressed", "false");
    await expect(card(6).getByTestId("hero-placement")).toHaveCount(0);
    await star.click();
    await expect(ap.getByText(/হিরো স্লাইডারে চিহ্নিত হয়েছে, তবে হোমপেজে প্রথম ৬টি ছবিই দেখায়/)).toBeVisible();
    await expect(star).toHaveAttribute("aria-pressed", "true");
    await expect(card(6).getByTestId("hero-placement")).toHaveAttribute("data-status", "over-limit");
    await admin.close();
  });

  test("no horizontal overflow at 360, 390, 768, 1024 and 1440px (both languages)", async ({ page }) => {
    test.setTimeout(90_000);
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const p of ["/", "/en"]) {
        await page.goto(p);
        await expectNoHorizontalOverflow(page, `${p} at ${width}px`);
        // "See all announcements": text aligned with the heading on phones, but the link and its
        // 3px + 2px focus outline stay inside the screen.
        const all = page.locator('[data-home-section="announcements"]').getByRole("link", { name: /সব ঘোষণা দেখুন|See all announcements/ });
        const box = (await all.boundingBox())!;
        expect(box.x - 5, `${p} at ${width}px: focus outline of "see all" on screen`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("landmark regions have unique names (hero slider vs. photo section)", async ({ page }) => {
    for (const p of ["/", "/en"]) {
      await page.goto(p);
      const names = await page.locator('[role="region"][aria-label], section[aria-labelledby]').evaluateAll((els) =>
        els.map((e) => e.getAttribute("aria-label") ?? document.getElementById(e.getAttribute("aria-labelledby") ?? "")?.textContent?.trim() ?? ""),
      );
      expect(names.length, p).toBeGreaterThan(3);
      expect(new Set(names).size, `${p}: ${names.join(" | ")}`).toBe(names.length);
    }
  });

  test("axe (WCAG 2 A/AA), no CSP violations and no console errors (both languages)", async ({ browser }) => {
    test.setTimeout(90_000);
    // Reduced motion: scroll-driven reveal animations would otherwise leave off-screen content mid-fade for axe.
    const ctx = await freshContext(browser, { reducedMotion: "reduce" });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(e.message));
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 844 });
      for (const p of ["/", "/en"]) {
        await page.goto(p);
        await page.waitForLoadState("networkidle");
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        expect(await axeViolations(page), `axe ${p} at ${width}px`).toEqual([]);
        const csp = await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []);
        expect(csp, `CSP violations on ${p}`).toEqual([]);
      }
    }
    expect(errors, "console errors").toEqual([]);
    await ctx.close();
  });
});
