import { test, expect } from "@playwright/test";
import { game } from "../code-fixture";
test("generation has honest estimated progress, elapsed time, skeletons and a completed handoff", async ({
  page,
}) => {
  let finish!: () => void;
  const ready = new Promise<void>((resolve) => (finish = resolve));
  await page.route("**/api/generate", async (route) => {
    await ready;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ game }),
    });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/");
  await expect(page.locator(".hero-art")).toHaveCount(0);
  await expect(page.getByText("MVP · Early access")).toBeVisible();
  await page
    .getByLabel("What do you want to play?")
    .fill("A circle painting game");
  await page
    .getByRole("button", { name: "Create my game", exact: true })
    .click();
  const panel = page.getByRole("region", { name: "Game generation progress" });
  await expect(panel).toBeVisible();
  await expect(panel.locator(".skeleton-canvas")).toBeVisible();
  await page.clock.fastForward(30000);
  const progress = page.getByRole("progressbar", {
    name: "Estimated generation progress",
  });
  expect(Number(await progress.getAttribute("aria-valuenow"))).toBeGreaterThan(
    6,
  );
  expect(Number(await progress.getAttribute("aria-valuenow"))).toBeLessThan(
    100,
  );
  await expect(panel).toContainText("0:30 elapsed");
  await expect(panel).toContainText("estimates, not exact AI measurements");
  await page.screenshot({
    path: "docs/screenshots/generation-progress-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await panel.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "docs/screenshots/generation-progress-mobile.png",
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.clock.fastForward(150000);
  await expect(panel).toContainText("Longer than the usual estimate");
  expect(Number(await progress.getAttribute("aria-valuenow"))).toBeLessThan(
    100,
  );
  finish();
  await expect(page.locator(".studio h1")).toHaveText(game.title);
  await expect(panel).toHaveCount(0);
  await expect(page.locator(".mvp-notice")).toContainText(
    "Rules, visuals or controls may be imperfect",
  );
  await expect(
    page.getByRole("button", { name: "Play game", exact: true }),
  ).toBeVisible();
});
test("a failed generation removes progress and keeps the prompt editable", async ({
  page,
}) => {
  await page.route("**/api/generate", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Google is temporarily unavailable. Please retry.",
      }),
    }),
  );
  await page.goto("/");
  const prompt = page.getByLabel("What do you want to play?");
  await prompt.fill("A moon puzzle");
  await page
    .getByRole("button", { name: "Create my game", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "temporarily unavailable",
  );
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(prompt).toBeEnabled();
  await expect(prompt).toHaveValue("A moon puzzle");
});
