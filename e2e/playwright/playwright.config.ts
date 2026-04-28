/* eslint-disable @typescript-eslint/no-var-requires */
// Scaffold only — install first:  npm i -D @playwright/test && npx playwright install chromium
//
// To run once installed:
//   npx playwright test -c e2e/playwright/playwright.config.ts

// @ts-ignore — @playwright/test is not a hard dependency yet.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { outputFolder: "report" }]],
  use: {
    baseURL: process.env.CM_E2E_BASE_URL ?? "http://localhost:8080",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
