import { expect, test } from "@playwright/test";
import { open } from "./helpers";

const routes = ["/", "/inbox", "/calendar", "/tasks", "/projects", "/github", "/knowledge", "/learning", "/logbook", "/hours", "/requests", "/people", "/news", "/settings", "/assistant"];

test("every module loads without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  for (const r of routes) {
    await page.goto(r);
    await expect(page.locator("main h1").first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("sidebar navigation works", async ({ page }) => {
  await open(page);
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Projects" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByTestId("project-card").first()).toBeVisible();
});

test("global search finds connected records and respects permissions", async ({ page }) => {
  await open(page);
  await page.keyboard.press("Control+k");
  await page.getByTestId("command-input").fill("VR lending");
  const results = page.getByTestId("search-result");
  await expect(results.filter({ hasText: "VR Equipment Lending Service" })).toBeVisible();
  await expect(results.filter({ hasText: "Equipment Lending Procedure" })).toBeVisible();
  await expect(results.filter({ hasText: "VR Equipment Lending — Project Discussion" })).toBeVisible();

  await page.getByTestId("command-input").fill("segmentation");
  await expect(results).toHaveCount(0);
});

test("completing a task updates the dashboard", async ({ page }) => {
  await open(page, "/tasks");
  const row = page.getByTestId("task-row").filter({ hasText: "Write unit tests for the project markdown generator" });
  await row.getByTestId("task-toggle").click();
  await page.goto("/");
  await expect(page.getByTestId("activity-feed")).toContainText("completed Write unit tests");
});

test("hours are calculated and totalled", async ({ page }) => {
  await open(page, "/hours");
  const total = page.getByTestId("week-total");
  const before = await total.innerText();
  await page.getByTestId("add-hours").click();
  await page.getByTestId("hours-start").fill("09:00");
  await page.getByTestId("hours-end").fill("12:30");
  await page.getByTestId("hours-break").fill("15");
  await page.getByTestId("hours-description").fill("Pair programming on the availability check");
  await page.getByTestId("hours-save").click();
  await expect(total).not.toHaveText(before);
  await expect(page.getByTestId("hours-row").filter({ hasText: "Pair programming" })).toContainText("3:15");
});

test("the assistant does not reveal restricted content", async ({ page }) => {
  await open(page);
  await page.getByTestId("assistant-toggle").click();
  await page.getByTestId("assistant-input").fill("What is the progress of the Smart Building Platform?");
  await page.getByTestId("assistant-input").press("Enter");
  const answer = page.getByTestId("assistant-answer").last();
  await expect(answer).toContainText("restricted");
  await expect(answer).not.toContainText("Alarm routing");
});

test("demo data can be reset", async ({ page }) => {
  await open(page, "/tasks");
  await page.getByTestId("task-row").filter({ hasText: "Write unit tests" }).getByTestId("task-toggle").click();
  await page.goto("/settings");
  await page.getByTestId("reset-demo").click();
  await page.getByTestId("confirm-reset").click();
  await page.goto("/tasks");
  await expect(page.getByTestId("task-row").filter({ hasText: "Write unit tests" }).getByTestId("task-toggle")).not.toBeChecked();
});
