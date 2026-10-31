import { test, expect } from "@playwright/test";
import { engineGame } from "../engine-fixture";
test("mobile can hold drive and steer together with real multitouch input", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/generate", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ game: engineGame }),
    }),
  );
  await page.goto("/");
  await page.getByLabel("What do you want to play?").fill("Input test");
  await page
    .getByRole("button", { name: "Create my game", exact: true })
    .click();
  await page.getByRole("button", { name: "Play game", exact: true }).click();
  const drive = page.getByRole("button", { name: "Drive", exact: true }),
    steer = page.getByRole("button", { name: "Steer left", exact: true });
  await expect(drive).toBeEnabled();
  await drive.scrollIntoViewIfNeeded();
  const a = await drive.boundingBox(),
    b = await steer.boundingBox();
  if (!a || !b) throw Error("Controls missing");
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 2,
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: a.x + a.width / 2, y: a.y + a.height / 2, id: 1 },
      { x: b.x + b.width / 2, y: b.y + b.height / 2, id: 2 },
    ],
  });
  await expect
    .poll(async () =>
      Number(
        (await page.locator(".generated-hud").textContent())?.match(
          /Distance([\d.]+)/,
        )?.[1] ?? 0,
      ),
    )
    .toBeGreaterThan(10);
  await expect
    .poll(async () =>
      Number(
        (await page.locator(".generated-hud").textContent())?.match(
          /Lane(-?[\d.]+)/,
        )?.[1] ?? 0,
      ),
    )
    .toBeLessThan(-10);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.screenshot({
    path: "docs/screenshots/working-mobile-controls.png",
    fullPage: true,
  });
});
