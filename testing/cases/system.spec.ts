import { test, expect } from "@playwright/test";

test.describe("System panel", () => {
  test("system panel renders when tab selected", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /System/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator("main")).not.toBeEmpty();
  });

  test("system panel shows health info", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /System/i }).click();
    await page.waitForTimeout(1000);

    const main = page.locator("main");
    const hasStats = await main.getByText(/ok/i).isVisible({ timeout: 2000 }).catch(() => false);
    const hasHealth = await main.getByText(/health/i).isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasStats || hasHealth).toBeTruthy();
  });

  test("system panel shows no hard errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.getByRole("button", { name: /System/i }).click();
    await page.waitForTimeout(2000);

    expect(errors).toEqual([]);
  });
});

test.describe("Investigate panel", () => {
  test("investigate panel renders", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Investigate/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator("main")).not.toBeEmpty();
  });
});

test.describe("Build panel", () => {
  test("builder panel renders", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Builder/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator("main")).not.toBeEmpty();
  });
});

test.describe("Agents panel", () => {
  test("agents panel renders", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Agents/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator("main")).not.toBeEmpty();
  });
});
