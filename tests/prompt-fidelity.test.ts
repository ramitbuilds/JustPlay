import { describe, it, expect, vi } from "vitest";
import { createProvider } from "../src/server/providers";
import { sportsExamples, examples } from "../src/fixtures";
import { validateSpec } from "../src/spec";
const env = { AI_PROVIDER: "groq", GROQ_API_KEY: "test" };
const response = (spec: unknown) =>
  Response.json({
    choices: [
      {
        message: {
          content: JSON.stringify({
            ...(spec as object),
            supported: true,
            reason: "",
          }),
        },
      },
    ],
  });
describe("prompt fidelity", () => {
  it.each(sportsExamples)(
    "returns a real $spec.genre design and passes the family hint",
    async (example) => {
      const fetcher = vi.fn().mockResolvedValue(response(example.spec));
      const spec = await createProvider(env, fetcher).generateGame(
        example.prompt,
      );
      expect(spec.genre).toBe(example.spec.genre);
      expect(spec.enemies).toEqual([]);
      const body = JSON.parse(fetcher.mock.calls[0][1].body);
      const input = JSON.parse(body.messages[1].content);
      expect(input.request).toBe(example.prompt);
      expect(input.requestedFamily).toBe(example.spec.genre);
    },
  );
  it.each(["cricket", "basketball"])(
    "rejects an unrelated Neon runner for %s",
    async (sport) => {
      const fetcher = vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(
            response({ ...examples[1].spec, title: "Neon Dash" }),
          ),
        );
      await expect(
        createProvider(env, fetcher).generateGame(`Create a ${sport} game`),
      ).rejects.toThrow(`requested ${sport} family`);
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(
        JSON.parse(
          JSON.parse(fetcher.mock.calls[1][1].body).messages[1].content,
        ).validationFeedback,
      ).toContain(`requested family is ${sport}`);
    },
  );
  it("repairs a family mismatch with a valid sport instead of accepting a renamed runner", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response(examples[1].spec))
      .mockResolvedValueOnce(response(sportsExamples[0].spec));
    expect(
      (await createProvider(env, fetcher).generateGame("basketball")).genre,
    ).toBe("basketball");
  });
  it("rejects known unsupported mechanics before requesting inference", async () => {
    const fetcher = vi.fn();
    await expect(
      createProvider(env, fetcher).generateGame("A chess game"),
    ).rejects.toMatchObject({ status: 422 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("allows the AI to report unsupported ideas honestly", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                supported: false,
                reason: "This engine cannot build a turn-based card game.",
                spec: null,
              }),
            },
          },
        ],
      }),
    );
    await expect(
      createProvider(env, fetcher).generateGame("A turn-based card game"),
    ).rejects.toMatchObject({ status: 422 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("requires supported responses to include a valid complete design", async () => {
    const fetcher = vi.fn().mockImplementation(() =>
      Promise.resolve(
        Response.json({
          choices: [
            {
              message: {
                content: '{"supported":true,"reason":"","spec":null}',
              },
            },
          ],
        }),
      ),
    );
    await expect(
      createProvider(env, fetcher).generateGame("a forest game"),
    ).rejects.toThrow("invalid design twice");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("enforces explicit theme and double-jump requests", async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(() => Promise.resolve(response(examples[1].spec)));
    await expect(
      createProvider(env, fetcher).generateGame(
        "A forest runner with a double jump",
      ),
    ).rejects.toThrow("invalid design twice");
  });
  it("retains the sport family during an edit", async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(() => Promise.resolve(response(examples[1].spec)));
    await expect(
      createProvider(env, fetcher).editGame(
        sportsExamples[1].spec,
        "Make it harder",
      ),
    ).rejects.toThrow("requested cricket family");
  });
  it("rejects incompatible sports mechanics", () => {
    expect(() =>
      validateSpec({
        ...sportsExamples[0].spec,
        mechanics: { doubleJump: true, dash: false, shooting: true },
      }),
    ).toThrow("Sports games require");
  });
});

it("repairs Groq JSON-decoding failures without treating them as account errors", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json(
        { error: { code: "json_validate_failed" } },
        { status: 400 },
      ),
    )
    .mockResolvedValueOnce(response(sportsExamples[0].spec));
  expect(
    (await createProvider(env, fetcher).generateGame("basketball")).genre,
  ).toBe("basketball");
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("bounds Groq JSON-decoding failure retries", async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(
        Response.json(
          { error: { code: "json_validate_failed" } },
          { status: 400 },
        ),
      ),
    );
  await expect(
    createProvider(env, fetcher).generateGame("basketball"),
  ).rejects.toThrow("invalid design twice");
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("grounds sports instructions in actual goals and misses instead of invented rules", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      response({
        ...sportsExamples[0].spec,
        description: "Dunk with a full team before the timer runs out.",
      }),
    );
  const design = await createProvider(env, fetcher).generateGame("basketball");
  expect(design.description).toContain("10 points");
  expect(design.description).toContain("6 missed shots");
  expect(design.description).not.toMatch(/timer|team|dunk/i);
});
