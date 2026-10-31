import { z } from "zod";
import { GameSpecSchema, validateSpec } from "../../src/spec";
import {
  createProvider,
  ProviderError,
  type ProviderEnv,
} from "../../src/server/providers";
export type Env = ProviderEnv & {
  AI_RATE_LIMITER?: {
    limit(input: { key: string }): Promise<{ success: boolean }>;
  };
};
const inputSchema = z
  .object({
    prompt: z.string().trim().min(3).max(2000),
    current: GameSpecSchema.optional(),
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
    const provider = createProvider(env);
    if (!env.AI_RATE_LIMITER)
      return json(
        {
          error:
            "AI is disabled until the server rate limiter is configured. Play a local example.",
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
    // Read at most 16 KiB, including when Content-Length is missing or dishonest.
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "The request is empty." }, 400);
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 16384) {
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
    if (input.current) validateSpec(input.current);
    const spec = input.current
      ? await provider.editGame(input.current, input.prompt)
      : await provider.generateGame(input.prompt);
    return json({ spec });
  } catch (error) {
    if (error instanceof ProviderError)
      return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return json(
        {
          error:
            "Invalid game request. Use a prompt of 3–2000 characters and a supported design.",
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
