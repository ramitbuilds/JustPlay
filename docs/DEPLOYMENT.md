# Free deployment

The initial task prepared Cloudflare deployment. The user subsequently deployed to Vercel and supplied keys there. Both hosting adapters are now supported; Vercel steps come first. This workspace has no inference keys or hosting CLI credentials.

## Vercel (current deployment)

The root `api/generate.ts` is a native Vercel Node.js request/response function. Vercel does not execute `functions/api/generate.ts` or read `wrangler.jsonc`. A frontend-only deployment therefore returned 404 at `/api/generate` even with provider keys configured. The Vercel entry now reuses the shared validated handler and reads secrets only on the server.

In **Vercel → Project → Settings → Environment Variables**, set these for **Production** (and Preview if you use preview deployments), then redeploy the latest `main` commit:

| Name             | Groq                      | Gemma / Gemini API              |
| ---------------- | ------------------------- | ------------------------------- |
| `AI_PROVIDER`    | `groq`                    | `gemma`                         |
| `GROQ_API_KEY`   | Your Groq key (sensitive) | Not needed                      |
| `GROQ_MODEL`     | `openai/gpt-oss-20b`      | Not needed                      |
| `GEMINI_API_KEY` | Not needed                | Your Gemini API key (sensitive) |
| `GEMMA_MODEL`    | Not needed                | `gemma-4-26b-a4b-it`            |

If exactly one provider key exists, the adapter can infer the provider when `AI_PROVIDER` is unset. With both keys present, set `AI_PROVIDER` explicitly. No `VITE_` key and no Cloudflare `AI_RATE_LIMITER` variable are needed on Vercel. The previous `llama-3.3-70b-versatile` setting is normalized to `openai/gpt-oss-20b` automatically, so an old Production variable no longer blocks generation. New configurations should use the current model ID.

The included `vercel.json` sets **Vite**, build command `npm run build`, output directory `dist`, security headers and a 60-second function duration. Project Root Directory must be the repository root (leave it blank), because the native function lives in root `api/`. Remove any dashboard catch-all rewrite that redirects `/api/*` to `index.html`. Production Branch must be `main`; the user's project already has a Git integration, so pushing main should start deployment. No paid Vercel add-on or database is required.

The Vercel adapter supplies a bounded in-memory server limiter: 5 requests/minute per IP and 30/minute in total per warm instance. Counters reset on cold starts and are not shared across instances. For edge enforcement, Vercel's current [WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting) supports one rule on Hobby: configure path `/api/generate`, POST, 5 requests per 60 seconds per IP, then publish the rule. This is optional extra protection, not an environment binding. Its counters are regional; provider free quotas remain the final usage boundary. Keep inference billing disabled and verify free model eligibility before use.

A browser create request should return JSON. Opening `/api/generate` directly sends GET and should return **405 JSON** ("Use POST for generation."); **404** indicates an old deployment, wrong root/branch or missing function. JSON **503** identifies missing provider configuration. Requests must come from the same origin. Redeploy after changing environment variables; existing builds do not acquire new values automatically.

`npm run test:e2e:vercel` exercises the real function over a local HTTP bridge with mocked upstream inference, including three game families and editing. This does not claim a real Vercel build or live AI request. Live verification is recorded separately in TEST_RESULTS.

## Cloudflare mobile-friendly path

1. Review and merge the JustPlay PR on GitHub when ready.
2. In Cloudflare's dashboard, select **Workers & Pages → Create → Import a repository**, connect `ramitbuilds/JustPlay` and use the reviewed branch. Choose Workers **Free**, with no paid subscription or billing upgrade. Build command: `npm ci && npm run build`; deploy command: `npx wrangler deploy`. Keep `wrangler.jsonc` as the configuration. If account setup requires a paid plan/card in your region, stop; do not upgrade.
3. In the Worker's **Settings → Variables and Secrets**, add `GEMINI_API_KEY` as a secret from an eligible Gemini API free-tier project. `AI_PROVIDER=gemma` and `GEMMA_MODEL=gemma-4-26b-a4b-it` are already configured. Verify current free eligibility/quota in AI Studio, leave billing disabled and redeploy. For Groq development, first verify its current Free-plan eligibility; set `AI_PROVIDER=groq` and secret `GROQ_API_KEY`. Never put keys in GitHub source or `VITE_` variables.

Without step 3, local examples still work and generation displays the server's missing-key message. No paid database, auth or asset service is required. Local saves are browser-specific, so export important designs.

## Cloud terminal workflow (for maintainers, not instructions to run on a phone)

```sh
npm ci
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run deploy:check
```

`npm run dev` serves the frontend with clearly labeled examples (no proxy). `npm run dev:full` builds then runs the local Cloudflare Worker; put server-only secrets in ignored `.dev.vars` through secure cloud environment settings. `wrangler secret put GEMINI_API_KEY` is available for a future authorized authenticated cloud terminal. Never paste secrets into issue comments or a public commit.

## Hosting choices and bounds

The recommended target is **Workers Static Assets**, a Cloudflare alternative explicitly allowed by the brief. `worker.ts` routes `/api/generate` to the same handler used by the Pages Function; the rest comes from `dist`. This provides a real native Rate Limit binding, declared at 5 requests/minute per IP per Cloudflare location. Cloudflare documents these limits as approximate and location-scoped, not a strict global quota. Provider free quotas remain the final cost/usage boundary.

[`ratelimits` documentation](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) and [static assets](https://developers.cloudflare.com/workers/static-assets/) were read through their official [source repository](https://github.com/cloudflare/cloudflare-docs) after the rendered docs returned 403. Wrangler 4.156.0 accepts this configuration in a dry run. `functions/api/generate.ts` remains Pages-compatible source, but a plain Pages deployment without the required binding keeps AI disabled; do not weaken the check.

Static headers enforce same-origin scripts, no framing/plugins/camera/microphone, and no remote fonts or images. API responses use no-store and never return provider keys or raw upstream errors.
