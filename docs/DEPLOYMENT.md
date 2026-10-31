# Free deployment

No public deployment was made. This cloud environment has no Cloudflare token/account binding or inference keys. The build and Worker deployment dry run were validated locally.

## Mobile-friendly path

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
