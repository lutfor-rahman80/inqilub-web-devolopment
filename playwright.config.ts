import { defineConfig, devices } from "@playwright/test";

// Expects the app on BASE_URL (default: a running `npm run dev` on :3000)
// and local Supabase (`npx supabase start`) with the seed data.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    locale: "bn-BD",
    timezoneId: "Asia/Dhaka",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
