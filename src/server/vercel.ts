import { onRequest } from "../../functions/api/generate.js";
import { createInstanceRateLimiter } from "./rate-limit.js";
import { providerEnvironment } from "./environment.js";

const limiter = createInstanceRateLimiter();
export function handleVercelRequest(request: Request): Promise<Response> {
  const address = request.headers
    .get("x-vercel-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return onRequest({
    request,
    env: { ...providerEnvironment(process.env), AI_RATE_LIMITER: limiter },
    clientIP: address && address.length <= 128 ? address : "unknown",
  });
}
