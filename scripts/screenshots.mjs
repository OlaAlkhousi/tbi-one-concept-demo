// Captures the README screenshots from a running server.
// Usage: npm run dev (port 3100) in one terminal, then: node scripts/screenshots.mjs
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const base = process.env.BASE_URL ?? "http://localhost:3100";
const out = "docs/screenshots";
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "msedge" });

async function shoot(name, path, { scheme = "light", width = 1440, height = 900, before } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, timezoneId: "Europe/Amsterdam", locale: "en-GB", deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(base + path);
  await page.getByText("Preparing your workspace…").waitFor({ state: "detached" });
  if (before) await before(page);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/${name}.png` });
  await context.close();
  console.log("saved", name);
}

await shoot("dashboard-light", "/");
await shoot("dashboard-dark", "/", { scheme: "dark" });
await shoot("action-plan", "/calendar/m-vr-discussion", {
  before: async (p) => {
    await p.getByTestId("generate-plan").click();
    await p.getByTestId("plan-suggestion").first().waitFor();
  },
});
await shoot("project-insights", "/projects/p-vr?tab=insights", {
  before: async (p) => {
    await p.getByTestId("generate-insights").click();
    await p.getByTestId("insight-card").first().waitFor();
  },
});
await shoot("assistant", "/", {
  before: async (p) => {
    await p.getByTestId("assistant-toggle").click();
    await p.getByTestId("assistant-input").fill("What happened during yesterday's project meeting?");
    await p.getByTestId("assistant-input").press("Enter");
    await p.getByTestId("assistant-answer").first().waitFor();
  },
});
await shoot("restricted", "/projects/p-smart");
await shoot("inbox", "/inbox?m=msg-3", { scheme: "dark" });
await shoot("calendar", "/calendar");
await shoot("hours", "/hours");
await shoot("logbook", "/logbook");
await shoot("mobile", "/", { width: 390, height: 844 });

await browser.close();
