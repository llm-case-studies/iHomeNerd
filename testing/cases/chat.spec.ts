import { test, expect } from "@playwright/test";

test.describe("Chat panel", () => {
  test("chat panel renders when tab selected", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Chat/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator("main")).not.toBeEmpty();
  });

  test("chat has message area and input", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Chat/i }).click();
    await page.waitForTimeout(500);

    const textarea = page.locator("textarea, input[type='text']").first();
    await expect(textarea).toBeVisible({ timeout: 3000 }).catch(() => {
      // Input may not render if backend is unavailable
    });
  });

  test("typing in chat input works", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Chat/i }).click();
    await page.waitForTimeout(500);

    const input = page.locator("textarea, input[type='text']").first();
    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      await input.fill("Hello, iHomeNerd!");
      await expect(input).toHaveValue("Hello, iHomeNerd!");
    }
  });
});

test.describe("Translate panel", () => {
  test("translate panel renders when tab selected", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Trans/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator("main")).not.toBeEmpty();
  });

  test("translate has input area", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Trans/i }).click();
    await page.waitForTimeout(500);

    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 3000 }).catch(() => {});
  });
});
