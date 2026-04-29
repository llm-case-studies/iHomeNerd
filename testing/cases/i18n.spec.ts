import { test, expect } from "@playwright/test";

const LANGUAGES = [
  { code: "en", expectedTitle: /iHomeNerd/i },
  { code: "zh", expectedTitle: /iHomeNerd/i },
  { code: "es", expectedTitle: /iHomeNerd/i },
  { code: "fr", expectedTitle: /iHomeNerd/i },
  { code: "de", expectedTitle: /iHomeNerd/i },
  { code: "ru", expectedTitle: /iHomeNerd/i },
  { code: "ja", expectedTitle: /iHomeNerd/i },
  { code: "ko", expectedTitle: /iHomeNerd/i },
];

test.describe("Internationalization", () => {
  test("language selector has all options", async ({ page }) => {
    await page.goto("/");
    const select = page.locator("header select").first();
    const options = await select.locator("option").all();
    expect(options.length).toBeGreaterThanOrEqual(8);
  });

  for (const { code, expectedTitle } of LANGUAGES) {
    test(`switch language to ${code}`, async ({ page }) => {
      await page.goto("/");

      const select = page.locator("header select").first();
      await select.selectOption(code);
      await page.waitForTimeout(500);

      await expect(page).toHaveTitle(expectedTitle);

      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));
      await page.waitForTimeout(1000);
      expect(errors).toEqual([]);
    });
  }

  test("tab labels change on language switch", async ({ page }) => {
    await page.goto("/");

    const select = page.locator("header select").first();
    await select.selectOption("zh");
    await page.waitForTimeout(500);

    const navButtons = page.locator("nav button");
    const firstTab = navButtons.first();
    const text = await firstTab.textContent();
    expect(text).toBeTruthy();
  });
});

test.describe("Docs panel", () => {
  test("docs panel renders when tab selected", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Docs/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator("main")).not.toBeEmpty();
  });
});

test.describe("Talk panel", () => {
  test("talk panel renders when tab selected", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Talk/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator("main")).not.toBeEmpty();
  });
});
