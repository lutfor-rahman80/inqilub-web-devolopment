import { test, expect, type Browser, type BrowserContextOptions, type Page, type TestInfo } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { completeMfa, signInUi, storageStateFor, verifiedTotpFactors, verifyClientMfa } from "./helpers/login";
import { totp } from "./helpers/totp";

/**
 * Admin panel core: dashboard per role, website content, announcements,
 * messages, users (create / deactivate / reset password), permission checks
 * (page redirect + forged server actions), last-super-admin guard, roles,
 * audit log, own-password change, two-step login (TOTP) and browser uploads
 * under the Content-Security-Policy.
 *
 * Everything created here carries a unique run marker and is removed in
 * afterAll. The seeded accounts' passwords and the site slogan are never
 * left changed (the slogan is restored even if a test fails midway).
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
const PUBLISHABLE_KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const db = createClient(SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const PASSWORD = "Test@12345";
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const DENIED = "এই কাজের অনুমতি আপনার নেই";

let run = "";
let mark = "";
let originalOrganization: unknown = null;
const createdUserIds = new Set<string>();

// Shared between the serial tests below.
const newStaff = { email: "", name: "", password: "", id: "" };
const managerRole = { key: "", id: "" };
const role = { name: "", key: "", id: "" };
const announcement = { title: "", id: "" };

test.describe.configure({ mode: "serial" });

function contextOptions(testInfo: TestInfo): BrowserContextOptions {
  const u = testInfo.project.use;
  return {
    baseURL: BASE_URL,
    locale: "bn-BD",
    timezoneId: "Asia/Dhaka",
    viewport: u.viewport,
    userAgent: u.userAgent,
    deviceScaleFactor: u.deviceScaleFactor,
    isMobile: u.isMobile,
    hasTouch: u.hasTouch,
  };
}

/** Signed-in storage state for a seeded account (shared helper: handles two-step login, reuses states). */
const stateFor = (browser: Browser, who: string) => storageStateFor(browser, who, { baseURL: BASE_URL });

async function pageAs(browser: Browser, testInfo: TestInfo, who: string | null): Promise<Page> {
  const ctx = await browser.newContext({
    ...contextOptions(testInfo),
    ...(who ? { storageState: await stateFor(browser, who) } : {}),
  });
  return ctx.newPage();
}

async function expectNoHorizontalOverflow(page: Page) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw, "page must not scroll horizontally").toBeLessThanOrEqual(iw);
}

/** Replays a captured server-action request with another session; returns the response text. */
async function replay(page: Page, url: string, captured: { headers: Record<string, string>; body: string }) {
  const headers = Object.fromEntries(
    Object.entries(captured.headers).filter(([k]) => !["cookie", "content-length", "host"].includes(k.toLowerCase())),
  );
  const res = await page.request.post(url, { headers, data: captured.body });
  expect(res.status()).toBeLessThan(500);
  return res.text();
}

/** Captures (and aborts) the next server-action POST the page sends to `pathname`. */
async function captureAction(page: Page, pathname: string, trigger: () => Promise<void>) {
  const captured: { headers: Record<string, string>; body: string }[] = [];
  const pattern = `**${pathname}`;
  await page.route(pattern, async (route) => {
    const req = route.request();
    if (req.method() === "POST" && req.headers()["next-action"]) {
      captured.push({ headers: req.headers(), body: req.postData() ?? "" });
      await route.abort();
      return;
    }
    await route.continue();
  });
  await trigger();
  await expect.poll(() => captured.length).toBeGreaterThan(0);
  await page.unroute(pattern);
  return captured[0];
}

/** The admin panel's own chrome (sidebar on desktop, menu button on phones) — not the public site's. */
async function expectAdminChrome(page: Page, testInfo: TestInfo) {
  if (testInfo.project.name === "mobile") await expect(page.getByRole("button", { name: "মেনু খুলুন" })).toBeVisible();
  else await expect(page.getByRole("navigation", { name: "অ্যাডমিন মেনু" })).toBeVisible();
  await expect(page.getByRole("link", { name: "হোম পেজে ফিরে যান" })).toHaveCount(0);
}

async function roleId(key: string): Promise<string> {
  const { data } = await db.from("roles").select("id").eq("key", key).single();
  return data!.id;
}

