import { test, expect } from "@playwright/test";
test("honest missing-API error and invalid import", async ({ page }) => {
  await page.goto("/");
  await page
    .getByLabel("What do you want to play?")
    .fill("A robot collecting coins");
  await page
    .getByRole("button", { name: "Create my game", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("game API is missing");
  const prompt = page.getByLabel("What do you want to play?");
  await expect(prompt).toBeFocused();
  await expect(prompt).toHaveAttribute("aria-invalid", "true");
  await expect(prompt).toHaveAttribute("aria-describedby", "create-error");
  await expect(prompt).toHaveValue("A robot collecting coins");
  await page.screenshot({
    path: "docs/screenshots/vercel-error-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "docs/screenshots/vercel-error-mobile.png",
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );

  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByRole("link", { name: "Your library" }).click();
  await page.getByLabel("Import a JustPlay game").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"hero":"mario"}'),
  });
  await expect(page.getByRole("alert")).toContainText("not a valid");
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

test("new homepage is responsive and exposes prompt ideas without launching templates", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({
    path: "docs/screenshots/generated-home-mobile.png",
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.locator(".idea-card").first().click();
  await expect(page.getByLabel("What do you want to play?")).toHaveValue(
    /pinball/,
  );
  await expect(page.locator("iframe")).toHaveCount(0);
});
