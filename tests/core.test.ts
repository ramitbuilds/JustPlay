import { describe, it, expect, vi } from "vitest";
import { examples, editFixture } from "../src/fixtures";
import { parseModelSpec, validateSpec } from "../src/spec";
import { compose } from "../src/game/level";
import { createProvider } from "../src/server/providers";
import { onRequest, type Env } from "../functions/api/generate";
import { game, source, patch } from "./code-fixture";
const spec = examples[0].spec;
describe("validated game design", () => {
  it("accepts all three distinct fixtures and deterministic geometry", () => {
    const levels = examples.map((e) => compose(validateSpec(e.spec)));
    expect(new Set(examples.map((e) => e.spec.genre)).size).toBe(3);
    expect(levels[0]).toEqual(compose(spec));
    expect(levels[1].obstacles.length).toBeGreaterThan(0);
    expect(levels[2].width).toBe(640);
    for (const e of examples) {
      const l = compose(e.spec);
      expect(l.coins.every((c) => c.x > 60 && c.x < l.width)).toBe(true);
      if (e.spec.genre !== "survival") expect(l.platforms[0].w).toBe(l.width);
    }
  });
  it.each([
    { ...spec, hero: "mario" },
    { ...spec, seed: -1 },
    { ...spec, speed: 10000 },
    { ...spec, mechanics: { ...spec.mechanics, flight: true } },
    { ...spec, enemies: ["slime", "slime"] },
    {
      ...examples[2].spec,
      mechanics: { doubleJump: false, dash: false, shooting: false },
    },
  ])("rejects invalid design %#", (raw) =>
    expect(() => validateSpec(raw)).toThrow(),
  );
  it("only accepts bounded complete JSON, including a single markdown fence", () => {
    expect(
      parseModelSpec("```json\n" + JSON.stringify(spec) + "\n```"),
    ).toEqual(spec);
    expect(() => parseModelSpec("not JSON")).toThrow();
    expect(() => parseModelSpec("x".repeat(16001))).toThrow();
  });
  it.each([
    "make it harder",
    "add flying enemies",
    "change to nighttime",
    "give me a double jump",
  ])("edits a fixture while preserving unrelated data: %s", (instruction) => {
    const base = {
      ...spec,
      mechanics: { ...spec.mechanics, doubleJump: false },
    };
    const result = editFixture(base, instruction);
    expect(result.title).toBe(spec.title);
    expect(result.seed).toBe(spec.seed);
    expect(result.genre).toBe(spec.genre);
    if (instruction.includes("harder"))
      expect(result.difficulty).toBe(spec.difficulty + 1);
    if (instruction.includes("flying")) expect(result.enemies).toContain("bat");
    if (instruction.includes("nighttime")) expect(result.night).toBe(true);
    if (instruction.includes("double"))
      expect(result.mechanics.doubleJump).toBe(true);
  });
});
describe("source providers", () => {
  it("passes arbitrary requests unchanged and requests source without preset schema", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({ choices: [{ message: { content: source } }] }),
      );
    const provider = createProvider(
      { AI_PROVIDER: "groq", GROQ_API_KEY: "test" },
      fetcher,
    );
    expect(
      await provider.generateGame("A magnetic pottery puzzle on Mars"),
    ).toEqual(game);
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(JSON.parse(body.messages[1].content).request).toBe(
      "A magnetic pottery puzzle on Mars",
    );
    expect(body.response_format).toBeUndefined();
    expect(body.include_reasoning).toBe(false);
    expect(body.max_completion_tokens).toBeLessThanOrEqual(5400);
  });
  it("applies exact AI source edits preserving unrelated logic", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        choices: [{ message: { content: JSON.stringify(patch) } }],
      }),
    );
    const result = await createProvider(
      { AI_PROVIDER: "groq", GROQ_API_KEY: "test" },
      fetcher,
    ).editGame(game, "Change the ball to orange");
    expect(result.code).toBe(game.code.replace("#d8ed83", "#ff8800"));
    expect(game.code).toContain("#d8ed83");
  });
  it("uses Gemini native source output", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        candidates: [{ content: { parts: [{ text: source }] } }],
      }),
    );
    expect(
      await createProvider(
        { AI_PROVIDER: "gemma", GEMINI_API_KEY: "test" },
        fetcher,
      ).generateGame("an orbit painter"),
    ).toEqual(game);
    expect(fetcher.mock.calls[0][0]).toContain(
      "gemma-4-26b-a4b-it:generateContent",
    );
    const init = fetcher.mock.calls[0][1],
      body = JSON.parse(init.body);
    expect(init.headers["x-goog-api-key"]).toBe("test");
    expect(init.headers.Authorization).toBeUndefined();
    expect(body.messages).toBeUndefined();
    expect(body.systemInstruction.parts[0].text).toContain("createGame");
    expect(JSON.parse(body.contents[0].parts[0].text).request).toBe(
      "an orbit painter",
    );
    expect(body.generationConfig.thinkingConfig.thinkingLevel).toBe("minimal");
  });
  it("edits through Google directly and ignores thought parts", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                { thought: true, text: "private reasoning" },
                { text: JSON.stringify(patch) },
              ],
            },
          },
        ],
      }),
    );
    const result = await createProvider(
      { AI_PROVIDER: "gemma", GEMINI_API_KEY: "google-test" },
      fetcher,
    ).editGame(game, "Make the circle orange");
    expect(result.code).toContain("#ff8800");
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(JSON.parse(body.contents[0].parts[0].text).current.code).toBe(
      game.code,
    );
    expect(body.generationConfig.responseMimeType).toBeUndefined();
  });
  it("repairs a truncated Gemini response once", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          candidates: [
            {
              finishReason: "MAX_TOKENS",
              content: { parts: [{ text: source }] },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          candidates: [
            { finishReason: "STOP", content: { parts: [{ text: source }] } },
          ],
        }),
      );
    expect(
      await createProvider(
        { AI_PROVIDER: "gemma", GEMINI_API_KEY: "test" },
        fetcher,
      ).generateGame("an orbit painter"),
    ).toEqual(game);
    const retry = JSON.parse(
      JSON.parse(fetcher.mock.calls[1][1].body).contents[0].parts[0].text,
    );
    expect(retry.validationFeedback).toContain("truncated");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("fails after two malformed results and never loads a substitute", async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          Response.json({ choices: [{ message: { content: "incomplete" } }] }),
        ),
      );
    await expect(
      createProvider(
        { AI_PROVIDER: "groq", GROQ_API_KEY: "test" },
        fetcher,
      ).generateGame("any idea"),
    ).rejects.toThrow("invalid source twice");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("does not retry quota errors and classifies connection failures", async () => {
    for (const [response, status] of [
      [new Response("", { status: 429 }), 429],
    ] as const) {
      const fetcher = vi.fn().mockResolvedValue(response);
      await expect(
        createProvider(
          { AI_PROVIDER: "groq", GROQ_API_KEY: "test" },
          fetcher,
        ).generateGame("any idea"),
      ).rejects.toMatchObject({ status });
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
    await expect(
      createProvider(
        { AI_PROVIDER: "groq", GROQ_API_KEY: "test" },
        vi.fn().mockRejectedValue(new Error("network")),
      ).generateGame("any idea"),
    ).rejects.toMatchObject({ status: 502 });
  });
});
describe("server request boundary", () => {
  const env: Env = {
    AI_PROVIDER: "groq",
    GROQ_API_KEY: "test",
    AI_RATE_LIMITER: { limit: async () => ({ success: true }) },
  };
  const req = (body: string, headers: Record<string, string> = {}) =>
    new Request("https://justplay.test/api/generate", {
      method: "POST",
      headers: {
        Origin: "https://justplay.test",
        "Content-Type": "application/json",
        ...headers,
      },
      body,
    });
  it("blocks cross-origin requests", async () =>
    expect(
      (
        await onRequest({
          request: req("{}", { Origin: "https://evil.test" }),
          env,
        })
      ).status,
    ).toBe(403));
  it("requires a configured server limiter", async () =>
    expect(
      (
        await onRequest({
          request: req("{}"),
          env: { ...env, AI_RATE_LIMITER: undefined },
        })
      ).status,
    ).toBe(503));
  it("enforces body byte bounds even without Content-Length", async () =>
    expect(
      (await onRequest({ request: req("x".repeat(196609)), env })).status,
    ).toBe(413));
  it("enforces schema and JSON boundaries", async () => {
    expect((await onRequest({ request: req("{broken"), env })).status).toBe(
      400,
    );
    expect(
      (await onRequest({ request: req('{"prompt":"x"}'), env })).status,
    ).toBe(400);
  });
  it("returns server rate limit failures", async () =>
    expect(
      (
        await onRequest({
          request: req("{}"),
          env: {
            ...env,
            AI_RATE_LIMITER: { limit: async () => ({ success: false }) },
          },
        })
      ).status,
    ).toBe(429));
});
