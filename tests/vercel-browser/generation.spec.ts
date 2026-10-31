import { test, expect } from "@playwright/test";
test("source creation, input, edit, history and persistence through native Vercel route (mock upstream)", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByLabel("What do you want to play?")
    .fill("An orbit painter with a growing circle");
  await page
    .getByRole("button", { name: "Create my game", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Orbit painter", exact: true, level: 1 }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Play game", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause game", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".generated-hud")).toHaveText("Paint0");
  const canvas = page.frameLocator("iframe.code-frame").locator("canvas");
  await canvas.focus();
  await expect(canvas).toBeFocused();
  for (let n = 0; n < 3; n++) {
    await canvas.press("Space", { delay: 80 });
    if (n < 2)
      await expect(page.locator(".generated-hud")).toHaveText(`Paint${n + 1}`);
  }
  await expect(
    page.getByRole("heading", { name: "You did it." }),
  ).toBeVisible();
  await page
    .getByLabel("What would you change?")
    .fill("Change the circle to orange");
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /Version 2/ })).toBeVisible();
  await page.getByRole("button", { name: "View generated source" }).click();
  await expect(page.locator(".source-view")).toContainText("#ff8800");
  await page.getByRole("button", { name: /Version 1/ }).click();
  await expect(page.locator(".source-view")).toContainText("#d8ed83");
  await page.getByRole("button", { name: /Version 2/ }).click();
  await page.getByRole("button", { name: "Save game", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Your library", exact: false }).click();
  await page.getByRole("button", { name: "Open Orbit painter" }).click();
  await expect(
    page.getByRole("button", { name: "Play game", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "docs/screenshots/generated-mobile.png",
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.getByRole("button", { name: "Play game", exact: true }).click();
  const paint = page.getByRole("button", { name: "Paint", exact: true });
  await expect(paint).toBeEnabled();
  await paint.click({ delay: 120 });
  await expect(page.locator(".generated-hud")).toContainText("1");
  expect(errors).toEqual([]);
});
test("native route method and origin guards", async ({ request }) => {
  expect((await request.get("/api/generate")).status()).toBe(405);
  expect(
    (
      await request.post("/api/generate", {
        headers: { Origin: "https://evil.test" },
        data: { prompt: "any game" },
      })
    ).status(),
  ).toBe(403);
});
test("native HTTP response flushes progress before Google completes (mock upstream)", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/x-ndjson",
      },
      body: JSON.stringify({ prompt: "Transport regression fixture" }),
    });
    const reader = response.body!.getReader(),
      decoder = new TextDecoder();
    const first = decoder.decode((await reader.read()).value);
    let rest = "";
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      rest += decoder.decode(part.value);
    }
    return { type: response.headers.get("content-type"), first, rest };
  });
  expect(result.type).toContain("application/x-ndjson");
  expect(result.first).toContain('"type":"progress"');
  expect(result.first).not.toContain('"type":"result"');
  expect(result.rest).toContain('"type":"result"');
});
