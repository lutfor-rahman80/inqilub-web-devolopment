import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Browser, BrowserContextOptions, Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { msLeftInStep, totp } from "./totp";

/**
 * Shared admin sign-in for e2e tests, including two-step login (TOTP).
 *
 *   import { loginAs, storageStateFor } from "./helpers/login";
 *   await loginAs(page, "super");                       // signs this page's context in, lands on /admin
 *   const ctx = await browser.newContext({ storageState: await storageStateFor(browser, "editor") });
 *
 * Super admins must complete a second step (authenticator code). For the
 * seeded super@test.local the helper makes sure a verified TOTP factor with a
 * known test secret exists (directly in the local database, via psql) and
 * then answers the challenge page with the current code. Any other account
 * that has enrolled a factor is handled the same way (its secret is read from
 * the local database); an account that is asked to enrol is enrolled through
 * the page itself (the secret shown for manual entry is used).
 *
 * Signed-in states are cached in the OS temp folder for 15 minutes (the Auth
 * server rate-limits sign-ins per IP and several suites share it), and
 * re-created when they no longer open /admin/account.
 */

export type Who = "super" | "admin" | "secretary" | "editor" | "viewer";

export const TEST_PASSWORD = "Test@12345";
export const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const DB_URL = process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const STATE_DIR = path.join(tmpdir(), "inqilab-e2e-auth");
const STATE_MAX_AGE_MS = 15 * 60_000;

/** Test-only secret for the seeded super admin's authenticator (local database only). */
export const E2E_TOTP_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const E2E_FACTOR_NAME = "e2e-test-authenticator";

export const emailFor = (who: Who | string) => (who.includes("@") ? who : `${who}@test.local`);

function sqlEmail(email: string): string {
  if (!/^[a-z0-9._+-]+@[a-z0-9.-]+$/i.test(email)) throw new Error(`Unexpected test email: ${email}`);
  return `'${email.toLowerCase()}'`;
}

function psql(sql: string): string {
  return execFileSync("psql", [DB_URL, "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", sql], {
    encoding: "utf8",
    env: { ...process.env, PGCONNECT_TIMEOUT: "10" },
  }).trim();
}

export type TotpFactor = { id: string; secret: string };

/** Verified TOTP factors of an account (local database), oldest first. */
export function verifiedTotpFactors(email: string): TotpFactor[] {
  const out = psql(
    `select f.id || '|' || f.secret from auth.mfa_factors f join auth.users u on u.id = f.user_id
     where lower(u.email) = ${sqlEmail(email)} and f.factor_type = 'totp' and f.status = 'verified' and f.secret is not null
     order by f.created_at, f.id`,
  );
  return out
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [id, secret] = line.split("|");
      return { id, secret };
    });
}

/**
 * Makes sure the account has a verified authenticator factor and returns the
 * factors. When it has none, one with E2E_TOTP_SECRET is created (idempotent;
 * safe when several workers race).
 */
export function ensureTotpFactor(email: string): TotpFactor[] {
  const existing = verifiedTotpFactors(email);
  if (existing.length) return existing;
  psql(
    `insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret)
     select gen_random_uuid(), u.id, '${E2E_FACTOR_NAME}', 'totp', 'verified', now(), now(), '${E2E_TOTP_SECRET}'
     from auth.users u
     where lower(u.email) = ${sqlEmail(email)}
       and not exists (select 1 from auth.mfa_factors f where f.user_id = u.id and f.factor_type = 'totp' and f.status = 'verified')
     on conflict do nothing`,
  );
  return verifiedTotpFactors(email);
}

/** The current code for a secret; waits for the next 30-s step when the current one is about to end. */
export async function currentTotp(secret: string): Promise<string> {
  const left = msLeftInStep();
  if (left < 2500) await new Promise((r) => setTimeout(r, left + 200));
  return totp(secret);
}

/** Answers the two-step page (/admin/login/mfa): a challenge, or a forced enrolment. Returns the secret used. */
export async function completeMfa(page: Page, email: string): Promise<string> {
  const root = page.locator("[data-mfa-mode]");
  await root.waitFor({ timeout: 30_000 });
  const mode = await root.getAttribute("data-mfa-mode");

  let secret: string;
  if (mode === "enrol") {
    await page.getByTestId("mfa-start").click();
    const shown = page.getByTestId("totp-secret");
    await shown.waitFor({ timeout: 30_000 });
    secret = ((await shown.textContent()) ?? "").replace(/\s+/g, "");
  } else {
    const factors = verifiedTotpFactors(email);
    if (!factors.length) throw new Error(`No verified authenticator for ${email} in the local database`);
    const select = page.locator("select#factor");
    let factor = factors[0];
    if (await select.count()) {
      const values = await select.locator("option").evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
      factor = factors.find((f) => values.includes(f.id)) ?? factor;
      await select.selectOption(factor.id);
    }
    secret = factor.secret;
  }

  await page.fill("#code", await currentTotp(secret));
  await Promise.all([
    page.waitForURL((u) => u.pathname.startsWith("/admin") && !u.pathname.startsWith("/admin/login"), { timeout: 30_000 }),
    page.getByTestId("mfa-submit").click(),
  ]);
  return secret;
}

