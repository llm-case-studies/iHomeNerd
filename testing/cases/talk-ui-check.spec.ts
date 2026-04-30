import { test, expect } from "@playwright/test";

const ME21_URL = process.env.IHN_WEB_URL || "https://192.168.0.246:17777";

test.describe("ME-21 Talk Panel UI", () => {
  test("Command Center loads and Talk tab is visible", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto(ME21_URL, { waitUntil: "networkidle" });

    // Wait for the app to render
    await page.waitForSelector("#root", { timeout: 10000 });

    // Take screenshot of initial state (Chat tab default)
    await page.screenshot({ path: "../results/me21-chat-tab.png", fullPage: true });

    // Find and click the Talk tab (uses Mic icon from lucide-react)
    const talkTab = page.locator("nav button").filter({ has: page.locator("svg") }).nth(1);
    await talkTab.click();
    await page.waitForTimeout(1000);

    // Take screenshot of Talk tab
    await page.screenshot({ path: "../results/me21-talk-tab.png", fullPage: true });

    // Check for ASR backend selectors
    const asrLabel = page.locator("text=ASR:").first();
    const asrLabelVisible = await asrLabel.isVisible().catch(() => false);

    // Check for backend selector dropdown
    const backendSelector = page.locator("select").filter({ hasText: /Moonshine|Auto|Backend/i });
    const backendSelectorCount = await backendSelector.count();

    // Check for language selector
    const langSelector = page.locator("select").filter({ hasText: /English|Español|Language/i });
    const langSelectorCount = await langSelector.count();

    // Check for mode selector
    const modeSelector = page.locator("select").filter({ hasText: /Fast|Balanced|Mode/i });
    const modeSelectorCount = await modeSelector.count();

    // Check for mic button
    const micButton = page.locator("button").filter({ has: page.locator("svg") }).last();
    const micVisible = await micButton.isVisible().catch(() => false);

    console.log(JSON.stringify({
      asrLabelVisible,
      backendSelectorCount,
      langSelectorCount,
      modeSelectorCount,
      micVisible,
      pageErrors: errors.length,
      url: page.url(),
    }, null, 2));

    // Extract text content for detailed reporting
    const mainText = await page.locator("main").textContent();
    console.log("MAIN_TEXT:", mainText?.substring(0, 1500));

    // List all select options
    const selects = page.locator("select");
    const selectCount = await selects.count();
    for (let i = 0; i < selectCount; i++) {
      const options = await selects.nth(i).locator("option").allTextContents();
      console.log(`SELECT_${i}:`, options.join(" | "));
    }

    // Find ASR-related elements
    const asrTexts = await page.locator("text=/ASR|Backend|Language|whisper|Moonshine/i").allTextContents();
    console.log("ASR_TEXTS:", asrTexts.map(t => t.trim()).slice(0, 20));

    // Attach console errors to test output
    if (errors.length > 0) {
      console.log("CONSOLE ERRORS:", errors);
    }

    // The bare minimum: page should load
    await expect(page.locator("#root")).toBeAttached();
  });
});
