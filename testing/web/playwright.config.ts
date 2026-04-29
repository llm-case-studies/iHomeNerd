import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "../cases",
  outputDir: "../results",

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ["html", { outputFolder: "../results/playwright-report" }],
    ["list"],
  ],

  use: {
    baseURL: process.env.IHN_WEB_URL || "http://localhost:3000",
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
