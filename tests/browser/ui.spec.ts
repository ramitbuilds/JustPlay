import { test, expect } from "@playwright/test";
test("landing, studio, edits, versions, save/reopen and library deletion", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your imagination, playable." }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/home-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Play Crystalwood example" }).click();
  await expect(
    page.getByRole("button", { name: "Play game", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/studio-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Play game", exact: true }).click();
  const canvas = page.locator("canvas");
  await canvas.focus();
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(1300);
  await page.keyboard.up("ArrowRight");
  await expect(page.getByTestId("score")).not.toHaveText("0");
  await page.getByRole("button", { name: "Pause game", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Make it harder", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await expect(page.getByText("Difficulty 3/5")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Version 2", exact: false }),
  ).toBeVisible();
  for (const change of [
    "Add flying enemies",
    "Change to nighttime",
    "Give me a double jump",
  ]) {
    await page.getByRole("button", { name: change, exact: true }).click();
    await page
      .getByRole("button", { name: "Apply changes", exact: true })
      .click();
  }
  await expect(
    page.getByRole("button", { name: "Version 5", exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save game", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Your library", exact: false }).click();
  await expect(
    page.getByRole("heading", { name: "Crystalwood", exact: true, level: 2 }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/library-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open Crystalwood" }).click();
  await expect(page.getByText("Difficulty 3/5")).toBeVisible();
  await page.getByRole("link", { name: "Your library", exact: false }).click();
  await page.getByRole("button", { name: "Delete Crystalwood" }).click();
  await page.getByRole("button", { name: "Delete game", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Room for your first world." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("honest missing-proxy error and invalid import", async ({ page }) => {
  await page.goto("/");
  await page
    .getByLabel("What do you want to play?")
    .fill("A robot collecting coins");
  await page
    .getByRole("button", { name: "Create my game", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("proxy is unavailable");
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByRole("link", { name: "Your library" }).click();
  await page.getByLabel("Import a JustPlay game").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"hero":"mario"}'),
  });
  await expect(page.getByRole("alert")).toContainText("not a valid");
});
test("mobile homepage and touch player fit 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({
    path: "docs/screenshots/home-mobile.png",
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page
    .getByRole("button", { name: "Play Neon Drift", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Play game", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Play game", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "jump", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/studio-mobile.png",
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});
test("corrupt saves are skipped without hiding valid saves", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("justplay", 1);
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains("games"))
          r.result.createObjectStore("games", { keyPath: "id" });
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction("games", "readwrite");
      t.objectStore("games").put({ id: "broken", versions: [] });
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
    db.close();
  });
  await page.getByRole("link", { name: "Your library" }).click();
  await expect(
    page.getByText("1 damaged save was skipped.", { exact: false }),
  ).toBeVisible();
});

test("touch movement works, fullscreen rejection stays nonblocking, and editing keys stay in textareas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Play Crystalwood example" }).click();
  await page.getByRole("button", { name: "Play game", exact: true }).click();
  const right = page.getByRole("button", { name: "right", exact: true });
  const box = await right.boundingBox();
  if (!box) throw new Error("Missing right touch control");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1200);
  await page.mouse.up();
  await expect(page.getByTestId("score")).not.toHaveText("0");
  await page.evaluate(() => {
    Element.prototype.requestFullscreen = async () => {
      throw new Error("Unavailable");
    };
  });
  await page.getByRole("button", { name: "Toggle fullscreen" }).click();
  await expect(
    page.getByText("Fullscreen is unavailable. You can keep playing here."),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Let’s reload" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Pause game" })).toBeEnabled();
  const edit = page.getByLabel("What would you change?");
  await edit.fill("");
  await edit.pressSequentially("a small woodland");
  await expect(edit).toHaveValue("a small woodland");
});

test("mocked AI creation and editing exercise the actual studio request flow", async ({
  page,
}) => {
  const { examples } = await import("../../src/fixtures");
  let creates = 0,
    edits = 0;
  await page.route("**/api/generate", async (route) => {
    const data = route.request().postDataJSON();
    const spec = data.current
      ? { ...data.current, difficulty: 4 }
      : examples[creates++].spec;
    if (data.current) edits++;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ spec }),
    });
  });
  await page.goto("/");
  for (const example of examples) {
    await page.getByLabel("What do you want to play?").fill(example.prompt);
    await page
      .getByRole("button", { name: "Create my game", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: example.label, exact: true, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Play game", exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("What would you change?")
      .fill("Make this harder, preserving the theme");
    await page
      .getByRole("button", { name: "Apply changes", exact: true })
      .click();
    await expect(page.getByText("Difficulty 4/5")).toBeVisible();
    await page.getByRole("link", { name: "Create another world" }).click();
    await expect(
      page.getByRole("heading", { name: "Your imagination, playable." }),
    ).toBeVisible();
  }
  expect(creates).toBe(3);
  expect(edits).toBe(3);
});
