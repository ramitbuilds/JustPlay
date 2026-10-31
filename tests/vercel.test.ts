import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { examples } from "../src/fixtures";
import { providerEnvironment } from "../src/server/environment";
import { createInstanceRateLimiter } from "../src/server/rate-limit";
import { requestGame } from "../src/api";

const spec = examples[0].spec;
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("Vercel environment configuration", () => {
  it("infers a single configured provider without relying on wrangler", () => {
    expect(providerEnvironment({ GROQ_API_KEY: " test-groq " })).toMatchObject({
      AI_PROVIDER: "groq",
      GROQ_API_KEY: "test-groq",
    });
    expect(
      providerEnvironment({ GEMINI_API_KEY: "test-gemini" }).AI_PROVIDER,
    ).toBe("gemma");
  });
  it("requires a selection when both or neither keys are configured", () => {
    expect(
      providerEnvironment({ GROQ_API_KEY: "a", GEMINI_API_KEY: "b" })
        .AI_PROVIDER,
    ).toBeUndefined();
    expect(providerEnvironment({}).AI_PROVIDER).toBeUndefined();
  });
  it("preserves explicit selection and only copies approved bindings", () => {
    expect(
      providerEnvironment({
        AI_PROVIDER: " gemma ",
        GROQ_API_KEY: "a",
        GEMINI_API_KEY: "b",
        DATABASE_PASSWORD: "unrelated",
      }),
    ).toEqual({
      AI_PROVIDER: "gemma",
      GROQ_API_KEY: "a",
      GEMINI_API_KEY: "b",
      GROQ_MODEL: undefined,
      GEMMA_MODEL: undefined,
    });
  });
});
describe("bounded server-side instance limiter", () => {
  it("blocks a sixth request for the same address, then expires", async () => {
    let time = 100;
    const limiter = createInstanceRateLimiter({ now: () => time });
    for (let i = 0; i < 5; i++)
      expect(await limiter.limit({ key: "ip" })).toEqual({ success: true });
    expect(await limiter.limit({ key: "ip" })).toEqual({ success: false });
    time += 60000;
    expect(await limiter.limit({ key: "ip" })).toEqual({ success: true });
  });
  it("caps total usage across different addresses", async () => {
    const limiter = createInstanceRateLimiter({ totalLimit: 2 });
    expect((await limiter.limit({ key: "a" })).success).toBe(true);
    expect((await limiter.limit({ key: "b" })).success).toBe(true);
    expect((await limiter.limit({ key: "c" })).success).toBe(false);
  });
  it("fails closed at capacity instead of evicting active limits", async () => {
    const limiter = createInstanceRateLimiter({ maxKeys: 1 });
    expect((await limiter.limit({ key: "a" })).success).toBe(true);
    expect((await limiter.limit({ key: "b" })).success).toBe(false);
  });
});
describe("shared Vercel server handler", () => {
  beforeEach(() => {
    vi.stubEnv("AI_PROVIDER", "groq");
    vi.stubEnv("GROQ_API_KEY", "server-only-test-key");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GROQ_MODEL", "");
  });
  const request = (body: unknown, headers: Record<string, string> = {}) =>
    new Request("https://justplay-test.vercel.app/api/generate", {
      method: "POST",
      headers: {
        Origin: "https://justplay-test.vercel.app",
        "Content-Type": "application/json",
        "x-vercel-forwarded-for": crypto.randomUUID(),
        ...headers,
      },
      body: JSON.stringify(body),
    });
  it("generates and edits through the real adapter and validator", async () => {
    const upstream = vi.fn().mockImplementation(() =>
      Promise.resolve(
        Response.json({
          choices: [{ message: { content: JSON.stringify(spec) } }],
        }),
      ),
    );
    vi.stubGlobal("fetch", upstream);
    const handler = {
      fetch: (await import("../src/server/vercel")).handleVercelRequest,
    };
    for (const body of [
      { prompt: "A fox in a forest" },
      { prompt: "Make it harder", current: spec },
    ]) {
      const response = await handler.fetch(request(body));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ spec });
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    }
    expect(upstream).toHaveBeenCalledTimes(2);
    expect(upstream.mock.calls[0][1].headers.Authorization).toBe(
      "Bearer server-only-test-key",
    );
    const edit = JSON.parse(upstream.mock.calls[1][1].body);
    expect(JSON.parse(edit.messages[1].content).current).toEqual(spec);
  });
  it("returns missing-key JSON rather than a missing-route HTML page", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    const response = await (
      await import("../src/server/vercel")
    ).handleVercelRequest(request({ prompt: "A fox game" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining("missing its AI key"),
    });
    expect(upstream).not.toHaveBeenCalled();
  });
  it("rejects cross-origin requests before spending inference quota", async () => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    const response = await (
      await import("../src/server/vercel")
    ).handleVercelRequest(
      request({ prompt: "A fox game" }, { Origin: "https://evil.test" }),
    );
    expect(response.status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });
  it("uses Vercel identity, ignoring spoofed Cloudflare identity", async () => {
    const upstream = vi.fn().mockImplementation(() =>
      Promise.resolve(
        Response.json({
          choices: [{ message: { content: JSON.stringify(spec) } }],
        }),
      ),
    );
    vi.stubGlobal("fetch", upstream);
    const handler = {
      fetch: (await import("../src/server/vercel")).handleVercelRequest,
    };
    const ip = crypto.randomUUID();
    for (let i = 0; i < 5; i++)
      expect(
        (
          await handler.fetch(
            request(
              { prompt: "A fox game" },
              {
                "x-vercel-forwarded-for": ip,
                "CF-Connecting-IP": `spoof-${i}`,
              },
            ),
          )
        ).status,
      ).toBe(200);
    const limited = await handler.fetch(
      request(
        { prompt: "A fox game" },
        { "x-vercel-forwarded-for": ip, "CF-Connecting-IP": "fresh-spoof" },
      ),
    );
    expect(limited.status).toBe(429);
    expect(upstream).toHaveBeenCalledTimes(5);
  });
});
describe("client failure recovery", () => {
  it.each([200, 404])(
    "explains an HTML deployment response with status %i",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response("<html>app</html>", {
            status,
            headers: { "Content-Type": "text/html" },
          }),
        ),
      );
      await expect(requestGame("a fox")).rejects.toThrow(
        "Redeploy the latest main branch",
      );
    },
  );
  it("distinguishes a failed function from a missing route", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("FUNCTION_INVOCATION_FAILED", { status: 500 }),
        ),
    );
    await expect(requestGame("a fox")).rejects.toThrow(
      "temporarily unavailable",
    );
  });
  it("preserves actionable server errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: "The server is missing its AI key." },
            { status: 503 },
          ),
        ),
    );
    await expect(requestGame("a fox")).rejects.toThrow("missing its AI key");
  });
  it("handles a network error and timeout without raw browser messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    );
    await expect(requestGame("a fox")).rejects.toThrow("Check your connection");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")),
    );
    await expect(requestGame("a fox")).rejects.toThrow("took too long");
  });
  it("handles HTML quota and access errors from the hosting edge", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Rate limited", { status: 429 })),
    );
    await expect(requestGame("a fox")).rejects.toThrow("Wait a minute");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Login", { status: 401 })),
    );
    await expect(requestGame("a fox")).rejects.toThrow("requires access");
  });
  it("rejects malformed success JSON and invalid designs without crashing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("{", {
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    await expect(requestGame("a fox")).rejects.toThrow("unreadable");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ spec: { hero: "mario" } })),
    );
    await expect(requestGame("a fox")).rejects.toThrow("invalid design");
  });
});
