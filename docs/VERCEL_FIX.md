# Vercel generation fix

## Cause

Vercel deployed the Vite frontend, but the only API entry point was a Cloudflare Pages/Workers handler under `functions/`. Vercel does not discover that directory as a function and does not read Wrangler environment bindings. The corrected user URL `https://justplay-olive-eta.vercel.app/` served JustPlay, while `/api/generate` returned 404 text before this patch.

## Change

Add root `api/generate.ts` using Vercel’s Node request/response handler with explicit ESM imports, shared GameSpec validation/provider code, server-only environment resolution, bounded server-side throttling and explicit Vercel IP handling. Add Vite/function build configuration and matching security headers in `vercel.json`. Distinguish HTML deployment errors, hosting access/limits, network failures and provider JSON errors. Keep prompt data and the current game intact on failure.

## Design guidance applied

Read the official [Vercel design.md](https://vercel.com/design.md) and the published [Web Interface Guidelines skill](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md). Applied clear evidence-based copy, precise hierarchy, actionable recovery, inline form errors, aria-invalid/describedby, live alerts and focus restoration after inputs re-enable. Preserve the established JustPlay design system; this is a product repair, not a Vercel-authored report or branding exercise.

No file named `getdesign.md` exists in the checkout. Both `https://getdesign.md` and `/vercel.md` returned 403, so the official Vercel source was used instead. No getdesign content inspection or activation is claimed.

## Technical references checked

- [Vercel Node.js runtime](https://vercel.com/docs/functions/runtimes/node-js): root api directory and native Request/Response handler.
- [Functions API](https://vercel.com/docs/functions/functions-api-reference): Web Standard fetch export and duration configuration.
- [Request headers](https://vercel.com/docs/headers/request-headers): Vercel’s edge-supplied forwarded IP headers.
- [WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting): Hobby eligibility and regional counter limitations.

Validation results and production observations are in TEST_RESULTS.md. Keys are never read from Vite client variables, returned to the browser or committed.

## Runtime verification

The first Vercel build succeeded but live invocation failed before the handler returned JSON. The adapter now uses the established Node request/response signature and explicit `.js` imports throughout the shared server ESM graph. `npm run check:vercel` compiles with NodeNext, imports the emitted module in Node, and exercises the actual HTTP adapter (405 method guard, 503 missing key, 403 origin guard). This catches a class of module-loading errors that Vite's SSR transform can conceal. No deployment logs were available to attribute the original invocation failure more precisely.

## Production outcome

Verified on the user’s corrected URL https://justplay-olive-eta.vercel.app/: the Node function responds with JSON, real Groq generation returns a valid playable forest platformer, and a real edit increases difficulty by one while preserving all unrelated fields. The unavailable legacy Llama model setting is migrated to GPT OSS 20B. Groq output now uses strict JSON-schema decoding; invalid model data is still never executed or accepted as a game. No environment-key changes were needed for the verified deployment. See TEST_RESULTS.md and its live screenshot.
