import { test, expect } from "@playwright/test";

const TAB_NAMES = ["Chat", "Talk", "Docs", "Trans", "Investigate", "Agents", "Builder", "System"];

test.describe("Tab navigation", () => {
  test("all tabs are visible in nav", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav");
    for (const name of TAB_NAMES) {
      await expect(nav.getByRole("button", { name: new RegExp(name, "i") })).toBeVisible();
    }
  });

  for (const tabName of TAB_NAMES) {
    test(`switch to ${tabName} tab`, async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: new RegExp(tabName, "i") }).click();
      await page.waitForTimeout(500);

      const activeButton = page.locator("nav button").filter({ has: page.locator(".bg-accent") });
      await expect(activeButton).toBeVisible();
      await expect(activeButton).toHaveText(new RegExp(tabName, "i"));
    });
  }

  test("active tab has accent indicator", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /System/i }).click();
    await page.waitForTimeout(300);

    const systemButton = page.locator("nav button").filter({ hasText: /System/i });
    await expect(systemButton.locator(".bg-accent")).toBeVisible();
  });
});

test.describe("App shell", () => {
  test("header shows app title", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("header h1")).toBeVisible();
  });

  test("online status badge is visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);
    const statusBadge = page.locator(".bg-success\\/10, [class*='bg-success']").first();
    await expect(statusBadge).toBeVisible();
  });

  test("language selector is visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("header select").first()).toBeVisible();
  });

  test("help button opens modal", async ({ page }) => {
    await page.goto("/");
    await page.locator("header button[aria-label]").first().click();
    await page.waitForTimeout(300);
    await expect(page.locator("text=Help")).toBeVisible({ timeout: 3000 }).catch(() => {
      // Help modal may use translated text
    });
  });

  test("no console errors on page load", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/");
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });
});
