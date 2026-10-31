import { test, expect } from "@playwright/test";
import { game } from "../code-fixture";
import type { CodeGame } from "../../src/code-game";
declare global {
  interface Window {
    runProbe: (game: CodeGame) => Promise<void>;
  }
}
async function check(page: import("@playwright/test").Page, code: string) {
  await page.goto("/tests/code-harness.html");
  await page.waitForFunction(() => !!window.runProbe);
  return page.evaluate(
    async (game) => {
      try {
        await window.runProbe(game);
        return "passed";
      } catch (error) {
        return String(error);
      }
    },
    { ...game, runtimeVersion: undefined, code },
  );
}
test("runs arbitrary mechanics and preserves literal source replacement characters", async ({
  page,
}) => {
  const result = await check(
    page,
    game.code.replace(
      "const color='#d8ed83';",
      () =>
        "const color='#d8ed83'; const literal='$&'; if(literal.length!==2)throw Error('source corrupted');",
    ),
  );
  expect(result).toBe("passed");
});
test("generated worker cannot access network, parent DOM or origin storage", async ({
  page,
}) => {
  const blocked = `function createGame({ctx}) { if(typeof fetch!=='undefined'||typeof WebSocket!=='undefined'||typeof Worker!=='undefined'||typeof indexedDB!=='undefined'||typeof document!=='undefined'||typeof parent!=='undefined')throw Error('ambient capability exposed'); return {update(){},render(){ctx.fillRect(0,0,800,450);}}; }`;
  expect(await check(page, blocked)).toBe("passed");
});
test("terminates an infinite loop without freezing the application page", async ({
  page,
}) => {
  expect(
    await check(
      page,
      "function createGame(){while(true){} return {update(){},render(){}};}",
    ),
  ).toContain("worker was terminated");
  await expect(page.locator("#result")).toHaveText("ready");
  expect(await page.locator("iframe").count()).toBe(0);
});
test("rejects runtime errors and cleans the validation frame", async ({
  page,
}) => {
  expect(
    await check(
      page,
      'function createGame(){return {update(){throw Error("broken update");},render(){}};}',
    ),
  ).toContain("broken update");
  expect(await page.locator("iframe").count()).toBe(0);
});
test("runs with the deployed CSP intersection and blocks dynamic evaluation", async ({
  page,
}) => {
  const { default: config } = await import("../../vercel.json", {
    with: { type: "json" },
  });
  const policy = config.headers[0].headers.find(
    (h) => h.key === "Content-Security-Policy",
  )!.value;
  // Fulfill the bootstrap too: routed document responses have no loopback address-space metadata.
  await page.route("**/sandbox.js", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response });
  });
  await page.route("**/sandbox.html", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), "Content-Security-Policy": policy },
    });
  });
  const code = game.code.replace(
    "let count=0;",
    () =>
      `let count=0; try { Function('return 1')(); throw Error('dynamic evaluation allowed'); } catch(error) { if(error.message==='dynamic evaluation allowed') throw error; }`,
  );
  expect(await check(page, code)).toBe("passed");
});
test("renders reusable 2D sprites and verifies independent controls with prerequisite input", async ({
  page,
}) => {
  const { engineGame } = await import("../engine-fixture");
  await page.goto("/tests/code-harness.html");
  await page.waitForFunction(() => !!window.runProbe);
  const result = await page.evaluate(async (game) => {
    try {
      await window.runProbe(game);
      return "passed";
    } catch (error) {
      return String(error);
    }
  }, engineGame);
  expect(result).toBe("passed");
});
test("rejects a decorative button that never changes actual game state", async ({
  page,
}) => {
  const { engineGame } = await import("../engine-fixture");
  const broken = {
    ...engineGame,
    code: engineGame.code.replace(
      "if(input.keys.KeyA&&input.keys.KeyW)lane-=dt*100;",
      "",
    ),
  };
  await page.goto("/tests/code-harness.html");
  await page.waitForFunction(() => !!window.runProbe);
  const result = await page.evaluate(async (game) => {
    try {
      await window.runProbe(game);
      return "passed";
    } catch (error) {
      return String(error);
    }
  }, broken);
  expect(result).toContain("KeyA did not change lane");
});
