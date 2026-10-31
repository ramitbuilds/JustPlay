import { onRequest, type Env } from "./functions/api/generate";
type WorkerEnv = Env & {
  ASSETS: { fetch(request: Request): Promise<Response> };
};
export default {
  async fetch(request: Request, env: WorkerEnv) {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/api/generate") return onRequest({ request, env });
    if (pathname.startsWith("/api/"))
      return Response.json({ error: "API route not found." }, { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
