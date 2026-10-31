import { test, expect } from "@playwright/test";
test("creates all three families and edits through the real Vercel HTTP entry point", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const ideas = [
    ["A fox in a forest platformer", "Crystalwood"],
    ["A neon cyberpunk runner", "Neon Drift"],
    ["A dungeon survival game", "The Last Lantern"],
  ];
  for (const [index, [prompt, title]] of ideas.entries()) {
    await page.getByLabel("What do you want to play?").fill(prompt);
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/generate") && r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Create my game", exact: true })
      .click();
    const api = await response;
    expect(api.status()).toBe(200);
    expect(api.headers()["content-type"]).toContain("application/json");
    await expect(
      page.getByRole("heading", { level: 1, name: title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Play game", exact: true }),
    ).toBeVisible();
    if (index === 0) {
      await page.getByLabel("What would you change?").fill("Make it harder");
      await page
        .getByRole("button", { name: "Apply changes", exact: true })
        .click();
      await expect(page.getByText("Difficulty 3/5")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Version 2", exact: false }),
      ).toBeVisible();
    }
    await page.getByRole("link", { name: "Create another world" }).click();
    await expect(page.getByLabel("What do you want to play?")).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test("method and origin guards return JSON from the native route", async ({
  request,
}) => {
  const get = await request.get("/api/generate");
  expect(get.status()).toBe(405);
  expect(await get.json()).toMatchObject({ error: "Use POST for generation." });
  const blocked = await request.post("/api/generate", {
    headers: { Origin: "https://evil.test" },
    data: { prompt: "A fox game" },
  });
  expect(blocked.status()).toBe(403);
});
