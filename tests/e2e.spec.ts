import { expect, test } from "@playwright/test";

test("loads the first demo case", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("blackbox-tuner demo")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Breakout Entry" })).toBeVisible();
  await expect(page.locator("svg[data-main-chart]")).toBeVisible();
  await expect(page.getByText("Param schema")).toBeVisible();
});
