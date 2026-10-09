import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests for the five demo workflows.
 *
 * Locally this reuses a running dev server (npm run dev) or starts one. Set
 * PW_CHANNEL=chromium after `npx playwright install chromium` to use Playwright's own
 * browser; by default it uses the Microsoft Edge that ships with Windows.
 */
const port = Number(process.env.PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;
const channel = process.env.PW_CHANNEL ?? (process.env.CI ? "chromium" : "msedge");

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    timezoneId: "Europe/Amsterdam",
    locale: "en-GB",
    channel: channel === "chromium" ? undefined : channel,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, channel: channel === "chromium" ? undefined : channel } },
    { name: "mobile", testMatch: /responsive\.spec\.ts/, use: { ...devices["Pixel 7"], channel: channel === "chromium" ? undefined : channel } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: process.env.CI ? `npm run start -- -p ${port}` : `npm run dev -- -p ${port}`,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
