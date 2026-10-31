import { afterEach, describe, it, expect, vi } from "vitest";
import { createProvider } from "../src/server/providers";
import { onRequest } from "../functions/api/generate";
import { readGameStream } from "../src/response-stream";
import { PROVIDER_TIMEOUT_MS } from "../src/generation-limits";
import { game, source } from "./code-fixture";
const env = {
  AI_PROVIDER: "gemma",
  GEMINI_API_KEY: "test",
  AI_RATE_LIMITER: { limit: async () => ({ success: true }) },
};
const success = () =>
  Response.json({ candidates: [{ content: { parts: [{ text: source }] } }] });
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("generation time budget and transport", () => {
  it("accepts a Google response after the former 25-second cutoff", async () => {
    vi.useFakeTimers();
    vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
      const c = new AbortController();
      setTimeout(
        () => c.abort(new DOMException("deadline", "TimeoutError")),
        ms,
      );
      return c.signal;
    });
    const fetcher = vi.fn(
      (_url, init) =>
        new Promise<Response>((resolve, reject) => {
          setTimeout(() => resolve(success()), 30000);
          init.signal.addEventListener(
            "abort",
            () => reject(init.signal.reason),
            { once: true },
          );
        }),
    );
    const result = createProvider(env, fetcher).generateGame(
      "an original game",
    );
    await vi.advanceTimersByTimeAsync(30000);
    expect(await result).toEqual(game);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(AbortSignal.timeout).toHaveBeenCalledWith(PROVIDER_TIMEOUT_MS);
  });
  it("retries a transient Google 500 once, preserving the request", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { error: { message: "internal details" } },
          { status: 500 },
        ),
      )
      .mockImplementationOnce(success);
    expect(
      await createProvider(env, fetcher).generateGame("my unusual idea"),
    ).toEqual(game);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(
      JSON.parse(fetcher.mock.calls[1][1].body),
    );
  });
  it("reports a persistent upstream failure separately from a timeout without leaking raw errors", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetcher = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          Response.json(
            { error: { message: "private upstream payload" } },
            { status: 503 },
          ),
        ),
      );
    await expect(
      createProvider(env, fetcher).generateGame("a game"),
    ).rejects.toMatchObject({
      status: 503,
      message: expect.stringContaining(
        "Google Gemma is temporarily unavailable",
      ),
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("cancellation aborts without using the second attempt", async () => {
    const c = new AbortController();
    c.abort();
    const fetcher = vi.fn();
    await expect(
      createProvider(env, fetcher, { signal: c.signal }).generateGame("a game"),
    ).rejects.toMatchObject({ status: 499 });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
describe("streamed generation protocol", () => {
  it("sends progress before inference finishes, then a validated game", async () => {
    let resolve!: (value: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>((r) => (resolve = r))),
    );
    const response = await onRequest({
      env,
      request: new Request("https://game.test/api/generate", {
        method: "POST",
        headers: {
          Origin: "https://game.test",
          "Content-Type": "application/json",
          Accept: "application/x-ndjson",
        },
        body: JSON.stringify({ prompt: "a game" }),
      }),
    });
    expect(response.headers.get("Content-Type")).toContain(
      "application/x-ndjson",
    );
    const reader = response.body!.getReader();
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).toContain("progress");
    resolve(success());
    let rest = "";
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      rest += new TextDecoder().decode(part.value);
    }
    expect(rest).toContain('"type":"result"');
    expect(rest).toContain("justplay-code-v1");
  });
  it("stream cancellation aborts the upstream request", async () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            signal = init.signal;
            signal!.addEventListener("abort", () => reject(signal!.reason), {
              once: true,
            });
          }),
      ),
    );
    const response = await onRequest({
      env,
      request: new Request("https://game.test/api/generate", {
        method: "POST",
        headers: {
          Origin: "https://game.test",
          "Content-Type": "application/json",
          Accept: "application/x-ndjson",
        },
        body: JSON.stringify({ prompt: "a game" }),
      }),
    });
    await response.body!.cancel();
    expect(signal?.aborted).toBe(true);
  });
  it("parses fragmented UTF-8 NDJSON and ignores heartbeats", async () => {
    const text =
      JSON.stringify({ type: "progress", message: "Google is writing…" }) +
      "\n" +
      JSON.stringify({ type: "heartbeat" }) +
      "\n" +
      JSON.stringify({ type: "result", game }) +
      "\n";
    const encoded = new TextEncoder().encode(text);
    const response = new Response(
      new ReadableStream({
        start(c) {
          for (let i = 0; i < encoded.length; i += 7)
            c.enqueue(encoded.slice(i, i + 7));
          c.close();
        },
      }),
    );
    const progress = vi.fn();
    expect(await readGameStream(response, progress)).toEqual(game);
    expect(progress).toHaveBeenCalledWith("Google is writing…");
  });
  it("surfaces upstream error events and refuses incomplete streams", async () => {
    await expect(
      readGameStream(
        new Response('{"type":"error","error":"Google is unavailable"}\n'),
      ),
    ).rejects.toThrow("Google is unavailable");
    await expect(
      readGameStream(new Response('{"type":"heartbeat"}\n')),
    ).rejects.toThrow("before a complete game");
  });
});