test.beforeAll(async ({}, testInfo) => {
  run = `${testInfo.project.name.slice(0, 1)}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  mark = `ই২ই-অ্যাডমিন-${run}`;
  const { data } = await db.from("site_settings").select("value").eq("key", "organization").single();
  originalOrganization = data?.value ?? null;
});

test.afterAll(async () => {
  // Restore the organization section exactly as it was (only if changed).
  if (originalOrganization) {
    const { data } = await db.from("site_settings").select("value").eq("key", "organization").single();
    if (JSON.stringify(data?.value) !== JSON.stringify(originalOrganization)) {
      await db.from("site_settings").update({ value: originalOrganization as never }).eq("key", "organization");
    }
  }
  // The seeded super admin must stay active.
  const { data: superUser } = await db.from("staff_profiles").select("id, is_active, roles!inner(key)").eq("roles.key", "super_admin");
  for (const s of superUser ?? []) if (!s.is_active) await db.from("staff_profiles").update({ is_active: true }).eq("id", s.id);

  await db.from("announcements").delete().like("title", `%${mark}%`);
  await db.from("contact_messages").delete().like("subject", `%${mark}%`);
  if (role.key) await db.from("roles").delete().eq("key", role.key);
  for (const id of createdUserIds) await db.auth.admin.deleteUser(id);
  // After its users are gone (foreign key).
  if (managerRole.key) await db.from("roles").delete().eq("key", managerRole.key);
});

// ---------------------------------------------------------------------------

test("dashboard widgets follow the role's permissions; denied pages redirect with a notice", async ({ browser }, testInfo) => {
  const secretary = await pageAs(browser, testInfo, "secretary");
  await secretary.goto("/admin");
  await expect(secretary.getByRole("heading", { level: 1, name: "ড্যাশবোর্ড" })).toBeVisible();
  await expect(secretary.getByTestId("dash-applications")).toBeVisible();
  await expect(secretary.getByTestId("stat-pending")).toBeVisible();
  await expect(secretary.getByTestId("stat-members")).toBeVisible();
  await expect(secretary.getByTestId("stat-unread")).toBeVisible();
  await expect(secretary.getByTestId("dash-gallery")).toHaveCount(0);
  await expect(secretary.getByTestId("dash-categories")).toHaveCount(0);
  await expect(secretary.getByTestId("stat-published-photos")).toHaveCount(0);
  await expect(secretary.getByTestId("dash-audit")).toHaveCount(0);
  await expect(secretary.getByTestId("quick-actions").getByRole("link", { name: "ছবি আপলোড" })).toHaveCount(0);

  // Counts are real database values (Bengali digits). Other suites may add
  // applications meanwhile, so compare only when the count was stable.
  const pendingCount = async () =>
    (await db.from("membership_applications").select("id", { count: "exact", head: true }).eq("status", "pending")).count ?? 0;
  const bnDigits = (n: number) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
  const before = await pendingCount();
  await secretary.reload();
  const shown = await secretary.getByTestId("stat-pending-value").textContent();
  if ((await pendingCount()) === before) expect(shown).toBe(bnDigits(before));
  else expect(shown).toMatch(/^[০-৯]+$/);
  await expectNoHorizontalOverflow(secretary);
  await secretary.context().close();

  const editor = await pageAs(browser, testInfo, "editor");
  await editor.goto("/admin");
  await expect(editor.getByTestId("dash-gallery")).toBeVisible();
  await expect(editor.getByTestId("dash-categories")).toBeVisible();
  await expect(editor.getByTestId("stat-published-photos")).toBeVisible();
  await expect(editor.getByTestId("quick-actions").getByRole("link", { name: "ওয়েবসাইট কনটেন্ট" })).toBeVisible();
  await expect(editor.getByTestId("dash-applications")).toHaveCount(0);
  await expect(editor.getByTestId("stat-pending")).toHaveCount(0);
  await expect(editor.getByTestId("stat-unread")).toHaveCount(0);
  await expect(editor.getByTestId("denied-notice")).toHaveCount(0);

  // A page without permission sends back to the dashboard with a notice.
  for (const url of ["/admin/users", "/admin/messages", "/admin/audit", "/admin/roles"]) {
    await editor.goto(url);
    await expect(editor).toHaveURL(/\/admin\?denied=1$/);
  }
  await expect(editor.getByTestId("denied-notice")).toContainText("এই পৃষ্ঠার অনুমতি আপনার নেই");
  await expectNoHorizontalOverflow(editor);
  await editor.context().close();

  const admin = await pageAs(browser, testInfo, "admin");
  await admin.goto("/admin");
  await expect(admin.getByTestId("dash-audit")).toBeVisible();
  await expect(admin.getByTestId("dash-audit").getByTestId("audit-entry").first()).toBeVisible();
  await admin.context().close();
});

test("website content: validation keeps values; slogan change shows on the home page and is reverted", async ({ browser }, testInfo) => {
  const org = originalOrganization as { slogan: string };
  const newSlogan = `ই২ই স্লোগান ${run}`;
  const editor = await pageAs(browser, testInfo, "editor");
  await editor.goto("/admin/content", { waitUntil: "networkidle" });
  await expect(editor.getByTestId("logo-note")).toContainText("public/brand/");
  await expect(editor.getByTestId("logo-note")).toContainText("logo-192.png");
  await expect(editor.getByTestId("logo-note")).toContainText("og-default.png");
  const slogan = editor.locator("#organization-slogan");
  const tagline = editor.locator("#organization-tagline");
  await expect(slogan).toHaveValue(org.slogan);
  const taglineValue = await tagline.inputValue();

  // Invalid: empty slogan → field error, other values kept, nothing saved.
  await slogan.fill("");
  await editor.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  await expect(editor.locator("#organization-slogan-error")).toContainText("স্লোগান লিখুন");
  await expect(slogan).toBeFocused();
  await expect(tagline).toHaveValue(taglineValue);

  try {
    await slogan.fill(newSlogan);
    await editor.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
    await expect(editor.getByText("পরিবর্তন সংরক্ষিত হয়েছে।")).toBeVisible();

    const pub = await pageAs(browser, testInfo, null);
    await pub.goto("/");
    await expect(pub.getByText(`“${newSlogan}”`).first()).toBeVisible();

    // Revert through the same form.
    await slogan.fill(org.slogan);
    await editor.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
    await expect(editor.getByTestId("content-last-updated")).toContainText("কনটেন্ট এডিটর");
    await expect.poll(async () => {
      const { data } = await db.from("site_settings").select("value").eq("key", "organization").single();
      return (data!.value as { slogan: string }).slogan;
    }).toBe(org.slogan);
    await pub.goto("/");
    await expect(pub.getByText(`“${org.slogan}”`).first()).toBeVisible();
    await pub.context().close();
  } finally {
    const { data } = await db.from("site_settings").select("value").eq("key", "organization").single();
    if (JSON.stringify(data?.value) !== JSON.stringify(originalOrganization)) {
      await db.from("site_settings").update({ value: originalOrganization as never }).eq("key", "organization");
    }
  }

  // Unsaved edits are not lost silently when switching sections.
  await editor.goto("/admin/content", { waitUntil: "networkidle" });
  await tagline.fill(`${taglineValue} অসংরক্ষিত`);
  const aboutTab = editor.getByRole("navigation", { name: "কনটেন্টের অংশ" }).getByRole("link", { name: "আমাদের সম্পর্কে" });
  const dialogs: string[] = [];
  editor.once("dialog", (d) => { dialogs.push(d.message()); void d.dismiss(); });
  await aboutTab.click();
  await expect.poll(() => dialogs.length).toBe(1);
  expect(dialogs[0]).toContain("সংরক্ষণ না করা পরিবর্তন");
  await expect(editor).toHaveURL(/\/admin\/content$/);
  await expect(tagline).toHaveValue(`${taglineValue} অসংরক্ষিত`);
  editor.once("dialog", (d) => void d.accept());
  await aboutTab.click();
  await expect(editor).toHaveURL(/section=about$/);
  const { data: orgAfter } = await db.from("site_settings").select("value").eq("key", "organization").single();
  expect((orgAfter!.value as { tagline: string }).tagline).toBe(taglineValue);

  // Contact: only real Facebook links are accepted (nothing is saved).
  await editor.goto("/admin/content?section=contact", { waitUntil: "networkidle" });
  const fb = editor.locator("#contact-facebook_url");
  const fbValue = await fb.inputValue();
  await fb.fill("https://evil.example.com/facebook.com/page");
  await editor.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  await expect(editor.locator("#contact-facebook_url-error")).toContainText("facebook.com");
  await expect(fb).toHaveValue("https://evil.example.com/facebook.com/page");
  const { data: contact } = await db.from("site_settings").select("value").eq("key", "contact").single();
  expect((contact!.value as { facebook_url: string }).facebook_url).toBe(fbValue);

  // Membership declaration: the first paragraph must keep {name}.
  const { data: membershipBefore } = await db.from("site_settings").select("value").eq("key", "membership").single();
  try {
    await editor.goto("/admin/content?section=membership", { waitUntil: "networkidle" });
    const first = editor.locator("#declaration-0");
    const firstValue = await first.inputValue();
    expect(firstValue).toContain("{name}");
    const withoutName = firstValue.replaceAll("{name}", "নাম");
    await first.fill(withoutName);
    await expect(first).toHaveValue(withoutName);
    await editor.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
    await expect(editor.locator("#declaration-0-error")).toContainText("{name}");
  } finally {
    // Never leave the real declaration changed, even if the check above fails.
    const { data } = await db.from("site_settings").select("value").eq("key", "membership").single();
    if (membershipBefore && JSON.stringify(data?.value) !== JSON.stringify(membershipBefore.value)) {
      await db.from("site_settings").update({ value: membershipBefore.value as never }).eq("key", "membership");
    }
  }
  await expectNoHorizontalOverflow(editor);
  await editor.context().close();
});

test("announcement: create + publish → public page → delete", async ({ browser }, testInfo) => {
  announcement.title = `ঘোষণা ${mark}`;
  const editor = await pageAs(browser, testInfo, "editor");
  await editor.goto("/admin/announcements/new");
  await editor.locator("#ann-title").fill(announcement.title);
  await editor.locator("#ann-body").fill(`প্রথম অনুচ্ছেদ ${run}।\n\n<b>দ্বিতীয়</b> অনুচ্ছেদ।`);
  await editor.locator("#ann-published").check();
  await editor.getByRole("button", { name: "ঘোষণা তৈরি করুন" }).click();
  await expect(editor).toHaveURL(/\/admin\/announcements\/[0-9a-f-]{36}\?created=1$/);
  await expect(editor.getByText("ঘোষণাটি তৈরি হয়েছে।")).toBeVisible();
  announcement.id = editor.url().match(/announcements\/([0-9a-f-]{36})/)![1];

  const pub = await pageAs(browser, testInfo, null);
  await pub.goto("/announcements");
  await expect(pub.getByText(announcement.title).first()).toBeVisible();
  await pub.goto(`/announcements/${announcement.id}`);
  await expect(pub.getByText(`প্রথম অনুচ্ছেদ ${run}।`)).toBeVisible();
  // Plain text: the markup is shown literally, not rendered.
  await expect(pub.getByText("<b>দ্বিতীয়</b> অনুচ্ছেদ।")).toBeVisible();

  // Unpublish → gone from the public page; publish again.
  await editor.locator("#ann-published").uncheck();
  await editor.getByRole("button", { name: "পরিবর্তন সংরক্ষণ করুন" }).click();
  await expect(editor.getByText("খসড়া হিসেবে আছে")).toBeVisible();
  const hidden = await pub.goto(`/announcements/${announcement.id}`);
  expect(hidden?.status()).toBe(404);

  // Delete from the list (with confirmation).
  await editor.goto("/admin/announcements?filter=draft");
  const row = editor.getByTestId("announcement-row").filter({ hasText: announcement.title });
  await expect(row).toContainText("খসড়া");
  await expectNoHorizontalOverflow(editor);
  await row.getByRole("button", { name: /মুছে ফেলুন/ }).click();
  const dialog = editor.getByRole("dialog", { name: "ঘোষণাটি মুছে ফেলবেন?" });
  await expect(dialog.getByRole("button", { name: "বাতিল" })).toBeFocused();
  await dialog.getByRole("button", { name: "হ্যাঁ, মুছে ফেলুন" }).click();
  await expect(editor.getByText("ঘোষণাটি মুছে ফেলা হয়েছে।")).toBeVisible();
  const { count } = await db.from("announcements").select("id", { count: "exact", head: true }).eq("id", announcement.id);
  expect(count).toBe(0);
  await pub.goto("/announcements");
  await expect(pub.getByText(announcement.title)).toHaveCount(0);
  await pub.context().close();

  // A stale link to the deleted announcement: HTTP 404 inside the admin panel.
  const gone = await editor.goto(`/admin/announcements/${announcement.id}`);
  expect(gone?.status()).toBe(404);
  await expect(editor.getByTestId("admin-not-found")).toContainText("ঘোষণাটি খুঁজে পাওয়া যায়নি");
  await expectAdminChrome(editor, testInfo);
  await editor.getByTestId("admin-not-found").getByRole("link", { name: "সব ঘোষণা" }).click();
  await expect(editor).toHaveURL(/\/admin\/announcements$/);
  expect((await editor.goto("/admin/announcements/not-an-id"))?.status()).toBe(404);
  await editor.context().close();
});

test("messages: unread first, read/unread toggle, delete; others have no access", async ({ browser }, testInfo) => {
  const { data: inserted, error } = await db
    .from("contact_messages")
    .insert({ name: "ই২ই প্রেরক", mobile: "01712345678", email: "e2e-sender@example.com", subject: `প্রশ্ন ${mark}`, message: `লাইন এক\n\nলাইন দুই <script>x</script>` })
    .select("id")
    .single();
  expect(error).toBeNull();
  const id = inserted!.id;

  // Without messages.view: no page, and the database returns nothing.
  const editor = await pageAs(browser, testInfo, "editor");
  await editor.goto(`/admin/messages/${id}`);
  await expect(editor).toHaveURL(/\/admin\?denied=1$/);
  await editor.context().close();
  const editorDb = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
  await editorDb.auth.signInWithPassword({ email: "editor@test.local", password: PASSWORD });
  expect((await editorDb.from("contact_messages").select("id").eq("id", id)).data ?? []).toHaveLength(0);
  await editorDb.auth.signOut({ scope: "local" });

  const secretary = await pageAs(browser, testInfo, "secretary");
  await secretary.goto("/admin/messages?filter=unread");
  const row = secretary.getByTestId("message-row").filter({ hasText: mark });
  await expect(row).toHaveAttribute("data-unread", "true");
  await expectNoHorizontalOverflow(secretary);
  await row.getByRole("link").click();
  await expect(secretary.getByTestId("message-subject")).toHaveText(`প্রশ্ন ${mark}`);
  await expect(secretary.getByTestId("message-body")).toContainText("<script>x</script>");
  await expect(secretary.getByRole("link", { name: "01712345678" })).toHaveAttribute("href", "tel:01712345678");
  await expect(secretary.getByRole("link", { name: "e2e-sender@example.com" })).toHaveAttribute("href", "mailto:e2e-sender@example.com");

  // Opening marks it read; the toggle marks it unread again.
  await expect.poll(async () => (await db.from("contact_messages").select("is_read").eq("id", id).single()).data?.is_read).toBe(true);
  await secretary.getByRole("button", { name: "অপঠিত হিসেবে চিহ্নিত করুন", exact: true }).click();
  await expect(secretary.getByRole("button", { name: "পঠিত হিসেবে চিহ্নিত করুন", exact: true })).toBeVisible();
  expect((await db.from("contact_messages").select("is_read").eq("id", id).single()).data?.is_read).toBe(false);

  await secretary.getByRole("button", { name: "মুছে ফেলুন" }).click();
  await secretary.getByRole("dialog").getByRole("button", { name: "হ্যাঁ, মুছে ফেলুন" }).click();
  await expect(secretary).toHaveURL(/\/admin\/messages\?deleted=1$/);
  await expect(secretary.getByText("বার্তাটি মুছে ফেলা হয়েছে।")).toBeVisible();

  // Back to the deleted message (stale link): HTTP 404 inside the admin panel.
  const gone = await secretary.goto(`/admin/messages/${id}`);
  expect(gone?.status()).toBe(404);
  await expect(secretary.getByTestId("admin-not-found")).toContainText("বার্তাটি খুঁজে পাওয়া যায়নি");
  await expectAdminChrome(secretary, testInfo);
  const { count } = await db.from("contact_messages").select("id", { count: "exact", head: true }).eq("id", id);
  expect(count).toBe(0);
  await secretary.context().close();
});

test("super admin creates a secretary account; it signs in, is deactivated and refused, password reset works", async ({ browser }, testInfo) => {
  test.setTimeout(120_000);
  newStaff.email = `e2e-staff-${run}@test.local`;
  newStaff.name = `নতুন সম্পাদক ${mark}`;
  const sup = await pageAs(browser, testInfo, "super");
  await sup.goto("/admin/users?new=1");
  const create = sup.getByRole("dialog", { name: "নতুন ব্যবহারকারী" });
  await expect(create.locator("#new-email")).toBeFocused();
  await create.locator("#new-email").fill(newStaff.email);
  await create.locator("#new-name").fill(newStaff.name);
  await create.locator("#new-role").selectOption({ label: "সাধারণ সম্পাদক" });
  await create.getByRole("button", { name: "অ্যাকাউন্ট তৈরি করুন" }).click();
  newStaff.password = (await sup.getByTestId("temp-password").textContent({ timeout: 20_000 }))!.trim();
  expect(newStaff.password.length).toBeGreaterThanOrEqual(10);
  // Shown on one line (never split), also on phones.
  expect((await sup.getByTestId("temp-password").boundingBox())!.height).toBeLessThan(60);
  const { data: profile } = await db.from("staff_profiles").select("id, roles(key)").eq("full_name", newStaff.name).single();
  newStaff.id = profile!.id;
  createdUserIds.add(newStaff.id);
  expect((profile!.roles as unknown as { key: string }).key).toBe("secretary");
  await sup.getByRole("button", { name: "ঠিক আছে, বন্ধ করুন" }).click();
  const userRow = sup.locator(`[data-email="${newStaff.email}"]`).filter({ visible: true });
  await expect(userRow).toContainText("সাধারণ সম্পাদক");
  // Cards (phones) and table (desktop) both show the creation date.
  await expect(userRow).toContainText(testInfo.project.name === "mobile" ? "তৈরি:" : "কখনো নয়");
  await expectNoHorizontalOverflow(sup);

  // The same email cannot be used twice.
  await sup.getByRole("button", { name: "নতুন ব্যবহারকারী" }).click();
  const again = sup.getByRole("dialog", { name: "নতুন ব্যবহারকারী" });
  await again.locator("#new-email").fill(newStaff.email);
  await again.locator("#new-name").fill("আরেকজন");
  await again.locator("#new-role").selectOption({ label: "সাধারণ সম্পাদক" });
  await again.getByRole("button", { name: "অ্যাকাউন্ট তৈরি করুন" }).click();
  await expect(again.locator("#new-email-error")).toContainText("ইতিমধ্যে");
  await again.getByRole("button", { name: "বন্ধ করুন" }).click();

  // The new account signs in and reaches the applications page.
  const staffCtx = await browser.newContext(contextOptions(testInfo));
  const staffPage = await staffCtx.newPage();
  await signInUi(staffPage, newStaff.email, newStaff.password);
  await staffPage.goto("/admin/applications");
  await expect(staffPage).toHaveURL(/\/admin\/applications$/);
  await expect(staffPage.getByRole("heading", { level: 1 })).toBeVisible();

  // Super admin deactivates it.
  await userRow.getByRole("button", { name: /সম্পাদনা/ }).click();
  const edit = sup.getByRole("dialog");
  await edit.locator("#edit-active").uncheck();
  await edit.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  await expect(sup.getByText(`${newStaff.name}-এর তথ্য সংরক্ষিত হয়েছে।`)).toBeVisible();
  await expect(userRow.getByTestId("user-status")).toHaveText("নিষ্ক্রিয়");

  // Open session ends; signing in again is refused.
  await staffPage.goto("/admin/applications");
  await expect(staffPage).toHaveURL(/\/admin\/login/);
  await staffPage.fill("#email", newStaff.email);
  await staffPage.fill("#password", newStaff.password);
  await staffPage.click("button[type=submit]");
  await expect(staffPage.getByRole("alert").filter({ hasText: /সঠিক নয়|অনুমতি নেই/ })).toBeVisible();
  await expect(staffPage).toHaveURL(/\/admin\/login/);

  // Re-activate, then reset the password: the new one works, the old one not.
  await userRow.getByRole("button", { name: /সম্পাদনা/ }).click();
  await sup.getByRole("dialog").locator("#edit-active").check();
  await sup.getByRole("dialog").getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  await expect(userRow.getByTestId("user-status")).toHaveText("সক্রিয়");
  await userRow.getByRole("button", { name: /পাসওয়ার্ড রিসেট/ }).click();
  await sup.getByRole("button", { name: "নতুন পাসওয়ার্ড তৈরি করুন" }).click();
  const resetPassword = (await sup.getByTestId("temp-password").textContent({ timeout: 20_000 }))!.trim();
  expect(resetPassword).not.toBe(newStaff.password);
  await sup.getByRole("button", { name: "ঠিক আছে, বন্ধ করুন" }).click();
  await signInUi(staffPage, newStaff.email, resetPassword);
  await expect(staffPage).toHaveURL(/\/admin$/);
  newStaff.password = resetPassword;
  await staffCtx.close();
  await sup.context().close();
});

test("admin without users.manage: page redirects, forged server actions are refused", async ({ browser }, testInfo) => {
  const admin = await pageAs(browser, testInfo, "admin");
  await admin.goto("/admin/users");
  await expect(admin).toHaveURL(/\/admin\?denied=1$/);
  await expect(admin.getByTestId("denied-notice")).toBeVisible();
  await admin.goto("/admin/roles");
  await expect(admin).toHaveURL(/\/admin\?denied=1$/);

  // Capture real requests from the super admin's browser (aborted: nothing changes)…
  const sup = await pageAs(browser, testInfo, "super");
  await sup.goto("/admin/users");
  const row = sup.locator(`[data-email="${newStaff.email}"]`).filter({ visible: true });
  const deactivate = await captureAction(sup, "/admin/users", async () => {
    await row.getByRole("button", { name: /সম্পাদনা/ }).click();
    await sup.getByRole("dialog").locator("#edit-active").uncheck();
    await sup.getByRole("dialog").getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  });
  await sup.getByRole("dialog").getByRole("button", { name: "বন্ধ করুন" }).click();
  const reset = await captureAction(sup, "/admin/users", async () => {
    await row.getByRole("button", { name: /পাসওয়ার্ড রিসেট/ }).click();
    await sup.getByRole("button", { name: "নতুন পাসওয়ার্ড তৈরি করুন" }).click();
  });
  await sup.context().close();

  // …and replay them with the admin's session: both refused, nothing changed.
  expect(await replay(admin, "/admin/users", deactivate)).toContain(DENIED);
  expect(await replay(admin, "/admin/users", reset)).toContain(DENIED);
  const { data: still } = await db.from("staff_profiles").select("is_active").eq("id", newStaff.id).single();
  expect(still!.is_active).toBe(true);
  const check = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { error: signInError } = await check.auth.signInWithPassword({ email: newStaff.email, password: newStaff.password });
  expect(signInError).toBeNull();
  await check.auth.signOut({ scope: "local" });

  // Defense in depth: the database refuses the admin's own session too.
  const adminDb = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
  await adminDb.auth.signInWithPassword({ email: "admin@test.local", password: PASSWORD });
  const { data: changed } = await adminDb.from("staff_profiles").update({ is_active: false }).eq("id", newStaff.id).select("id");
  expect(changed ?? []).toHaveLength(0);
  // Account events are written by the server only (no fake "password reset" entries).
  const { data: adminUser } = await adminDb.auth.getUser();
  const { error: rpcError } = await adminDb.rpc("log_account_event", {
    p_actor: adminUser.user!.id,
    p_action: "password_reset",
    p_target: newStaff.id,
  });
  expect(rpcError?.message).toMatch(/permission denied/i);
  await adminDb.auth.signOut({ scope: "local" }); // never revoke the shared account's other sessions
  await admin.context().close();
});

test("a user manager cannot change, deactivate or reset their own account — whatever the id's letter case", async ({ browser }, testInfo) => {
  test.setTimeout(90_000);
  // A dedicated non-super account whose custom role holds users.manage.
  managerRole.key = `e2e_um_${run}`;
  const { data: r, error: roleError } = await db
    .from("roles")
    .insert({ key: managerRole.key, name_bn: `ব্যবস্থাপক ${mark}`, is_system: false })
    .select("id")
    .single();
  expect(roleError).toBeNull();
  managerRole.id = r!.id;
  await db.from("role_permissions").insert({ role_id: managerRole.id, permission: "users.manage" });
  const email = `e2e-um-${run}@test.local`;
  const password = "Manage#pass123";
  const { data: u } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  const ownId = u.user!.id;
  createdUserIds.add(ownId);
  await db.from("staff_profiles").insert({ id: ownId, full_name: `ব্যবস্থাপক ${mark}`, role_id: managerRole.id });

  const ctx = await browser.newContext(contextOptions(testInfo));
  const page = await ctx.newPage();
  await signInUi(page, email, password);
  await page.goto("/admin/users");
  const own = page.locator(`[data-email="${email}"]`).filter({ visible: true });
  await expect(own).toContainText("আপনি");

  // Real requests from this page (aborted), replayed with the own id in UPPER case.
  await own.getByRole("button", { name: /সম্পাদনা/ }).click();
  const save = await captureAction(page, "/admin/users", async () => {
    await page.getByRole("dialog").getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  });
  await page.getByRole("dialog").getByRole("button", { name: "বন্ধ করুন" }).click();
  expect(save.body).toContain(ownId);
  const upper = ownId.toUpperCase();
  const deactivate = save.body.replace(ownId, upper).replace('"is_active":true', '"is_active":false');
  expect(await replay(page, "/admin/users", { ...save, body: deactivate })).toContain("নিজের ভূমিকা পরিবর্তন বা নিজের অ্যাকাউন্ট নিষ্ক্রিয় করা যায় না");
  const otherRole = await roleId("secretary");
  const promote = save.body.replace(ownId, upper).replace(managerRole.id, otherRole);
  expect(await replay(page, "/admin/users", { ...save, body: promote })).toContain("নিজের ভূমিকা পরিবর্তন বা নিজের অ্যাকাউন্ট নিষ্ক্রিয় করা যায় না");

  const other = page.locator(`[data-email="${newStaff.email}"]`).filter({ visible: true });
  const reset = await captureAction(page, "/admin/users", async () => {
    await other.getByRole("button", { name: /পাসওয়ার্ড রিসেট/ }).click();
    await page.getByRole("button", { name: "নতুন পাসওয়ার্ড তৈরি করুন" }).click();
  });
  expect(reset.body).toContain(newStaff.id);
  const resetOwn = await replay(page, "/admin/users", { ...reset, body: reset.body.replace(newStaff.id, upper) });
  expect(resetOwn).toContain("নিজের পাসওয়ার্ড “আমার অ্যাকাউন্ট” পাতা থেকে পরিবর্তন করুন");
  await ctx.close();

  // Nothing changed: still active with the same role, not blocked, old password works.
  const { data: after } = await db.from("staff_profiles").select("is_active, role_id").eq("id", ownId).single();
  expect(after).toEqual({ is_active: true, role_id: managerRole.id });
  const { data: authUser } = await db.auth.admin.getUserById(ownId);
  expect(authUser.user?.banned_until ?? null).toBeNull();
  const check = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
  expect((await check.auth.signInWithPassword({ email, password })).error).toBeNull();
  await check.auth.signOut({ scope: "local" });
});

test("the last active super admin cannot be deactivated", async ({ browser }, testInfo) => {
  const { data: supers } = await db.from("staff_profiles").select("id, is_active, roles!inner(key)").eq("roles.key", "super_admin").eq("is_active", true);
  test.skip((supers ?? []).length !== 1, "needs exactly one active super admin");
  const superId = supers![0].id;

  const sup = await pageAs(browser, testInfo, "super");
  await sup.goto("/admin/users");
  const own = sup.locator(`[data-email="super@test.local"]`).filter({ visible: true });
  await expect(own).toContainText("আপনি");
  await expect(own.getByRole("button", { name: /পাসওয়ার্ড রিসেট/ })).toHaveCount(0);
  await own.getByRole("button", { name: /সম্পাদনা/ }).click();
  const dialog = sup.getByRole("dialog");
  await expect(dialog.locator("#edit-active")).toBeDisabled();
  await expect(dialog.locator("#edit-role")).toBeDisabled();
  await expect(dialog).toContainText("কমপক্ষে একজন সক্রিয় সুপার অ্যাডমিন থাকতে হবে");

  // A forged "deactivate myself" request is refused with the same message…
  const save = await captureAction(sup, "/admin/users", async () => {
    await dialog.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  });
  expect(save.body).toContain('"is_active":true');
  const text = await replay(sup, "/admin/users", { ...save, body: save.body.replace('"is_active":true', '"is_active":false') });
  expect(text).toContain("কমপক্ষে একজন সক্রিয় সুপার অ্যাডমিন থাকতে হবে।");

  // …and the database refuses it as well: with the password alone (no second
  // step) the super admin holds no permission at all through the API…
  const superDb = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
  await superDb.auth.signInWithPassword({ email: "super@test.local", password: PASSWORD });
  const { data: oneStep, error: oneStepError } = await superDb.from("staff_profiles").update({ is_active: false }).eq("id", superId).select("id");
  expect(oneStepError).toBeNull();
  expect(oneStep ?? []).toHaveLength(0);
  expect((await superDb.rpc("my_permissions")).data).toEqual([]);
  // …and after the authenticator code, the last-super-admin guard refuses.
  await verifyClientMfa(superDb, "super@test.local");
  const { error } = await superDb.from("staff_profiles").update({ is_active: false }).eq("id", superId);
  expect(error?.message).toContain("LAST_SUPER_ADMIN");
  await superDb.auth.signOut({ scope: "local" });
  const { data: after } = await db.from("staff_profiles").select("is_active").eq("id", superId).single();
  expect(after!.is_active).toBe(true);
  await sup.context().close();
});

test("custom role: create, toggle permissions, delete", async ({ browser }, testInfo) => {
  role.name = `ভূমিকা ${mark}`;
  const latin = `E2E Role ${run}`;
  role.key = latin.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const sup = await pageAs(browser, testInfo, "super");
  await sup.goto("/admin/roles");
  await expectNoHorizontalOverflow(sup);
  await sup.getByRole("button", { name: "নতুন ভূমিকা" }).click();
  const create = sup.getByRole("dialog", { name: "নতুন ভূমিকা" });
  await create.locator("#role-name").fill(role.name);
  await create.locator("#role-key").fill(latin);
  await expect(create.getByTestId("role-key-preview")).toHaveText(role.key);
  await create.locator('input[data-permission="messages.view"]').check();
  await create.getByRole("button", { name: "ভূমিকা তৈরি করুন" }).click();
  await expect(sup.getByText(`“${role.name}” ভূমিকা তৈরি হয়েছে।`)).toBeVisible();

  const { data: created } = await db.from("roles").select("id, is_system").eq("key", role.key).single();
  role.id = created!.id;
  expect(created!.is_system).toBe(false);
  const perms = async () =>
    ((await db.from("role_permissions").select("permission").eq("role_id", role.id)).data ?? []).map((r) => r.permission).sort();
  expect(await perms()).toEqual(["messages.view"]);

  // Toggle: add audit.view, remove messages.view.
  await sup.getByRole("button", { name: `${role.name}: সম্পাদনা` }).click();
  const edit = sup.getByRole("dialog", { name: `ভূমিকা: ${role.name}` });
  await edit.locator('input[data-permission="audit.view"]').check();
  await edit.locator('input[data-permission="messages.view"]').uncheck();
  await edit.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  await expect(sup.getByText(`“${role.name}” ভূমিকার পরিবর্তন সংরক্ষিত হয়েছে।`)).toBeVisible();
  expect(await perms()).toEqual(["audit.view"]);
  if (testInfo.project.name === "desktop") {
    await expect(sup.locator(`td[data-role-key="${role.key}"][data-permission="audit.view"]`)).toContainText("আছে");
    await expect(sup.locator(`td[data-role-key="${role.key}"][data-permission="messages.view"]`)).toContainText("নেই");
  } else {
    await expect(sup.locator(`li[data-role-key="${role.key}"]`)).toContainText("অডিট লগ দেখা");
  }

  // The super admin role is locked; system roles cannot be deleted.
  await expect(sup.getByRole("button", { name: "সুপার অ্যাডমিন: সম্পাদনা", exact: true })).toHaveCount(0);
  await expect(sup.getByRole("button", { name: "অ্যাডমিন: সম্পাদনা", exact: true })).toBeVisible();
  await expect(sup.getByRole("button", { name: "অ্যাডমিন: মুছে ফেলুন", exact: true })).toHaveCount(0);

  // Delete the custom role.
  await sup.getByRole("button", { name: `${role.name}: মুছে ফেলুন` }).click();
  await sup.getByRole("dialog").getByRole("button", { name: "হ্যাঁ, মুছে ফেলুন" }).click();
  await expect(sup.getByText(`“${role.name}” ভূমিকা মুছে ফেলা হয়েছে।`)).toBeVisible();
  const { count } = await db.from("roles").select("id", { count: "exact", head: true }).eq("id", role.id);
  expect(count).toBe(0);
  await sup.context().close();
});

test("own account: password change re-checks the current password (dedicated test user)", async ({ browser }, testInfo) => {
  test.setTimeout(90_000);
  const email = `e2e-account-${run}@test.local`;
  const name = `অ্যাকাউন্ট ${mark}`;
  const { data: u, error } = await db.auth.admin.createUser({ email, password: "Start#pass123", email_confirm: true });
  expect(error).toBeNull();
  createdUserIds.add(u.user!.id);
  await db.from("staff_profiles").insert({ id: u.user!.id, full_name: name, role_id: await roleId("committee_viewer") });

  const ctx = await browser.newContext(contextOptions(testInfo));
  const page = await ctx.newPage();
  await signInUi(page, email, "Start#pass123");
  await page.goto("/admin/account");
  await expect(page.getByTestId("account-name")).toHaveText(name);
  await expect(page.getByTestId("account-email")).toHaveText(email);
  await expect(page.getByTestId("account-role")).toHaveText("কমিটি সদস্য (দেখার অনুমতি)");
  await expectNoHorizontalOverflow(page);

  // Mismatch and wrong current password are refused.
  await page.locator("#pw-current").fill("Start#pass123");
  await page.locator("#pw-next").fill("Brand#new4567");
  await page.locator("#pw-confirm").fill("Brand#new4568");
  await page.getByRole("button", { name: "পাসওয়ার্ড পরিবর্তন করুন" }).click();
  await expect(page.locator("#pw-confirm-error")).toContainText("মিলছে না");
  await page.locator("#pw-current").fill("Wrong#pass999");
  await page.locator("#pw-confirm").fill("Brand#new4567");
  await page.getByRole("button", { name: "পাসওয়ার্ড পরিবর্তন করুন" }).click();
  await expect(page.locator("#pw-current-error")).toContainText("বর্তমান পাসওয়ার্ড সঠিক নয়");

  await page.locator("#pw-current").fill("Start#pass123");
  await page.getByRole("button", { name: "পাসওয়ার্ড পরিবর্তন করুন" }).click();
  await expect(page.getByText("পাসওয়ার্ড পরিবর্তন হয়েছে।")).toBeVisible();
  await expect(page.locator("#pw-current")).toHaveValue("");
  // This session stays signed in.
  await page.goto("/admin/account");
  await expect(page).toHaveURL(/\/admin\/account$/);
  await ctx.close();

  const check = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
  expect((await check.auth.signInWithPassword({ email, password: "Start#pass123" })).error).not.toBeNull();
  expect((await check.auth.signInWithPassword({ email, password: "Brand#new4567" })).error).toBeNull();
  await check.auth.signOut({ scope: "local" });
});

/** A throw-away staff account (removed in afterAll). */
async function tempStaff(roleKey: string, label: string) {
  const email = `e2e-${label}-${run}@test.local`.toLowerCase();
  const password = "Mfa#test-pass123";
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  expect(error).toBeNull();
  const id = data.user!.id;
  createdUserIds.add(id);
  const name = `${label} ${mark}`;
  await db.from("staff_profiles").insert({ id, full_name: name, role_id: await roleId(roleKey) });
  return { id, email, password, name };
}

async function passwordStep(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await Promise.all([page.waitForURL((u) => u.pathname !== "/admin/login", { timeout: 30_000 }), page.click("button[type=submit]")]);
}

test("two-step login: a super admin must set it up first; pages, actions and the database refuse one-step sessions", async ({ browser }, testInfo) => {
  test.setTimeout(150_000);
  const sup = await tempStaff("super_admin", "mfa-super");

  // A real server action (content save) captured from a full super admin session (aborted).
  const full = await pageAs(browser, testInfo, "super");
  await full.goto("/admin/content", { waitUntil: "networkidle" });
  const save = await captureAction(full, "/admin/content", async () => {
    await full.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  });
  await full.context().close();

  const ctx = await browser.newContext(contextOptions(testInfo));
  const page = await ctx.newPage();
  await passwordStep(page, sup.email, sup.password);
  await expect(page).toHaveURL(/\/admin\/login\/mfa$/);
  await expect(page.locator("[data-mfa-mode]")).toHaveAttribute("data-mfa-mode", "enrol");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("দুই ধাপের লগইন চালু করুন");

  // No admin page and no server action before the second step.
  for (const url of ["/admin", "/admin/users", "/admin/content", "/admin/account"]) {
    await page.goto(url);
    await expect(page, url).toHaveURL(/\/admin\/login\/mfa$/);
  }
  expect(await replay(page, "/admin/content", save)).toContain(DENIED);
  // The database grants nothing to the one-step session either.
  const apiOneStep = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
  await apiOneStep.auth.signInWithPassword({ email: sup.email, password: sup.password });
  expect((await apiOneStep.rpc("my_permissions")).data).toEqual([]);
  expect((await apiOneStep.from("audit_logs").select("id").limit(1)).data ?? []).toHaveLength(0);
  // Staff-only reads too: only the account's own profile and role (the sign-in and two-step pages need them),
  // not the staff list, the roles or the permission matrix.
  const oneStepUser = (await apiOneStep.auth.getUser()).data.user!;
  const ownRows = (await apiOneStep.from("staff_profiles").select("id, roles(key)")).data ?? [];
  expect(ownRows.map((r) => r.id)).toEqual([oneStepUser.id]);
  expect((ownRows[0].roles as unknown as { key: string } | null)?.key).toBe("super_admin");
  expect(((await apiOneStep.from("roles").select("key")).data ?? []).map((r) => r.key)).toEqual(["super_admin"]);
  expect((await apiOneStep.from("permissions").select("key").limit(1)).data ?? []).toHaveLength(0);
  expect((await apiOneStep.from("role_permissions").select("role_id").limit(1)).data ?? []).toHaveLength(0);
  expect((await apiOneStep.rpc("is_staff")).data).toBe(false);
  await apiOneStep.auth.signOut({ scope: "local" });

  // Set-up: QR code + secret; a wrong code is refused; the right one opens the panel.
  await page.goto("/admin/login/mfa");
  await page.getByTestId("mfa-start").click();
  await expect(page.getByTestId("totp-qr")).toHaveAttribute("src", /^data:image\/png;base64,/);
  const secret = ((await page.getByTestId("totp-secret").textContent()) ?? "").replace(/\s+/g, "");
  expect(secret).toMatch(/^[A-Z2-7]{16,}$/);
  await expectNoHorizontalOverflow(page);
  await page.fill("#code", "000000");
  await page.getByTestId("mfa-submit").click();
  await expect(page.locator("#code-error")).toContainText("কোডটি মেলেনি");
  await page.fill("#code", totp(secret));
  await Promise.all([page.waitForURL(/\/admin$/), page.getByTestId("mfa-submit").click()]);
  await expect(page.getByRole("heading", { level: 1, name: "ড্যাশবোর্ড" })).toBeVisible();

  // Account page: on; the only authenticator of a super admin cannot be removed.
  await page.goto("/admin/account");
  await expect(page.getByTestId("mfa-status")).toHaveText(/চালু আছে/);
  await page.getByRole("button", { name: "অথেনটিকেটর অ্যাপ ১ মুছুন" }).click();
  await expect(page.getByRole("dialog")).toContainText("অন্তত একটি অথেনটিকেটর অ্যাপ");
  await page.getByRole("dialog").getByRole("button", { name: "ঠিক আছে" }).click();
  await ctx.close();

  // Next sign-in: password, then the code (challenge, not set-up).
  const ctx2 = await browser.newContext(contextOptions(testInfo));
  const again = await ctx2.newPage();
  await passwordStep(again, sup.email, sup.password);
  await expect(again.locator("[data-mfa-mode]")).toHaveAttribute("data-mfa-mode", "challenge");
  await expect(again.locator("#code")).toBeFocused();
  await completeMfa(again, sup.email);
  await expect(again).toHaveURL(/\/admin$/);
  await ctx2.close();

  // API: the same account with the code has its permissions.
  const api = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
  await api.auth.signInWithPassword({ email: sup.email, password: sup.password });
  await verifyClientMfa(api, sup.email);
  expect(((await api.rpc("my_permissions")).data as string[]).length).toBeGreaterThan(5);
  await api.auth.signOut({ scope: "local" });
});

test("two-step login for other staff: optional, then required; removal needs a fresh code; a super admin can reset it", async ({ browser }, testInfo) => {
  test.setTimeout(150_000);
  const viewer = await tempStaff("committee_viewer", "mfa-viewer");
  const ctx = await browser.newContext(contextOptions(testInfo));
  const page = await ctx.newPage();
  await signInUi(page, viewer.email, viewer.password);
  await expect(page).toHaveURL(/\/admin$/); // optional: no second step yet

  await page.goto("/admin/account");
  await expect(page.getByTestId("mfa-status")).toHaveText(/চালু নেই/);
  await expect(page.getByTestId("mfa-section")).toContainText("সুপারিশ");
  await page.getByTestId("mfa-add").click();
  await page.getByTestId("mfa-start").click();
  const secret = ((await page.getByTestId("totp-secret").textContent()) ?? "").replace(/\s+/g, "");
  await page.fill("#account-enrol-code", totp(secret));
  await page.getByTestId("mfa-submit").click();
  await expect(page.getByText("দুই ধাপের লগইন চালু হয়েছে")).toBeVisible();
  await expect(page.getByTestId("mfa-status")).toHaveText(/চালু আছে/);
  await expectNoHorizontalOverflow(page);
  expect(verifiedTotpFactors(viewer.email)).toHaveLength(1);

  // Now required at sign-in.
  const ctx2 = await browser.newContext(contextOptions(testInfo));
  const second = await ctx2.newPage();
  await passwordStep(second, viewer.email, viewer.password);
  await expect(second.locator("[data-mfa-mode]")).toHaveAttribute("data-mfa-mode", "challenge");
  await second.goto("/admin");
  await expect(second).toHaveURL(/\/admin\/login\/mfa$/);
  // The database also limits a one-step session of this account to its own profile.
  const apiViewer = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
  await apiViewer.auth.signInWithPassword({ email: viewer.email, password: viewer.password });
  expect(((await apiViewer.from("staff_profiles").select("id")).data ?? []).map((r) => r.id)).toEqual([viewer.id]);
  expect((await apiViewer.from("role_permissions").select("role_id").limit(1)).data ?? []).toHaveLength(0);
  await apiViewer.auth.signOut({ scope: "local" });

  // Removing it asks for a current code.
  await page.getByRole("button", { name: "অথেনটিকেটর অ্যাপ ১ মুছুন" }).click();
  const dialog = page.getByRole("dialog", { name: "অথেনটিকেটর অ্যাপ মুছুন" });
  await dialog.locator("#remove-code").fill("123456");
  await dialog.getByRole("button", { name: "মুছে ফেলুন" }).click();
  await expect(dialog.locator("#remove-code-error")).toContainText("কোডটি মেলেনি");
  await dialog.locator("#remove-code").fill(totp(secret));
  await dialog.getByRole("button", { name: "মুছে ফেলুন" }).click();
  await expect(page.getByText("অথেনটিকেটর অ্যাপটি মুছে ফেলা হয়েছে।")).toBeVisible();
  await expect.poll(() => verifiedTotpFactors(viewer.email).length).toBe(0);

  // Enrol again (e.g. a new phone)…
  await page.getByTestId("mfa-add").click();
  await page.getByTestId("mfa-start").click();
  const secret2 = ((await page.getByTestId("totp-secret").textContent()) ?? "").replace(/\s+/g, "");
  await page.fill("#account-enrol-code", totp(secret2));
  await page.getByTestId("mfa-submit").click();
  await expect(page.getByText("দুই ধাপের লগইন চালু হয়েছে")).toBeVisible();
  await ctx.close();

  // …lost phone: a super admin resets it from their account page.
  const sup = await pageAs(browser, testInfo, "super");
  await sup.goto("/admin/account");
  await sup.locator("#mfa-reset-target").selectOption(viewer.id);
  await sup.getByRole("button", { name: "দুই ধাপের লগইন রিসেট করুন" }).click();
  await sup.getByRole("dialog").getByRole("button", { name: "রিসেট করুন" }).click();
  await expect(sup.getByText(new RegExp(`${viewer.name}-এর অথেনটিকেটর অ্যাপ মুছে ফেলা হয়েছে`))).toBeVisible();
  expect(verifiedTotpFactors(viewer.email)).toHaveLength(0);
  await ctx2.close();
  // Signing in again goes straight in (no factor left, not a super admin).
  const ctx3 = await browser.newContext(contextOptions(testInfo));
  const third = await ctx3.newPage();
  await passwordStep(third, viewer.email, viewer.password);
  await expect(third).toHaveURL(/\/admin$/);
  await ctx3.close();

  // Audit trail.
  await sup.goto("/admin/audit?entity=staff_profiles");
  const entries = sup.getByTestId("audit-entry").filter({ hasText: viewer.name });
  await expect(entries.filter({ hasText: "দুই ধাপের লগইন চালু" }).first()).toBeVisible();
  await expect(entries.filter({ hasText: "অথেনটিকেটর অ্যাপ মুছে ফেলা" }).first()).toBeVisible();
  await expect(entries.filter({ hasText: "দুই ধাপের লগইন রিসেট" }).first()).toContainText("সুপার অ্যাডমিন (টেস্ট)");
  await sup.context().close();

  // Only super admins may reset: a forged call from the viewer is refused.
  const viewerPage = await (await browser.newContext(contextOptions(testInfo))).newPage();
  await signInUi(viewerPage, viewer.email, viewer.password);
  await viewerPage.goto("/admin/account");
  await expect(viewerPage.getByRole("heading", { name: "অন্য কর্মীর দুই ধাপের লগইন রিসেট" })).toHaveCount(0);
  await viewerPage.context().close();
});

test("browser uploads still work under the Content-Security-Policy (gallery photo, member photo)", async ({ browser }, testInfo) => {
  test.setTimeout(150_000);
  const csp = async (p: Page) => p.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []);
  const tracked = async (who: string) => {
    const ctx = await browser.newContext({ ...contextOptions(testInfo), storageState: await stateFor(browser, who) });
    await ctx.addInitScript(() => {
      const w = window as unknown as { __csp: string[] };
      w.__csp = [];
      document.addEventListener("securitypolicyviolation", (e) => w.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
    });
    return ctx.newPage();
  };
  const caption = `সিএসপি ${mark}`;
  const jpeg = await sharp({ create: { width: 900, height: 600, channels: 3, background: { r: 62, g: 107, b: 82 } } }).jpeg().toBuffer();
  const png = await sharp({ create: { width: 400, height: 500, channels: 3, background: { r: 201, g: 165, b: 76 } } }).png().toBuffer();
  const { data: cat } = await db.from("activity_categories").select("id, slug").eq("is_active", true).limit(1).single();
  const { data: designation } = await db.from("designations").select("id").limit(1).single();
  const { data: member, error: memberError } = await db
    .from("members")
    .insert({ member_no: "", full_name: `সিএসপি সদস্য ${mark}`, designation_id: designation!.id })
    .select("id")
    .single();
  expect(memberError).toBeNull();
  try {
    // Gallery: in-browser compression (blob: URLs) + direct upload to Supabase Storage.
    const editor = await tracked("editor");
    await editor.goto("/admin/gallery");
    await editor.locator("input[type=file]").setInputFiles({ name: "csp.jpg", mimeType: "image/jpeg", buffer: jpeg });
    await editor.getByLabel(/ক্যাটাগরি \(ফোল্ডার\)/).selectOption(cat!.id);
    await editor.locator('input[id$="-caption"]').fill(caption);
    await editor.getByRole("button", { name: /আপলোড করুন/ }).click();
    await expect(editor.locator('li[data-status="done"]')).toHaveCount(1, { timeout: 60_000 });
    expect(await csp(editor)).toEqual([]);
    await editor.goto(`/gallery?category=${cat!.slug}`);
    await expect(editor.getByRole("img", { name: caption, exact: true })).toBeVisible();
    expect(await csp(editor)).toEqual([]);
    // Dashboard and every website-content section.
    for (const url of ["/admin", ...["organization", "about", "contact", "membership", "directory", "social", "quiz"].map((s) => `/admin/content?section=${s}`)]) {
      await editor.goto(url);
      await expect(editor.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await csp(editor), url).toEqual([]);
    }
    await editor.context().close();

    // Sign-in page (signed out).
    const anonCtx = await browser.newContext(contextOptions(testInfo));
    await anonCtx.addInitScript(() => {
      const w = window as unknown as { __csp: string[] };
      w.__csp = [];
      document.addEventListener("securitypolicyviolation", (e) => w.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
    });
    const anon = await anonCtx.newPage();
    await anon.goto("/admin/login");
    await expect(anon.locator("#email")).toBeVisible();
    expect(await csp(anon)).toEqual([]);
    await anonCtx.close();

    // Member photo.
    const admin = await tracked("admin");
    await admin.goto(`/admin/members/${member!.id}`);
    await admin.getByTestId("photo-input").setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: png });
    await admin.getByTestId("photo-save").click();
    await expect
      .poll(async () => (await db.from("members").select("photo_path").eq("id", member!.id).single()).data?.photo_path ?? "", { timeout: 30_000 })
      .toMatch(/^photos\//);
    await admin.reload();
    expect(await csp(admin)).toEqual([]);
    await admin.context().close();
  } finally {
    const { data: imgs } = await db.from("gallery_images").select("id, storage_path, thumb_path").eq("caption", caption);
    if (imgs?.length) {
      await db.from("gallery_images").delete().in("id", imgs.map((i) => i.id));
      await db.storage.from("gallery").remove(imgs.flatMap((i) => [i.storage_path, i.thumb_path].filter((x): x is string => Boolean(x))));
    }
    const { data: m } = await db.from("members").select("photo_path").eq("id", member!.id).single();
    if (m?.photo_path) await db.storage.from("members").remove([m.photo_path]);
    await db.from("members").delete().eq("id", member!.id);
  }
});

test("audit log lists the changes made above, with filters", async ({ browser }, testInfo) => {
  const admin = await pageAs(browser, testInfo, "admin");
  await admin.goto("/admin/audit?entity=announcements");
  const list = admin.getByTestId("audit-list");
  await expect(list.getByTestId("audit-entry").filter({ hasText: announcement.title }).filter({ hasText: "তৈরি" })).toBeVisible();
  await expect(list.getByTestId("audit-entry").filter({ hasText: announcement.title }).filter({ hasText: "মুছে ফেলা" })).toBeVisible();
  await expectNoHorizontalOverflow(admin);

  await admin.goto("/admin/audit?entity=roles");
  await expect(admin.getByTestId("audit-entry").filter({ hasText: role.name }).filter({ hasText: "তৈরি" })).toBeVisible();
  await expect(admin.getByTestId("audit-entry").filter({ hasText: role.name }).filter({ hasText: "মুছে ফেলা" })).toBeVisible();

  await admin.goto("/admin/audit?entity=staff_profiles");
  const staffEntries = admin.getByTestId("audit-entry").filter({ hasText: newStaff.name });
  await expect(staffEntries.filter({ hasText: "পাসওয়ার্ড রিসেট" }).first()).toBeVisible();
  await expect(staffEntries.filter({ hasText: "সক্রিয়: না" }).first()).toContainText("সুপার অ্যাডমিন (টেস্ট)");
  await expect(admin.getByTestId("audit-entry").filter({ hasText: `অ্যাকাউন্ট ${mark}` }).filter({ hasText: "পাসওয়ার্ড পরিবর্তন" })).toBeVisible();

  // Filters through the form: subject + who + today.
  await admin.goto("/admin/audit");
  await admin.locator("#f-entity").selectOption({ label: "ওয়েবসাইট কনটেন্ট" });
  await admin.locator("#f-actor").selectOption({ label: "কনটেন্ট এডিটর (টেস্ট)" });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
  await admin.locator("#f-from").fill(today);
  await admin.locator("#f-to").fill(today);
  await admin.getByRole("button", { name: "ফিল্টার করুন" }).click();
  await expect(admin).toHaveURL(/entity=site_settings/);
  const entries = admin.getByTestId("audit-entry");
  await expect(entries.filter({ hasText: "সংগঠনের পরিচিতি" }).first()).toBeVisible();
  for (const text of await entries.allTextContents()) {
    expect(text).toContain("ওয়েবসাইট কনটেন্ট");
    expect(text).toContain("কনটেন্ট এডিটর (টেস্ট)");
    // Bookkeeping ("changed by") is never listed as a change.
    expect(text).not.toContain("পরিবর্তন করেছেন");
  }
  // The slogan edits above name the field that changed.
  await expect(entries.filter({ hasText: "সংগঠনের পরিচিতি" }).filter({ hasText: "স্লোগান" }).first()).toBeVisible();

  // "Clear all filters" also clears the form, so the next submit is unfiltered.
  await admin.getByRole("link", { name: "সব ফিল্টার মুছুন" }).click();
  await expect(admin).toHaveURL(/\/admin\/audit$/);
  await expect(admin.locator("#f-entity")).toHaveValue("");
  await expect(admin.locator("#f-actor")).toHaveValue("");
  await expect(admin.locator("#f-from")).toHaveValue("");
  await admin.getByRole("button", { name: "ফিল্টার করুন" }).click();
  await expect(admin).toHaveURL(/\/admin\/audit\?entity=&actor=&from=&to=$/);
  await expect(admin.getByTestId("audit-count")).toContainText("মোট");
  await admin.context().close();
});
