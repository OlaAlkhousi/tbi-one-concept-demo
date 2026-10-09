import { expect, test } from "@playwright/test";
import { askAssistant, open, switchUser } from "./helpers";

test.describe("Demo A — meeting to GitHub issue", () => {
  test("turns a meeting summary into reviewed tasks and simulated issues", async ({ page }) => {
    await open(page, "/calendar/m-vr-discussion");
    await expect(page.getByRole("heading", { name: "VR Equipment Lending — Project Discussion" })).toBeVisible();

    await page.getByTestId("generate-plan").click();
    const suggestions = page.getByTestId("plan-suggestion");
    await expect(suggestions).toHaveCount(4);

    // Edit the prototype suggestion before confirming.
    const prototype = suggestions.nth(3);
    await prototype.getByTestId("suggestion-title").fill("Prepare the working VR lending prototype for Facility Services");
    await page.getByTestId("create-plan").click();

    const created = page.getByTestId("plan-created");
    await expect(created).toBeVisible();
    await expect(created).toContainText("Prepare the working VR lending prototype for Facility Services");

    // The task shows up in My Tasks …
    await page.goto("/tasks");
    await expect(page.getByTestId("task-row").filter({ hasText: "Prepare the working VR lending prototype" })).toBeVisible();
    // … as a simulated GitHub issue …
    await page.goto("/github");
    await page.getByRole("tab", { name: /issues/i }).click();
    await expect(page.getByTestId("issue-row").filter({ hasText: "Prepare the working VR lending prototype" })).toBeVisible();
    // … and in the dashboard activity feed.
    await page.goto("/");
    await expect(page.getByTestId("activity-feed")).toContainText("follow-up task");
  });
});

test.describe("Demo B — intelligent morning overview", () => {
  test("adapts to the persona and gives grounded priorities", async ({ page }) => {
    await open(page);
    await expect(page.getByTestId("greeting")).toContainText("Ola");
    await expect(page.getByTestId("briefing")).toBeVisible();

    await switchUser(page, "u-daan");
    await expect(page.getByTestId("greeting")).toContainText("Daan");
    await expect(page.getByRole("link", { name: "Work Logbook" })).toBeVisible();

    const answer = await askAssistant(page, "What should I focus on today?");
    await expect(answer).toContainText("focus on today");
    await expect(answer.getByRole("link").first()).toBeVisible(); // source cards

    await switchUser(page, "u-sanne");
    await expect(page.getByRole("link", { name: "Work Logbook" })).toHaveCount(0);
    await expect(page.locator("[data-widget=approvals]")).toBeVisible();
  });
});

test.describe("Demo C — permission request", () => {
  test("restricted project → request → manager approves → access", async ({ page }) => {
    await open(page, "/projects/p-smart");
    await expect(page.getByTestId("restricted-notice")).toBeVisible();
    await expect(page.getByText("Alarm routing")).toHaveCount(0); // no restricted content leaks

    await page.getByRole("button", { name: "Request access" }).click();
    await page.getByLabel("Why do you need access?").fill("I want to understand the sensor data model for my internship project.");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText(/Request pending/)).toBeVisible();

    await switchUser(page, "u-sanne");
    await page.goto("/requests");
    const row = page.getByTestId("request-row").filter({ hasText: "Ola" });
    await expect(row).toContainText("Smart Building Platform");
    await row.getByTestId("approve-request").click();

    await switchUser(page, "u-ola");
    await page.goto("/projects/p-smart");
    await expect(page.getByTestId("restricted-notice")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Smart Building Platform" })).toBeVisible();
    await page.getByTestId("notifications").click();
    await expect(page.getByText("Access granted")).toBeVisible();
  });
});

test.describe("Demo D — logbook generation", () => {
  test("generates an editable weekly summary and saves it", async ({ page }) => {
    await open(page, "/logbook");
    const before = await page.getByTestId("logbook-entry").count();
    await page.getByTestId("generate-summary").click();
    await expect(page.getByText(/Hours come only from your hours registration/)).toBeVisible();
    await page.getByTestId("save-summary").click();
    await expect(page.getByTestId("logbook-entry")).toHaveCount(before + 1);
    await expect(page.getByTestId("logbook-entry").first()).toContainText("Week report");
  });
});

test.describe("Demo E — AI project recommendations", () => {
  test("turns an evidence-based suggestion into a task", async ({ page }) => {
    await open(page, "/projects/p-vr?tab=insights");
    await page.getByTestId("generate-insights").click();
    const card = page.getByTestId("insight-card").first();
    await expect(card).toBeVisible();
    await expect(card).toContainText(/evidence/i);
    const title = await card.locator("h3").first().innerText();
    await card.getByTestId("insight-create-task").click();
    await page.getByRole("button", { name: "Create task" }).click();
    await expect(page.getByText("Task created").first()).toBeVisible();
    await page.goto("/tasks");
    await expect(page.getByTestId("task-row").first()).toBeVisible();
    expect(title.length).toBeGreaterThan(5);
  });
});
