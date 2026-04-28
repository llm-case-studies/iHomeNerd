import { test, expect } from "@playwright/test";

test.describe("Command Center smoke", () => {
  test("page loads and shows title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/iHomeNerd/);
  });

  test("root element is present", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#root")).toBeAttached();
  });

  test("page does not show hard errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.waitForTimeout(2000);

    expect(errors).toEqual([]);
  });
});