/**
 * Signs in through the login page (and the two-step page when asked) and
 * waits until an admin page is shown.
 */
export async function signInUi(page: Page, email: string, password = TEST_PASSWORD): Promise<void> {
  // The seeded super admin always has its known test factor (never a random one enrolled by a test).
  if (email.toLowerCase() === "super@test.local") ensureTotpFactor(email);
  await page.goto("/admin/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await Promise.all([
    page.waitForURL((u) => u.pathname !== "/admin/login", { timeout: 30_000 }),
    page.click("button[type=submit]"),
  ]);
  if (new URL(page.url()).pathname.startsWith("/admin/login/mfa")) await completeMfa(page, email);
}

function stateFile(who: string): string {
  mkdirSync(STATE_DIR, { recursive: true });
  return path.join(STATE_DIR, `${who.replace(/[^a-z0-9@._-]/gi, "_")}.json`);
}

async function stateWorks(browser: Browser, file: string, options: BrowserContextOptions): Promise<boolean> {
  const ctx = await browser.newContext({ ...options, baseURL: options.baseURL ?? BASE_URL, storageState: file });
  try {
    const page = await ctx.newPage();
    await page.goto("/admin/account");
    return new URL(page.url()).pathname === "/admin/account";
  } catch {
    return false;
  } finally {
    await ctx.close();
  }
}

/**
 * Path of a signed-in storage state for an account (seeded role name or an
 * email). Reused for 15 minutes while it still works.
 */
export async function storageStateFor(
  browser: Browser,
  who: Who | string,
  { password = TEST_PASSWORD, baseURL = BASE_URL }: { password?: string; baseURL?: string } = {},
): Promise<string> {
  const email = emailFor(who);
  const file = stateFile(email);
  if (existsSync(file) && Date.now() - statSync(file).mtimeMs < STATE_MAX_AGE_MS && (await stateWorks(browser, file, { baseURL }))) {
    return file;
  }
  const ctx = await browser.newContext({ baseURL });
  try {
    const page = await ctx.newPage();
    await signInUi(page, email, password);
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    await ctx.storageState({ path: tmp });
    renameSync(tmp, file); // atomic: parallel workers never read a half-written file
  } finally {
    await ctx.close();
  }
  return file;
}

/**
 * Signs the page's browser context in as the account (cookies from the cached
 * state) and opens /admin. Works for every seeded role, including the super
 * admin with two-step login.
 */
export async function loginAs(page: Page, who: Who | string, options: { password?: string } = {}): Promise<void> {
  const file = await storageStateFor(page.context().browser()!, who, options);
  const state = JSON.parse(readFileSync(file, "utf8")) as { cookies: Parameters<ReturnType<Page["context"]>["addCookies"]>[0] };
  await page.context().clearCookies();
  await page.context().addCookies(state.cookies);
  await page.goto("/admin");
  if (new URL(page.url()).pathname.startsWith("/admin/login")) {
    // The cached state stopped working in between: sign in directly.
    await signInUi(page, emailFor(who), options.password);
    await page.context().storageState({ path: file });
  }
}

/**
 * For API-level tests: upgrades a supabase-js client that signed in with a
 * password to a two-step (aal2) session, using the account's factor from the
 * local database (created for super@test.local when missing).
 */
export async function verifyClientMfa(client: SupabaseClient, email: string): Promise<void> {
  const factors = email.toLowerCase() === "super@test.local" ? ensureTotpFactor(email) : verifiedTotpFactors(email);
  if (!factors.length) return;
  const { data } = await client.auth.mfa.listFactors();
  const factor = factors.find((f) => data?.totp.some((t) => t.id === f.id)) ?? factors[0];
  const { error } = await client.auth.mfa.challengeAndVerify({ factorId: factor.id, code: await currentTotp(factor.secret) });
  if (error) throw new Error(`MFA verification failed for ${email}: ${error.message}`);
}

/** Removes a stale cached state (e.g. after changing the account's password). */
export function forgetState(who: Who | string): void {
  const file = stateFile(emailFor(who));
  if (existsSync(file)) writeFileSync(file, JSON.stringify({ cookies: [], origins: [] }));
}
