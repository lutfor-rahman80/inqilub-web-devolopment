import { test, expect } from "@playwright/test";

test.describe("Seerat Quiz Pages", () => {
  test("student quiz page loads successfully", async ({ page }) => {
    await page.goto("/quiz/student.html");
    await expect(page).toHaveTitle(/সীরাত কুইজ/);
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible();
  });

  test("native admin quiz page requires an admin sign-in", async ({ page }) => {
    await page.goto("/admin/quiz");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("the old static admin URL redirects to the native admin page", async ({ page }) => {
    const response = await page.request.get("/quiz/index.html", { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers()["location"]).toBe("/admin/quiz");
  });
});
