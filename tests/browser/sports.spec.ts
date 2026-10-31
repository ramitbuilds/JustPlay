import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
async function boot(page: Page, sport: string, health?: number) {
  await page.goto(
    `/tests/harness.html?sport=${sport}${health ? `&health=${health}` : ""}`,
  );
  await page.waitForFunction(
    () => !!window.runtime?.scene.player && !!window.runtime.scene.sport,
  );
  await page.locator("canvas").focus();
  await page.evaluate(() => window.runtime.scene.start());
}
test("basketball scores through charged ballistic shots, wins and restarts", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await boot(page, "basketball");
  await page.evaluate(() => {
    const s = window.runtime.scene;
    setInterval(() => {
      const c = s.sport!;
      if (s.status.state !== "playing") return;
      if (c.phase === "waiting") s.controls.jump = true;
      else if (c.phase === "charging" && c.charge >= c.targetPower)
        s.controls.jump = false;
    }, 5);
  });
  await page.waitForFunction(
    () => window.runtime.scene.status.score >= 2,
    {},
    { timeout: 10000 },
  );
  await page
    .locator("canvas")
    .screenshot({ path: "docs/screenshots/game-basketball.png" });
  await page.waitForFunction(
    () => window.runtime.scene.status.state !== "playing",
    {},
    { timeout: 25000 },
  );
  expect(await page.evaluate(() => window.runtime.scene.status.state)).toBe(
    "won",
  );
  expect(
    await page.evaluate(() => window.runtime.scene.status.score),
  ).toBeGreaterThanOrEqual(10);
  await page.evaluate(() => window.runtime.scene.scene.restart());
  await page.waitForFunction(
    () => window.runtime.scene.status.state === "ready",
  );
  expect(await page.evaluate(() => window.runtime.scene.status.score)).toBe(0);
  expect(errors).toEqual([]);
});
test("basketball misses cost a try and can lose", async ({ page }) => {
  await boot(page, "basketball", 1);
  await page.keyboard.down("Space");
  await page.waitForTimeout(100);
  await page.keyboard.up("Space");
  await page.waitForFunction(
    () => window.runtime.scene.status.state === "lost",
    {},
    { timeout: 7000 },
  );
  expect(await page.evaluate(() => window.runtime.scene.status.health)).toBe(0);
});
test("cricket timed swings score boundaries, win and restart", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await boot(page, "cricket");
  await page.evaluate(() => {
    const s = window.runtime.scene;
    setInterval(() => {
      const c = s.sport!;
      if (s.status.state !== "playing") return;
      s.controls.jump =
        c.phase === "incoming" && c.ball.x < 196 && c.ball.x > 170;
    }, 5);
  });
  await page.waitForFunction(
    () => window.runtime.scene.status.score >= 4,
    {},
    { timeout: 6000 },
  );
  await page
    .locator("canvas")
    .screenshot({ path: "docs/screenshots/game-cricket.png" });
  await page.waitForFunction(
    () => window.runtime.scene.status.state !== "playing",
    {},
    { timeout: 18000 },
  );
  expect(await page.evaluate(() => window.runtime.scene.status.state)).toBe(
    "won",
  );
  expect(
    await page.evaluate(() => window.runtime.scene.status.score),
  ).toBeGreaterThanOrEqual(12);
  await page.evaluate(() => window.runtime.scene.scene.restart());
  await page.waitForFunction(
    () => window.runtime.scene.status.state === "ready",
  );
  expect(await page.evaluate(() => window.runtime.scene.status.score)).toBe(0);
  expect(errors).toEqual([]);
});
test("cricket missed deliveries cost wickets and can lose", async ({
  page,
}) => {
  await boot(page, "cricket", 1);
  await page.waitForFunction(
    () => window.runtime.scene.status.state === "lost",
    {},
    { timeout: 6000 },
  );
  expect(await page.evaluate(() => window.runtime.scene.status.health)).toBe(0);
});
test("mobile sports controls charge a shot and fit the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Play Court Craft", exact: true })
    .click();
  await page.getByRole("button", { name: "Play game", exact: true }).click();
  const button = page.getByRole("button", { name: "charge shot", exact: true });
  await expect(button).toBeVisible();
  const box = await button.boundingBox();
  if (!box) throw new Error("Missing shot control");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(300);
  expect(
    await page
      .getByRole("meter", { name: "Shot power" })
      .evaluate((e) => (e as HTMLMeterElement).value),
  ).toBeGreaterThan(0);
  await page.mouse.up();
  await page.screenshot({
    path: "docs/screenshots/basketball-mobile.png",
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});

test("basketball green-band assistance works at the lowest aim angle", async ({
  page,
}) => {
  await boot(page, "basketball");
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(() => window.runtime.scene.sport!.aim <= 45);
  await page.keyboard.up("ArrowRight");
  await page.evaluate(() => {
    const s = window.runtime.scene;
    setInterval(() => {
      const c = s.sport!;
      if (s.status.score > 0 || s.status.state !== "playing") return;
      if (c.phase === "waiting") s.controls.jump = true;
      else if (c.phase === "charging" && c.charge >= c.targetPower + 0.02)
        s.controls.jump = false;
    }, 5);
  });
  await page.waitForFunction(
    () => window.runtime.scene.status.score >= 2,
    {},
    { timeout: 8000 },
  );
  expect(await page.evaluate(() => window.runtime.scene.status.health)).toBe(6);
});
