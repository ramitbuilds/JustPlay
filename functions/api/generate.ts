import { z } from "zod";
import { CodeGameSchema, validateCodeGame } from "../../src/code-game.js";
import {
  createProvider,
  ProviderError,
  type ProviderEnv,
} from "../../src/server/providers.js";
export type Env = ProviderEnv & {
  AI_RATE_LIMITER?: {
    limit(input: { key: string }): Promise<{ success: boolean }>;
  };
};
const inputSchema = z
  .object({
    prompt: z.string().trim().min(3).max(6000),
    current: CodeGameSchema.optional(),
    runtimeError: z.string().max(1200).optional(),
  })
  .strict();
function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function onRequest({
  request,
  env,
  clientIP,
}: {
  request: Request;
  env: Env;
  clientIP?: string;
}) {
  if (request.method !== "POST")
    return json({ error: "Use POST for generation." }, 405);
  const origin = request.headers.get("Origin");
  if (!origin || origin !== new URL(request.url).origin)
    return json({ error: "Requests must come from this site." }, 403);
  if (!request.headers.get("Content-Type")?.startsWith("application/json"))
    return json({ error: "Send a JSON game request." }, 415);
  try {
    const cancelled = new AbortController();
    let report: (message: string) => void = () => {};
    const provider = createProvider(env, fetch, {
      signal: AbortSignal.any([request.signal, cancelled.signal]),
      onProgress: (message) => report(message),
    });
    if (!env.AI_RATE_LIMITER)
      return json(
        {
          error:
            "AI is disabled until the server rate limiter is configured. Configure its documented server binding and redeploy.",
        },
        503,
      );
    const allowed = await env.AI_RATE_LIMITER.limit({
      key: clientIP ?? (request.headers.get("CF-Connecting-IP") || "unknown"),
    });
    if (!allowed.success)
      return json(
        { error: "Too many requests. Wait a minute before generating again." },
        429,
      );
    // Read at most 192 KiB, including when Content-Length is missing or dishonest.
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "The request is empty." }, 400);
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 196608) {
        await reader.cancel();
        return json({ error: "The game request is too large." }, 413);
      }
      chunks.push(value);
    }
    const merged = new Uint8Array(bytes);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    const input = inputSchema.parse(
      JSON.parse(new TextDecoder().decode(merged)),
    );
    if (input.current) validateCodeGame(input.current);
    const generate = () =>
      input.current
        ? provider.editGame(input.current, input.prompt, input.runtimeError)
        : provider.generateGame(input.prompt);
    if (request.headers.get("Accept")?.includes("application/x-ndjson")) {
      const encoder = new TextEncoder();
      let closed = false;
      let timer: ReturnType<typeof setInterval> | undefined;
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const emit = (value: unknown) => {
            if (!closed)
              controller.enqueue(encoder.encode(JSON.stringify(value) + "\n"));
          };
          report = (message) => emit({ type: "progress", message });
          emit({
            type: "progress",
            message: "Generation started. Waiting for the AI provider…",
          });
          timer = setInterval(() => emit({ type: "heartbeat" }), 8000);
          void generate()
            .then((game) =>
              emit({ type: "result", game, trace: provider.trace }),
            )
            .catch((error) =>
              emit({
                type: "error",
                error:
                  error instanceof ProviderError
                    ? error.message
                    : "The game request could not be processed. Please retry.",
                status: error instanceof ProviderError ? error.status : 500,
                diagnostic:
                  error instanceof ProviderError ? error.validation : undefined,
              }),
            )
            .finally(() => {
              clearInterval(timer);
              report = () => {};
              if (!closed) {
                closed = true;
                controller.close();
              }
            });
        },
        cancel() {
          closed = true;
          cancelled.abort();
          clearInterval(timer);
          report = () => {};
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-store, no-transform",
          "X-Content-Type-Options": "nosniff",
          "X-Accel-Buffering": "no",
        },
      });
    }
    const game = await generate();
    return json({ game, trace: provider.trace });
  } catch (error) {
    if (error instanceof ProviderError)
      return json(
        { error: error.message, diagnostic: error.validation },
        error.status,
      );
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return json(
        {
          error:
            "Invalid game request. Use a prompt of 3–6000 characters and a valid current game.",
        },
        400,
      );
    return json(
      {
        error:
          "The game request could not be processed. Your current game is unchanged.",
      },
      500,
    );
  }
}
