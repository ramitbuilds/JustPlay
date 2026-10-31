import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { handleVercelRequest } from "../src/server/vercel.js";

// Use Vercel's established Node handler signature, with explicit Node ESM imports.
export default async function handler(
  incoming: IncomingMessage,
  outgoing: ServerResponse,
): Promise<void> {
  try {
    const headers = new Headers();
    for (const [name, value] of Object.entries(incoming.headers)) {
      if (Array.isArray(value))
        for (const item of value) headers.append(name, item);
      else if (value !== undefined) headers.set(name, value);
    }
    const protocol =
      headers.get("x-forwarded-proto") === "http" ? "http" : "https";
    const url = new URL(
      incoming.url ?? "/api/generate",
      `${protocol}://${headers.get("host") ?? "localhost"}`,
    );
    const init: RequestInit & { duplex?: "half" } = {
      method: incoming.method ?? "GET",
      headers,
    };
    if (!["GET", "HEAD"].includes(init.method!)) {
      init.body = Readable.toWeb(incoming) as ReadableStream<Uint8Array>;
      init.duplex = "half";
    }
    const response = await handleVercelRequest(new Request(url, init));
    outgoing.statusCode = response.status;
    for (const [name, value] of response.headers)
      outgoing.setHeader(name, value);
    outgoing.end(await response.text());
  } catch {
    outgoing.statusCode = 500;
    outgoing.setHeader("Content-Type", "application/json");
    outgoing.setHeader("Cache-Control", "no-store");
    outgoing.end(
      JSON.stringify({
        error:
          "The game service could not process this request. Try again; your current game is unchanged.",
      }),
    );
  }
}
