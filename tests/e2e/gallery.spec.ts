import { test, expect, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import crypto from "node:crypto";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { storageStateFor } from "./helpers/login";

/**
 * Gallery & activities: browser upload → public pages, caption edit,
 * unpublish, category change (files move), delete permissions (UI, server
 * action and database), folder sync, lightbox, category admin, access control.
 *
 * Uses existing categories for photos and creates only uniquely named data,
 * which is removed afterwards. Fixture images are generated at run time.
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
const bucket = () => db.storage.from("gallery");

const PASSWORD = "Test@12345";
const PROGRAM_SLUG = () => `e2e-gallery-${run}`.toLowerCase().replace(/[^a-z0-9-]/g, "");
const SLUG_A = "other-activities";
const SLUG_B = "eid-distribution";

test.describe.configure({ mode: "serial" });

let run = "";
let mark = "";
let dir = "";
const states: Record<string, string> = {};
const cats: Record<string, { id: string; slug: string }> = {};
const createdPaths = new Set<string>();
const createdCategorySlugs = new Set<string>();
let uploaded: { id: string; storage_path: string; thumb_path: string | null }[] = [];

async function pageAs(browser: Browser, who: string | null): Promise<Page> {
  const ctx = await browser.newContext(who ? { storageState: states[who] } : {});
  return ctx.newPage();
}

async function fixture(name: string, label: string, color: string, width = 2400, height = 1600): Promise<string> {
  const file = path.join(dir, name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="55%" font-size="200" text-anchor="middle" fill="white" font-family="sans-serif">${label}</text></svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toFile(file);
  return file;
}

async function objectExists(p: string): Promise<boolean> {
  const { data } = await bucket().exists(p);
  return data === true;
}

/** Server action id from the build manifest (dev or production build). */
function actionId(exportedName: string): string | null {
  // E2E_SERVER=production: testing `next start`, whose action ids differ from the dev server's.
  const roots = process.env.E2E_SERVER === "production" ? [".next/server"] : [".next/dev/server", ".next/server"];
  for (const root of roots) {
    const file = path.join(process.cwd(), root, "app/admin/(panel)/gallery/page/server-reference-manifest.json");
    if (!existsSync(file)) continue;
    const manifest = JSON.parse(readFileSync(file, "utf8")) as { node: Record<string, { exportedName?: string; filename?: string }> };
    for (const [id, entry] of Object.entries(manifest.node)) {
      if (entry.exportedName === exportedName && entry.filename?.includes("gallery/actions")) return id;
    }
  }
  return null;
}

/** Calls a gallery server action directly with the page's session (like a crafted request would). */
async function callAction(page: Page, exportedName: string, args: unknown[]): Promise<string> {
  const id = actionId(exportedName);
  expect(id, `server action ${exportedName} in manifest`).not.toBeNull();
  const res = await page.request.post("/admin/gallery", {
    headers: {
      "Next-Action": id!,
      "Content-Type": "text/plain;charset=UTF-8",
      Accept: "text/x-component",
      Origin: new URL(page.url()).origin,
    },
    data: JSON.stringify(args),
  });
  return res.text();
}

/** Supabase client signed in as a test account (browser-equivalent session, RLS applies). */
async function sessionClient(who: string) {
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email: `${who}@test.local`, password: PASSWORD });
  expect(error).toBeNull();
  return client;
}

async function expectNoHorizontalOverflow(page: Page) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw, "page must not scroll horizontally").toBeLessThanOrEqual(iw);
}

