import { test, expect } from "@playwright/test";
import type { createRuntime } from "../../src/game/runtime";
declare global {
  interface Window {
    runtime: ReturnType<typeof createRuntime>;
  }
}
async function boot(page: import("@playwright/test").Page, index: number) {
  await page.goto(`/tests/harness.html?game=${index}`);
  await page.waitForFunction(() => !!window.runtime?.scene.player);
  await page.locator("canvas").focus();
  await page.evaluate(() => window.runtime.scene.start());
}
test("platformer physics, collection, double jump, collisions, win, loss and restart", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await boot(page, 0);
  await page.waitForTimeout(250);
  const initial = await page.evaluate(() => window.runtime.scene.player.y);
  await page.evaluate(() => (window.runtime.scene.soundEnabled = true));
  await page.keyboard.down("Space");
  await page.waitForTimeout(60);
  await page.keyboard.up("Space");
  await page.waitForTimeout(200);
  const first = await page.evaluate(() => window.runtime.scene.player.y);
  expect(first).toBeLessThan(initial - 20);
  expect(await page.evaluate(() => window.runtime.scene.audio?.state)).toBe(
    "running",
  );
  await page.keyboard.down("Space");
  await page.waitForTimeout(60);
  await page.keyboard.up("Space");
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => window.runtime.scene.jumps)).toBe(2);
  await page.waitForTimeout(1000);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(1000);
  await page.keyboard.up("ArrowRight");
  expect(
    await page.evaluate(() => window.runtime.scene.status.score),
  ).toBeGreaterThan(0);
  await page.screenshot({ path: "docs/screenshots/game-platformer.png" });
  // Stage physical overlaps at controlled coordinates to assert actual collision outcomes.
  await page.evaluate(() => {
    const s = window.runtime.scene;
    const enemy =
      s.enemies.getChildren()[0] as import("phaser").Physics.Arcade.Sprite;
    s.player.setPosition(enemy.x, enemy.y);
    s.player.setVelocity(0);
    s.lastDamage = -10000;
  });
  await page.waitForTimeout(100);
  expect(
    await page.evaluate(() => window.runtime.scene.status.health),
  ).toBeLessThan(5);
  await page.evaluate(() => {
    const s = window.runtime.scene;
    s.enemies.clear(true, true);
    s.player.setPosition(70, 285);
    s.status.score = s.spec.goal;
  });
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(1000);
  await page.keyboard.up("ArrowRight");
  expect(await page.evaluate(() => window.runtime.scene.status.state)).toBe(
    "playing",
  );
  await page.evaluate(() => {
    const s = window.runtime.scene;
    s.player.setPosition(s.worldWidth - 110, 285);
  });
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.runtime.scene.status.state)).toBe(
    "won",
  );
  await page.evaluate(() => window.runtime.scene.scene.restart());
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.runtime.scene.status.score)).toBe(0);
  expect(await page.evaluate(() => window.runtime.scene.status.health)).toBe(5);
  await page.evaluate(() => {
    const s = window.runtime.scene;
    s.start();
    s.status.health = 1;
    s.lastDamage = -10000;
    const enemy =
      s.enemies.getChildren()[0] as import("phaser").Physics.Arcade.Sprite;
    s.player.setPosition(enemy.x, enemy.y);
  });
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.runtime.scene.status.state)).toBe(
    "lost",
  );
  expect(errors).toEqual([]);
});
test("platformer completes its full route with collected crystals", async ({
  page,
}) => {
  await boot(page, 0);
  await page.evaluate(() => {
    const s = window.runtime.scene;
    s.controls.right = true;
    window.setInterval(() => {
      const enemy = s.enemies.getChildren().find((e) => {
        const p = e as import("phaser").Physics.Arcade.Sprite;
        return p.x > s.player.x && p.x - s.player.x < 70;
      });
      s.controls.jump = !!enemy;
    }, 25);
  });
  await page.waitForFunction(
    () => window.runtime.scene.status.state !== "playing",
    {},
    { timeout: 20000 },
  );
  expect(await page.evaluate(() => window.runtime.scene.status.state)).toBe(
    "won",
  );
  expect(
    await page.evaluate(() => window.runtime.scene.status.score),
  ).toBeGreaterThanOrEqual(10);
});
test("runner completes the full route through input and increases speed", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await boot(page, 1);
  const startSpeed = await page.evaluate(() => window.runtime.scene.spec.speed);
  // Drive touch-equivalent controls before each real obstacle.
  await page.evaluate(() => {
    const s = window.runtime.scene;
    window.setInterval(() => {
      if (s.status.state !== "playing") return;
      const next = 400 + Math.max(0, Math.ceil((s.player.x - 370) / 340)) * 340;
      s.controls.jump = next - s.player.x < 95 && next - s.player.x > 10;
    }, 25);
  });
  await page.waitForTimeout(3500);
  expect(
    await page.evaluate(() => window.runtime.scene.player.body!.velocity.x),
  ).toBeGreaterThan(startSpeed);
  await page.screenshot({ path: "docs/screenshots/game-runner.png" });
  await page.waitForFunction(
    () => window.runtime.scene.status.state !== "playing",
    {},
    { timeout: 20000 },
  );
  expect(await page.evaluate(() => window.runtime.scene.status.state)).toBe(
    "won",
  );
  expect(errors).toEqual([]);
});
test("survival movement, automatic projectiles, enemy chase and full win", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await boot(page, 2);
  await page.keyboard.down("ArrowRight");
  await expect
    .poll(() => page.evaluate(() => window.runtime.scene.player.x))
    .toBeGreaterThan(360);
  await page.keyboard.up("ArrowRight");
  await page.screenshot({ path: "docs/screenshots/game-survival.png" });
  // Keep moving around an open arena; no teleportation or state mutation.
  await page.evaluate(() => {
    const s = window.runtime.scene;
    let tick = 0;
    window.setInterval(() => {
      tick++;
      s.controls.right = tick % 16 < 4;
      s.controls.down = tick % 16 >= 4 && tick % 16 < 8;
      s.controls.left = tick % 16 >= 8 && tick % 16 < 12;
      s.controls.up = tick % 16 >= 12;
    }, 350);
  });
  await page.waitForFunction(
    () => window.runtime.scene.status.state !== "playing",
    {},
    { timeout: 25000 },
  );
  expect(await page.evaluate(() => window.runtime.scene.status.state)).toBe(
    "won",
  );
  expect(await page.evaluate(() => window.runtime.scene.status.score)).toBe(12);
  expect(errors).toEqual([]);
});
