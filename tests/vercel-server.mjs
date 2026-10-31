// Test-only HTTP bridge for the real Vercel Node HTTP entry point.
// No production endpoint or provider credentials are used by this server.
import { createServer } from "node:http";
import { createServer as createViteServer } from "vite";

process.env.AI_PROVIDER = "gemma";
process.env.GEMINI_API_KEY = "test-fixture-not-a-real-key";
process.env.GEMMA_MODEL = "gemma-4-26b-a4b-it";
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "spa",
});
const { source, patch } = await vite.ssrLoadModule("/tests/code-fixture.ts");
const handler = (await vite.ssrLoadModule("/api/generate.ts")).default;
globalThis.fetch = async (url, options) => {
  if (
    url !==
    "https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent"
  )
    throw new Error("Unexpected outbound request");
  const body = JSON.parse(options.body);
  const { current } = JSON.parse(body.contents[0].parts[0].text);
  if (
    options.headers["x-goog-api-key"] !== process.env.GEMINI_API_KEY ||
    !body.systemInstruction
  )
    throw Error("Invalid Google request");
  return Response.json({
    candidates: [
      {
        finishReason: "STOP",
        content: {
          parts: [{ text: current ? JSON.stringify(patch) : source }],
        },
      },
    ],
  });
};
const server = createServer(async (incoming, outgoing) => {
  if (incoming.url?.split("?")[0] !== "/api/generate") {
    vite.middlewares(incoming, outgoing);
    return;
  }
  try {
    incoming.headers["x-forwarded-proto"] = "http";
    await handler(incoming, outgoing);
  } catch {
    outgoing.writeHead(500, { "Content-Type": "application/json" });
    outgoing.end(JSON.stringify({ error: "Test HTTP adapter failed." }));
  }
});
server.listen(5174, "127.0.0.1");
async function close() {
  server.close();
  await vite.close();
  process.exit(0);
}
process.on("SIGTERM", close);
process.on("SIGINT", close);
