import { onRequest } from "../functions/api/generate";
import { createInstanceRateLimiter } from "../src/server/rate-limit";
import { providerEnvironment } from "../src/server/environment";

const limiter = createInstanceRateLimiter();

// Vercel's native Web Standard function entry point. Only server code reads keys.
export default {
  async fetch(request: Request): Promise<Response> {
    // Vercel sets this header at its edge. Never trust a client-supplied CF header.
    const address = request.headers
      .get("x-vercel-forwarded-for")
      ?.split(",")[0]
      ?.trim();
    return onRequest({
      request,
      env: { ...providerEnvironment(process.env), AI_RATE_LIMITER: limiter },
      clientIP: address && address.length <= 128 ? address : "unknown",
    });
  },
};
