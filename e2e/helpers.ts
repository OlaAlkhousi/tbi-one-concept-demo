import { expect, type Page } from "@playwright/test";

/** Each test gets a fresh browser context, so localStorage is empty and the demo is freshly seeded. */
export async function open(page: Page, path = "/") {
  await page.goto(path);
  await expect(page.getByText("Preparing your workspace…")).toHaveCount(0);
}

export async function switchUser(page: Page, id: "u-ola" | "u-daan" | "u-sanne" | "u-marco") {
  await page.getByTestId("user-switcher").click();
  await page.getByTestId(`switch-${id}`).click();
  await expect(page.getByTestId("greeting")).toBeVisible();
}

export async function askAssistant(page: Page, question: string) {
  if (!(await page.getByTestId("assistant-input").isVisible())) await page.getByTestId("assistant-toggle").click();
  const before = await page.getByTestId("assistant-answer").count();
  await page.getByTestId("assistant-input").fill(question);
  await page.getByTestId("assistant-input").press("Enter");
  await expect(page.getByTestId("assistant-answer")).toHaveCount(before + 1);
  return page.getByTestId("assistant-answer").last();
}