test.beforeAll(async ({ browser }, testInfo) => {
  run = `${testInfo.project.name}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  mark = `ই২ই-গ্যালারি-${run}`;
  // Fixtures and login states live outside the repository.
  dir = path.join(tmpdir(), `inqilab-gallery-e2e-${run}`);
  mkdirSync(dir, { recursive: true });

  const { data, error } = await db.from("activity_categories").select("id, slug").in("slug", [SLUG_A, SLUG_B]);
  expect(error).toBeNull();
  for (const c of data!) cats[c.slug] = c;
  expect(cats[SLUG_A] && cats[SLUG_B]).toBeTruthy();

  for (const who of ["editor", "admin", "viewer"]) states[who] = await storageStateFor(browser, who);
});

test.afterAll(async () => {
  const byCaption = await db.from("gallery_images").select("id, storage_path, thumb_path").like("caption", `%${run}%`);
  const byPath = createdPaths.size
    ? await db.from("gallery_images").select("id, storage_path, thumb_path").in("storage_path", [...createdPaths])
    : { data: [] };
  const rows = [...(byCaption.data ?? []), ...(byPath.data ?? [])];
  for (const r of rows) {
    createdPaths.add(r.storage_path);
    if (r.thumb_path) createdPaths.add(r.thumb_path);
  }
  if (rows.length) await db.from("gallery_images").delete().in("id", rows.map((r) => r.id));
  if (createdPaths.size) await bucket().remove([...createdPaths]);
  await db.from("programs").delete().eq("slug", PROGRAM_SLUG());
  if (createdCategorySlugs.size) await db.from("activity_categories").delete().in("slug", [...createdCategorySlugs]);
  if (dir) rmSync(dir, { recursive: true, force: true });
});

test("committee viewer cannot open the gallery or category admin", async ({ browser }) => {
  const page = await pageAs(browser, "viewer");
  await page.goto("/admin/gallery");
  await expect(page).toHaveURL(/\/admin\?denied=1$/);
  await page.goto("/admin/categories");
  await expect(page).toHaveURL(/\/admin\?denied=1$/);
  await page.context().close();
});

test("editor uploads two photos; they appear on the public gallery and activity page with a lightbox", async ({ browser }) => {
  test.slow();
  const files = [await fixture("one.jpg", "E2E ONE", "#0b5d3b"), await fixture("two.jpg", "E2E TWO", "#7c2d12", 1600, 2400)];
  const page = await pageAs(browser, "editor");
  await page.goto("/admin/gallery");

  // Client-side validation: unsupported type is rejected with a Bengali message.
  const txt = path.join(dir, "notes.txt");
  writeFileSync(txt, "hello");
  await page.locator("input[type=file]").setInputFiles([txt]);
  await expect(page.getByText("শুধু JPG, PNG বা WebP ছবি আপলোড করা যাবে")).toBeVisible();

  // Category is required.
  await page.locator("input[type=file]").setInputFiles(files);
  await page.getByRole("button", { name: /আপলোড করুন/ }).click();
  await expect(page.getByText("ক্যাটাগরি (ফোল্ডার) নির্বাচন করুন।")).toBeVisible();

  await page.getByLabel(/ক্যাটাগরি \(ফোল্ডার\)/).selectOption(cats[SLUG_A].id);
  await page.locator('input[id$="-caption"]').fill(mark);
  await page.getByRole("button", { name: /আপলোড করুন/ }).click();
  await expect(page.locator('li[data-status="done"]')).toHaveCount(2, { timeout: 60_000 });
  await expect(page.getByText(/২টি ছবি সফলভাবে যুক্ত হয়েছে/)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const { data: rows } = await db
    .from("gallery_images")
    .select("id, storage_path, thumb_path, width, height, is_published, source, caption")
    .eq("caption", mark)
    .order("created_at", { ascending: false });
  expect(rows).toHaveLength(2);
  for (const r of rows!) {
    createdPaths.add(r.storage_path);
    if (r.thumb_path) createdPaths.add(r.thumb_path);
    expect(r.storage_path).toMatch(new RegExp(`^activities/${SLUG_A}/[0-9a-f-]{36}\\.(webp|jpg)$`));
    expect(r.thumb_path).toBe(r.storage_path.replace(`${SLUG_A}/`, `${SLUG_A}/thumbs/`));
    expect(r.is_published).toBe(true);
    expect(r.source).toBe("upload");
    expect(Math.max(r.width!, r.height!)).toBe(1600);
    expect(await objectExists(r.storage_path)).toBe(true);
    expect(await objectExists(r.thumb_path!)).toBe(true);
  }
  // Selection order is kept (one.jpg is landscape, two.jpg portrait; newest first = first selected).
  expect(rows![0].width).toBe(1600);
  expect(rows![1].height).toBe(1600);
  uploaded = rows!;
  await page.context().close();

  // Public pages (anonymous).
  const pub = await pageAs(browser, null);
  await pub.goto(`/gallery?category=${SLUG_A}`);
  await expect(pub.getByRole("img", { name: mark, exact: true })).toHaveCount(2);
  await expectNoHorizontalOverflow(pub);

  // Lightbox: opens on click, Esc closes it and focus returns to the thumbnail.
  const thumb = pub.getByRole("link", { name: `বড় করে দেখুন: ${mark}` }).first();
  await thumb.click();
  const lightbox = pub.getByRole("dialog", { name: "ছবি বড় করে দেখা" });
  await expect(lightbox).toBeVisible();
  await expect(lightbox.getByText(mark).first()).toBeVisible();
  await pub.keyboard.press("Escape");
  await expect(lightbox).toBeHidden();
  await expect(thumb).toBeFocused();

  await pub.goto(`/activities/${SLUG_A}`);
  await expect(pub.getByRole("img", { name: mark, exact: true })).toHaveCount(2);
  await expect(pub.locator('main a[href^="https://www.facebook.com/sharer"]')).toHaveCount(1);
  await expectNoHorizontalOverflow(pub);
  await pub.context().close();
});

test("uploading with a program links the photos; the edit dialog changes the link", async ({ browser }) => {
  test.slow();
  const programTitle = `ই২ই-গ্যালারি-কর্মসূচি-${run}`;
  const { data: program, error } = await db
    .from("programs")
    .insert({ slug: PROGRAM_SLUG(), category_id: cats[SLUG_A].id, title_bn: programTitle, starts_on: "2026-01-15", is_published: true })
    .select("id, slug")
    .single();
  expect(error).toBeNull();

  const caption = `${mark} কর্মসূচির ছবি`;
  const file = await fixture("program.jpg", "E2E PROGRAM", "#305a44");
  const page = await pageAs(browser, "editor");
  await page.goto("/admin/gallery");
  const programSelect = page.getByLabel(/^কর্মসূচি/);
  await expect(programSelect).toBeDisabled();
  await page.getByLabel(/ক্যাটাগরি \(ফোল্ডার\)/).selectOption(cats[SLUG_B].id);
  await expect(programSelect.locator("option", { hasText: programTitle })).toHaveCount(0);
  await page.getByLabel(/ক্যাটাগরি \(ফোল্ডার\)/).selectOption(cats[SLUG_A].id);
  await programSelect.selectOption({ label: (await programSelect.locator("option", { hasText: programTitle }).textContent()) ?? "" });
  await page.locator('input[id$="-caption"]').fill(caption);
  await page.locator("input[type=file]").setInputFiles([file]);
  await page.getByRole("button", { name: /আপলোড করুন/ }).click();
  await expect(page.locator('li[data-status="done"]')).toHaveCount(1, { timeout: 60_000 });

  const { data: row } = await db.from("gallery_images").select("id, program_id, size_bytes, storage_path, thumb_path").eq("caption", caption).single();
  createdPaths.add(row!.storage_path);
  if (row!.thumb_path) createdPaths.add(row!.thumb_path);
  expect(row!.program_id).toBe(program!.id);
  // Browser compression keeps typical photos around 200 KB.
  expect(row!.size_bytes).toBeLessThanOrEqual(260 * 1024);

  const pub = await pageAs(browser, null);
  await pub.goto(`/programs/${program!.slug}`);
  await expect(pub.getByRole("img", { name: caption, exact: true })).toHaveCount(1);
  // The English program page shows the same photo (captions are Bengali; alt = caption).
  await pub.goto(`/en/programs/${program!.slug}`);
  await expect(pub.locator("html")).toHaveAttribute("lang", "en");
  await expect(pub.getByRole("img", { name: caption, exact: true })).toHaveCount(1);

  // The edit dialog offers this category's programs; choosing none unlinks the photo.
  await page.goto(`/admin/gallery?category=${cats[SLUG_A].id}`);
  const card = page.locator(`li[data-image-id="${row!.id}"]`);
  await expect(card).toContainText(`কর্মসূচি: ${programTitle}`);
  await card.getByRole("button", { name: /সম্পাদনা/ }).click();
  const dialog = page.getByRole("dialog", { name: "ছবি সম্পাদনা" });
  const select = dialog.getByLabel(/^কর্মসূচি/);
  await expect(select).toHaveValue(program!.id);
  await select.selectOption("");
  await dialog.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  await expect(dialog).toBeHidden();
  const { data: after } = await db.from("gallery_images").select("program_id").eq("id", row!.id).single();
  expect(after!.program_id).toBeNull();
  await pub.goto(`/programs/${program!.slug}`);
  await expect(pub.getByRole("img", { name: caption, exact: true })).toHaveCount(0);
  await page.context().close();
  await pub.context().close();
});

test("editing a caption shows publicly; featuring adds it to the homepage slider; unpublishing hides it", async ({ browser }) => {
  const [first] = uploaded;
  const edited = `${mark} সম্পাদিত`;
  const page = await pageAs(browser, "editor");
  await page.goto(`/admin/gallery?category=${cats[SLUG_A].id}`);
  const card = page.locator(`li[data-image-id="${first.id}"]`);
  await card.getByRole("button", { name: /সম্পাদনা/ }).click();
  const dialog = page.getByRole("dialog", { name: "ছবি সম্পাদনা" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel(/^ক্যাপশন/).fill(edited);
  // An out-of-range order is reported once, as a range problem.
  await dialog.getByLabel(/^প্রদর্শন ক্রম/).fill("৯৯৯৯৯৯৯");
  await dialog.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  await expect(dialog.getByText("ক্রম −১০০০০০ থেকে ১০০০০০ এর মধ্যে হতে হবে।")).toHaveCount(1);
  await expect(dialog.getByLabel(/^প্রদর্শন ক্রম/)).toHaveAttribute("aria-invalid", "true");
  await dialog.getByLabel(/^প্রদর্শন ক্রম/).fill("০");
  await dialog.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("পরিবর্তন সংরক্ষিত হয়েছে।")).toBeVisible();

  const pub = await pageAs(browser, null);
  await pub.goto(`/gallery?category=${SLUG_A}`);
  await expect(pub.getByRole("img", { name: edited, exact: true })).toHaveCount(1);

  // Featured → shown in the homepage slider (autoplay control present; absent with reduced motion).
  // Control names start with the photo's position, so a batch with one caption is still distinguishable.
  // "Featured" is called the hero slider (top of the homepage) in the admin.
  const star = card.getByRole("button", { name: /^হিরো স্লাইডারে: ছবি [০-৯]+ \(/ });
  await expect(star).toHaveAttribute("aria-pressed", "false");
  await star.click();
  await expect(star).toHaveAttribute("aria-pressed", "true");
  await pub.goto("/");
  // The hero slider is a labelled carousel region only with 2+ photos, so look inside the hero section.
  const slider = pub.locator('[data-home-section="hero"]');
  await expect(slider.getByRole("img", { name: edited, exact: true })).toHaveCount(1);
  await pub.emulateMedia({ reducedMotion: "reduce" });
  await pub.reload();
  await expect(slider.getByRole("img", { name: edited, exact: true })).toHaveCount(1);
  await expect(slider.getByRole("button", { name: /স্বয়ংক্রিয় স্লাইড/ })).toHaveCount(0);
  await expectNoHorizontalOverflow(pub);

  const toggle = card.getByRole("button", { name: /^প্রকাশিত: ছবি [০-৯]+ \(/ });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  const { data } = await db.from("gallery_images").select("is_published").eq("id", first.id).single();
  expect(data!.is_published).toBe(false);

  await pub.goto(`/gallery?category=${SLUG_A}`);
  await expect(pub.getByRole("img", { name: edited, exact: true })).toHaveCount(0);
  await pub.goto(`/activities/${SLUG_A}`);
  await expect(pub.getByRole("img", { name: edited, exact: true })).toHaveCount(0);
  await pub.goto("/");
  await expect(pub.getByRole("img", { name: edited, exact: true })).toHaveCount(0);
  await page.context().close();
  await pub.context().close();
});

test("an editor cannot overwrite, move or discard a registered photo, or upload to names the server did not issue", async ({ browser }) => {
  const [first] = uploaded;
  const fileId = first.storage_path.split("/").pop()!.replace(/\.(webp|jpg)$/, "");
  const editorDb = await sessionClient("editor");
  const files = editorDb.storage.from("gallery");
  const junk = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#000" } }).webp().toBuffer();

  const upsert = await files.upload(first.thumb_path!, junk, { contentType: "image/webp", upsert: true });
  expect(upsert.error, "upsert over a registered thumbnail").not.toBeNull();
  const move = await files.move(first.storage_path, `activities/${SLUG_A}/${crypto.randomUUID()}.webp`);
  expect(move.error, "move of a registered photo").not.toBeNull();
  const stray = `activities/${SLUG_A}/${crypto.randomUUID()}.webp`;
  createdPaths.add(stray);
  const unreserved = await files.upload(stray, junk, { contentType: "image/webp" });
  expect(unreserved.error, "upload to a name the server did not issue").not.toBeNull();

  // The discard action only releases the caller's own, never-registered uploads.
  const page = await pageAs(browser, "editor");
  await page.goto("/admin/gallery");
  expect(await callAction(page, "discardUploads", [[fileId]])).toContain('"removed":0');
  expect(await objectExists(first.storage_path)).toBe(true);
  expect(await objectExists(first.thumb_path!)).toBe(true);
  const { data: info } = await db.storage.from("gallery").info(first.thumb_path!);
  expect(info?.contentType).toBe("image/webp");
  expect(info?.size).toBeGreaterThan(junk.length);

  // Registering paths that were never reserved fails and deletes nothing.
  const fake = crypto.randomUUID();
  const out = await callAction(page, "registerGalleryImages", [
    {
      categoryId: cats[SLUG_A].id,
      caption: mark,
      eventDate: null,
      publish: true,
      items: [{ path: `activities/${SLUG_A}/${fake}.webp`, thumbPath: `activities/${SLUG_A}/thumbs/${fake}.webp`, width: 10, height: 10 }],
    },
  ]);
  expect(out).toContain("আপলোডের মেয়াদ শেষ হয়ে গেছে");
  await page.context().close();
});

test("changing the category moves both files to the new folder", async ({ browser }) => {
  const second = uploaded[1];
  const page = await pageAs(browser, "editor");
  await page.goto(`/admin/gallery?category=${cats[SLUG_A].id}`);
  await page.locator(`li[data-image-id="${second.id}"]`).getByRole("button", { name: /সম্পাদনা/ }).click();
  const dialog = page.getByRole("dialog", { name: "ছবি সম্পাদনা" });
  await dialog.getByLabel(/^ক্যাটাগরি/).selectOption(cats[SLUG_B].id);
  await expect(dialog.getByText("নতুন ক্যাটাগরির ফোল্ডারে সরানো হবে")).toBeVisible();
  await dialog.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  await expect(dialog).toBeHidden();

  const { data: row } = await db.from("gallery_images").select("category_id, storage_path, thumb_path").eq("id", second.id).single();
  const file = second.storage_path.split("/").pop()!;
  expect(row!.category_id).toBe(cats[SLUG_B].id);
  expect(row!.storage_path).toBe(`activities/${SLUG_B}/${file}`);
  expect(row!.thumb_path).toBe(`activities/${SLUG_B}/thumbs/${file}`);
  createdPaths.add(row!.storage_path);
  createdPaths.add(row!.thumb_path!);
  expect(await objectExists(row!.storage_path)).toBe(true);
  expect(await objectExists(row!.thumb_path!)).toBe(true);
  expect(await objectExists(second.storage_path)).toBe(false);
  expect(await objectExists(second.thumb_path!)).toBe(false);

  // The admin edit dialog shows the new storage path.
  await page.goto(`/admin/gallery?category=${cats[SLUG_B].id}`);
  await page.locator(`li[data-image-id="${second.id}"]`).getByRole("button", { name: /সম্পাদনা/ }).click();
  await expect(page.getByTestId("storage-path")).toHaveText(row!.storage_path);
  await page.context().close();

  const pub = await pageAs(browser, null);
  await pub.goto(`/gallery?category=${SLUG_B}`);
  await expect(pub.getByRole("img", { name: mark, exact: true })).toHaveCount(1);
  await pub.goto(`/gallery?category=${SLUG_A}`);
  await expect(pub.getByRole("img", { name: mark, exact: true })).toHaveCount(0);
  await pub.context().close();
});

test("editor cannot delete (no button, server action and database refuse); admin can", async ({ browser }) => {
  const second = uploaded[1];
  const page = await pageAs(browser, "editor");
  await page.goto(`/admin/gallery?category=${cats[SLUG_B].id}`);
  const card = page.locator(`li[data-image-id="${second.id}"]`);
  await card.getByRole("checkbox").check();
  await expect(page.getByRole("button", { name: "প্রকাশ করুন", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "মুছে ফেলুন", exact: true })).toHaveCount(0);
  await card.getByRole("button", { name: /সম্পাদনা/ }).click();
  const dialog = page.getByRole("dialog", { name: "ছবি সম্পাদনা" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: /মুছে ফেলুন/ })).toHaveCount(0);

  // Calling the server action directly is refused.
  expect(await callAction(page, "deleteGalleryImages", [[second.id]])).toContain("এই কাজের অনুমতি আপনার নেই।");

  // The database and storage refuse too (Row-Level Security), even with the editor's own session.
  const editorDb = await sessionClient("editor");
  const { data: current } = await db.from("gallery_images").select("storage_path").eq("id", second.id).single();
  const { data: removedFiles } = await editorDb.storage.from("gallery").remove([current!.storage_path]);
  expect(removedFiles ?? []).toHaveLength(0);
  expect(await objectExists(current!.storage_path)).toBe(true);
  const { data: deleted } = await editorDb.from("gallery_images").delete().eq("id", second.id).select("id");
  expect(deleted ?? []).toHaveLength(0);
  const { data: still } = await db.from("gallery_images").select("id, storage_path, thumb_path").eq("id", second.id).single();
  expect(still).not.toBeNull();
  await page.context().close();

  // Admin deletes it: row and both files are gone.
  const admin = await pageAs(browser, "admin");
  await admin.goto(`/admin/gallery?category=${cats[SLUG_B].id}`);
  await admin.locator(`li[data-image-id="${second.id}"]`).getByRole("button", { name: /সম্পাদনা/ }).click();
  const adminDialog = admin.getByRole("dialog", { name: "ছবি সম্পাদনা" });
  await adminDialog.getByRole("button", { name: "মুছে ফেলুন" }).click();
  await adminDialog.getByRole("button", { name: "হ্যাঁ, স্থায়ীভাবে মুছুন" }).click();
  await expect(adminDialog).toBeHidden();
  await expect(admin.getByText("ছবিটি স্থায়ীভাবে মুছে ফেলা হয়েছে।")).toBeVisible();
  const { data: gone } = await db.from("gallery_images").select("id").eq("id", second.id);
  expect(gone).toHaveLength(0);
  expect(await objectExists(still!.storage_path)).toBe(false);
  expect(await objectExists(still!.thumb_path!)).toBe(false);
  await admin.context().close();
});

test("folder sync registers a JPEG dropped straight into a category folder", async ({ browser }) => {
  // Storage uploads, server-side image conversion and several page loads: allow for a busy machine.
  test.slow();
  const source = await fixture("dropped.jpg", "DROPPED", "#1e3a8a", 3000, 2000);
  const original = `activities/${SLUG_A}/e2e-${run}.jpg`;
  const { data: up, error } = await bucket().upload(original, readFileSync(source), { contentType: "image/jpeg" });
  expect(error).toBeNull();
  createdPaths.add(original);
  const objectId = (up as { id: string }).id;
  const expectedFull = `activities/${SLUG_A}/${objectId}.webp`;
  const expectedThumb = `activities/${SLUG_A}/thumbs/${objectId}.webp`;
  createdPaths.add(expectedFull);
  createdPaths.add(expectedThumb);

  // A photo one folder down (a whole folder dragged in) is converted into the category folder;
  // a file straight under activities/ cannot be placed and is reported.
  const nested = `activities/${SLUG_A}/e2e-${run}-event/nested.jpg`;
  const { data: nestedUp, error: nestedError } = await bucket().upload(nested, readFileSync(source), { contentType: "image/jpeg" });
  expect(nestedError).toBeNull();
  createdPaths.add(nested);
  const nestedTarget = `activities/${SLUG_A}/${(nestedUp as { id: string }).id}.webp`;
  createdPaths.add(nestedTarget);
  createdPaths.add(nestedTarget.replace(`${SLUG_A}/`, `${SLUG_A}/thumbs/`));
  const rootFile = `activities/e2e-${run}-root.jpg`;
  expect((await bucket().upload(rootFile, readFileSync(source), { contentType: "image/jpeg" })).error).toBeNull();
  createdPaths.add(rootFile);

  // A browser upload still in progress (reserved names, not registered yet) is left alone.
  const editorDb = await sessionClient("editor");
  const { data: reservation, error: reserveError } = await editorDb.rpc("gallery_reserve_uploads", {
    p_category_id: cats[SLUG_A].id,
    p_count: 1,
  });
  expect(reserveError).toBeNull();
  const pendingId = reservation![0].file_id;
  const pendingFull = `activities/${SLUG_A}/${pendingId}.webp`;
  const pendingThumb = `activities/${SLUG_A}/thumbs/${pendingId}.webp`;
  createdPaths.add(pendingFull);
  createdPaths.add(pendingThumb);
  const webp = await sharp(readFileSync(source)).resize(400).webp().toBuffer();
  for (const p of [pendingFull, pendingThumb]) {
    expect((await editorDb.storage.from("gallery").upload(p, webp, { contentType: "image/webp" })).error).toBeNull();
  }

  const page = await pageAs(browser, "editor");
  await page.goto("/admin/gallery");
  await page.getByRole("button", { name: "ফোল্ডার সিঙ্ক করুন" }).click();
  const summary = page.getByTestId("sync-summary");
  await expect(summary).toBeVisible({ timeout: 90_000 });
  await expect(summary).toContainText("সিঙ্ক সম্পন্ন");
  await expect(summary).toContainText(rootFile);
  await expect(summary).toContainText("কোনো ক্যাটাগরি ফোল্ডারের ভেতরে নেই");

  // The nested photo was registered (unpublished) and its original removed.
  const { data: nestedRow } = await db.from("gallery_images").select("source, is_published").eq("storage_path", nestedTarget).single();
  expect(nestedRow).toMatchObject({ source: "sync", is_published: false });
  expect(await objectExists(nested)).toBe(false);

  // The in-progress upload was not taken over; discarding it removes exactly its files.
  const { data: pendingRows } = await db.from("gallery_images").select("id").eq("storage_path", pendingFull);
  expect(pendingRows).toHaveLength(0);
  expect(await callAction(page, "discardUploads", [[pendingId]])).toContain('"removed":2');
  expect(await objectExists(pendingFull)).toBe(false);
  expect(await objectExists(pendingThumb)).toBe(false);

  const { data: row } = await db
    .from("gallery_images")
    .select("id, storage_path, thumb_path, is_published, source, width, height, category_id")
    .eq("storage_path", expectedFull)
    .single();
  expect(row).not.toBeNull();
  expect(row!.source).toBe("sync");
  expect(row!.is_published).toBe(false);
  expect(row!.thumb_path).toBe(expectedThumb);
  expect(row!.category_id).toBe(cats[SLUG_A].id);
  expect(row!.width).toBe(1600);
  expect(Math.abs(row!.height! - 1067)).toBeLessThanOrEqual(1);
  expect(await objectExists(expectedFull)).toBe(true);
  expect(await objectExists(expectedThumb)).toBe(true);
  expect(await objectExists(original)).toBe(false);

  // Unpublished: not visible publicly until an admin publishes it.
  const pub = await pageAs(browser, null);
  await pub.goto(`/gallery?category=${SLUG_A}`);
  await expect(pub.locator(`a[data-photo-id="${row!.id}"]`)).toHaveCount(0);
  await pub.context().close();
  await page.context().close();
});

test("content editor creates, edits and deletes an (inactive) activity category", async ({ browser }) => {
  const slug = `e2e-${run}`.toLowerCase().replace(/[^a-z0-9-]/g, "");
  createdCategorySlugs.add(slug);
  const page = await pageAs(browser, "editor");
  await page.goto("/admin/categories/new");
  await page.getByLabel(/ফোল্ডার নাম/).fill("Bad Slug!");
  await page.getByRole("button", { name: "ক্যাটাগরি তৈরি করুন" }).click();
  await expect(page.locator("#slug-error")).toContainText("ছোট হাতের ইংরেজি অক্ষর");
  await expect(page.locator("#name_bn-error")).toContainText("নাম লিখুন");

  await page.getByLabel(/ফোল্ডার নাম/).fill("volunteering");
  await page.getByLabel(/ক্যাটাগরির নাম/).fill(`${mark} ক্যাটাগরি`);
  await page.getByRole("button", { name: "ক্যাটাগরি তৈরি করুন" }).click();
  await expect(page.locator("#slug-error")).toContainText("ইতিমধ্যে");

  await page.getByLabel(/ফোল্ডার নাম/).fill(slug);
  await page.getByLabel(/^নাম \(ইংরেজি\)/).fill(`E2E ${run} category`);
  await page.getByText("উপহার", { exact: true }).click();
  await page.getByLabel(/সক্রিয় \(ওয়েবসাইটে দেখাবে\)/).uncheck();
  await page.getByRole("button", { name: "ক্যাটাগরি তৈরি করুন" }).click();
  await expect(page).toHaveURL(/\/admin\/categories\/[0-9a-f-]{36}\?created=1$/);
  await expect(page.getByText("নতুন ক্যাটাগরি তৈরি হয়েছে")).toBeVisible();

  const { data: created } = await db.from("activity_categories").select("id, icon, is_active, name_en, summary_en").eq("slug", slug).single();
  expect(created).toMatchObject({ icon: "gift", is_active: false, name_en: `E2E ${run} category`, summary_en: null });

  // Inactive → not public.
  const pub = await pageAs(browser, null);
  const res = await pub.goto(`/activities/${slug}`);
  expect(res?.status()).toBe(404);
  await pub.context().close();

  await page.getByLabel(/ক্যাটাগরির নাম/).fill(`${mark} পরিবর্তিত`);
  await page.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  await expect(page.getByText("পরিবর্তন সংরক্ষিত হয়েছে")).toBeVisible();
  const { data: renamed } = await db.from("activity_categories").select("name_bn").eq("id", created!.id).single();
  expect(renamed!.name_bn).toBe(`${mark} পরিবর্তিত`);

  // Icon / active changes survive a second save without edits (no stale form values).
  const save = async () => {
    const done = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/admin/categories/"));
    await page.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
    await done;
    await expect(page.getByText("পরিবর্তন সংরক্ষিত হয়েছে")).toBeVisible();
  };
  await page.getByText("ট্রফি", { exact: true }).click();
  await page.getByLabel(/সক্রিয় \(ওয়েবসাইটে দেখাবে\)/).check();
  await save();
  await save();
  const { data: twice } = await db.from("activity_categories").select("icon, is_active").eq("id", created!.id).single();
  expect(twice).toEqual({ icon: "trophy", is_active: true });
  await page.getByLabel(/সক্রিয় \(ওয়েবসাইটে দেখাবে\)/).uncheck();
  await save();
  await save();
  const { data: inactive } = await db.from("activity_categories").select("icon, is_active").eq("id", created!.id).single();
  expect(inactive).toEqual({ icon: "trophy", is_active: false });
  await expect(page.getByLabel(/সক্রিয় \(ওয়েবসাইটে দেখাবে\)/)).not.toBeChecked();

  // The cover choice survives a second save too (two registry rows in the new folder; no files needed).
  const coverRows = [1, 2].map((n) => {
    const file = crypto.randomUUID();
    return {
      category_id: created!.id,
      storage_path: `activities/${slug}/${file}.webp`,
      thumb_path: `activities/${slug}/thumbs/${file}.webp`,
      width: 1600,
      height: 1200,
      caption: `${mark} প্রচ্ছদ ${n}`,
      is_published: false,
      source: "upload" as const,
    };
  });
  const { data: coverImages, error: coverError } = await db.from("gallery_images").insert(coverRows).select("id");
  expect(coverError).toBeNull();
  await page.reload();
  const coverRadio = page.locator(`input[name="cover_image_id"][value="${coverImages![1].id}"]`);
  await coverRadio.locator("xpath=..").click();
  await save();
  await save();
  const { data: withCover } = await db.from("activity_categories").select("icon, is_active, cover_image_id").eq("id", created!.id).single();
  expect(withCover).toEqual({ icon: "trophy", is_active: false, cover_image_id: coverImages![1].id });
  await expect(coverRadio).toBeChecked();
  // Only an empty category can be deleted: remove the registry rows again.
  await db.from("gallery_images").delete().in("id", coverImages!.map((r) => r.id));
  await page.reload();

  await page.getByRole("button", { name: "ক্যাটাগরি মুছে ফেলুন" }).click();
  // Initial focus is on the safe choice.
  await expect(page.getByRole("dialog").getByRole("button", { name: "বাতিল" })).toBeFocused();
  await page.getByRole("dialog").getByRole("button", { name: "হ্যাঁ, মুছে ফেলুন" }).click();
  await expect(page).toHaveURL(/\/admin\/categories\?deleted=1$/);
  const { data: after } = await db.from("activity_categories").select("id").eq("slug", slug);
  expect(after).toHaveLength(0);
  await page.context().close();
});

test("public pages: unknown activity is 404 and the activities list shows every active category", async ({ browser }) => {
  const pub = await pageAs(browser, null);
  const res = await pub.goto("/activities/does-not-exist");
  expect(res?.status()).toBe(404);

  const { data: active } = await db.from("activity_categories").select("slug, name_bn").eq("is_active", true);
  await pub.goto("/activities");
  for (const c of active!) {
    await expect(pub.locator(`a[href="/activities/${c.slug}"]`).first()).toContainText(c.name_bn);
  }
  await expectNoHorizontalOverflow(pub);

  // The current filter chip is visible even when it is far down the list (phones scroll the chips).
  await pub.goto(`/gallery?category=${SLUG_B}`);
  const chip = pub.locator(`nav a[aria-current="page"][href="/gallery?category=${SLUG_B}"]`);
  await expect(chip).toBeInViewport({ ratio: 0.9 });
  await expectNoHorizontalOverflow(pub);

  await pub.goto("/gallery?category=no-such-category");
  await expect(pub.getByText("ক্যাটাগরিটি খুঁজে পাওয়া যায়নি")).toBeVisible();
  await pub.context().close();
});
