// Test-only HTTP bridge for the real Vercel Web Standard entry point.
// No production endpoint or provider credentials are used by this server.
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { createServer as createViteServer } from "vite";

process.env.AI_PROVIDER = "groq";
process.env.GROQ_API_KEY = "test-fixture-not-a-real-key";
process.env.GROQ_MODEL = "llama-3.3-70b-versatile";
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "spa",
});
const { examples } = await vite.ssrLoadModule("/src/fixtures.ts");
const handler = (await vite.ssrLoadModule("/api/generate.ts")).default;
globalThis.fetch = async (url, options) => {
  if (url !== "https://api.groq.com/openai/v1/chat/completions")
    throw new Error("Unexpected outbound request in Vercel fixture test");
  const payload = JSON.parse(options.body);
  const { request, current } = JSON.parse(payload.messages[1].content);
  const index = /runner|neon/i.test(request)
    ? 1
    : /dungeon|survival/i.test(request)
      ? 2
      : 0;
  const spec = current
    ? { ...current, difficulty: Math.min(5, current.difficulty + 1) }
    : examples[index].spec;
  return Response.json({
    choices: [{ message: { content: JSON.stringify(spec) } }],
  });
};
const server = createServer(async (incoming, outgoing) => {
  if (incoming.url?.split("?")[0] !== "/api/generate") {
    vite.middlewares(incoming, outgoing);
    return;
  }
  try {
    const request = new Request(`http://127.0.0.1:5174${incoming.url}`, {
      method: incoming.method,
      headers: incoming.headers,
      ...(["GET", "HEAD"].includes(incoming.method)
        ? {}
        : { body: Readable.toWeb(incoming), duplex: "half" }),
    });
    const response = await handler.fetch(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) Readable.fromWeb(response.body).pipe(outgoing);
    else outgoing.end();
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
