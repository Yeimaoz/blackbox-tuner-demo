import { expect, test } from "@playwright/test";

test("loads the first demo case", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("blackbox-tuner demo")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Breakout Entry" })).toBeVisible();
  await expect(page.locator("svg[data-main-chart]")).toBeVisible();
  await expect(page.getByText("Param schema")).toBeVisible();
  await expect(page.getByText("Current trial")).toBeVisible();
  await expect(page.getByText("trial / search progress")).toBeVisible();
  await expect(page.getByText("objective score (higher is better)")).toBeVisible();
});

/**
 * Regression gate for the trialToX denominator bug (High finding).
 *
 * Before the fix: trialToX(lastTrial, events.length) placed the last circle
 * at ~183 px — well within the left third of the 70–410 px chart width.
 * After the fix: trialToX(lastTrial, trialCount) places it near 410 px.
 *
 * We drive the animation to completion (click Play, wait, then assert), then
 * read the cx attribute of the last circle and verify it is in the right half
 * of the chart (> 300 px).
 */
test("last trial circle is in the right half of the chart after full playback", async ({ page }) => {
  await page.goto("/");

  // Step through all events using the Step button to avoid timing issues.
  // breakout_entry has 34 events; stepping 40 times guarantees completion.
  const stepButton = page.locator("[data-step]");
  for (let i = 0; i < 40; i++) {
    await stepButton.click();
  }

  // The last completed-trial circle should now be visible.
  const circles = page.locator("svg[data-main-chart] circle");
  const lastCircle = circles.last();
  await expect(lastCircle).toBeVisible();

  const cxRaw = await lastCircle.getAttribute("cx");
  const cx = parseFloat(cxRaw ?? "0");

  // Chart x-axis runs from 70 (trial 0) to 410 (last trial).
  // With a correct denominator the last data point must be in the right half.
  // With the buggy denominator (events.length = 34) the last circle landed
  // at ~183 px; this assertion would fail in that case.
  expect(cx).toBeGreaterThan(300);
});
