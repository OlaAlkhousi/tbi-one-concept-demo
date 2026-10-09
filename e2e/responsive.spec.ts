import { expect, test } from "@playwright/test";
import { open } from "./helpers";

for (const route of ["/", "/inbox", "/calendar", "/tasks", "/projects", "/projects/p-vr", "/github", "/knowledge", "/learning", "/logbook", "/hours", "/requests", "/people", "/news", "/settings", "/assistant", "/calendar/m-vr-discussion"]) {
  test(`${route} has no horizontal scroll on a phone`, async ({ page }) => {
    await open(page, route);
    await expect(page.locator("main h1").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("mobile navigation opens from the menu button", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Calendar" }).click();
  await expect(page).toHaveURL(/\/calendar/);
});
