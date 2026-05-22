import { expect, test } from "@playwright/test";

test("loads the first demo case", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("blackbox-tuner demo")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fast Convergence" })).toBeVisible();
});
