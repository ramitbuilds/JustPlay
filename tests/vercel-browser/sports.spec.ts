import { test, expect } from "@playwright/test";
test.use({
  extraHTTPHeaders: { "x-vercel-forwarded-for": "sports-regression-client" },
});
test("cricket and basketball prompts produce distinct native AI designs and editable games", async ({
  page,
}) => {
  await page.goto("/");
  for (const [sport, title] of [
    ["cricket", "Midsummer Sixes"],
    ["basketball", "Court Craft"],
  ]) {
    await page
      .getByLabel("What do you want to play?")
      .fill(`Create a ${sport} game`);
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/generate") && r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Create my game", exact: true })
      .click();
    const data = await (await response).json();
    expect(data.spec.genre).toBe(sport);
    await expect(
      page.getByRole("heading", { name: title, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Play game", exact: true }),
    ).toBeVisible();
    await page.getByLabel("What would you change?").fill("Make it harder");
    await page
      .getByRole("button", { name: "Apply changes", exact: true })
      .click();
    await expect(page.getByText("Difficulty 3/5")).toBeVisible();
    await page.getByRole("link", { name: "Create another world" }).click();
  }
  await page.getByLabel("What do you want to play?").fill("A chess game");
  await page
    .getByRole("button", { name: "Create my game", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("not supported yet");
});
