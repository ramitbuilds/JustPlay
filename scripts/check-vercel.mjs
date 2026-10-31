// Verify the emitted Node ESM graph and the actual Node HTTP function signature.
import { createServer } from "node:http";
import assert from "node:assert/strict";
import handler from "../.vercel-check/api/generate.js";
assert.equal(typeof handler, "function");
process.env.AI_PROVIDER = "groq";
process.env.GROQ_API_KEY = "";
process.env.GEMINI_API_KEY = "";
const server = createServer((req, res) => {
  req.headers["x-forwarded-proto"] = "http";
  void handler(req, res);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
try {
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = await fetch(base + "/api/generate");
  assert.equal(get.status, 405);
  assert.deepEqual(await get.json(), { error: "Use POST for generation." });
  const missing = await fetch(base + "/api/generate", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "A forest game" }),
  });
  assert.equal(missing.status, 503);
  assert.match((await missing.json()).error, /missing its AI key/);
  const blocked = await fetch(base + "/api/generate", {
    method: "POST",
    headers: {
      Origin: "https://evil.test",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(blocked.status, 403);
  console.log(
    "Vercel Node ESM import and HTTP smoke passed: GET 405, missing key 503, cross-origin 403.",
  );
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
