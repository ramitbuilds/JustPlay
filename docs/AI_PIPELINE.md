# AI pipeline

`POST /api/generate` receives `{prompt, current?}`. Cloudflare checks same-origin JSON, limits input to 16 KiB (including streamed bodies), validates prompt length 3–2000, validates the current design and applies the server rate-limit binding. Without a provider key or limiter, it fails closed with 503.

Groq uses chat completions at `https://api.groq.com/openai/v1/chat/completions`, separate system/user roles and JSON-object output. Gemini uses `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`, `x-goog-api-key`, contents/parts and plain JSON instructions; it does not assume Gemma supports Gemini systemInstruction, responseSchema or thinking options. The user request and current spec are serialized as data. No returned code is executed.

Shared Zod validation checks bounds, enums, strict field sets, unique enemies and survival combat. At most one repair request follows invalid model JSON. Requests time out after 18 seconds per attempt. Quota failures are surfaced immediately; no automatic provider fallback. Each edit receives the selected version and preserves unrelated properties by instruction. The runtime cannot guarantee an LLM follows edit intent perfectly; history enables rollback.

## Models and free use — checked 2026-10-31

- Google's [Gemini API changelog](https://ai.google.dev/gemini-api/docs/changelog) records `gemma-4-26b-a4b-it` and `gemma-4-31b-it` on April 2, 2026. [Pricing](https://ai.google.dev/gemini-api/docs/pricing#gemma-4) explicitly lists Gemma 4 input/output free of charge and paid tier unavailable. Free-tier data may be used to improve products. Eligibility and quotas vary; confirm the project's current limits in AI Studio. No unlimited inference claim.
- [Native generateContent API](https://ai.google.dev/api/generate-content) was retrieved and used for the Gemini request format.
- Groq `llama-3.3-70b-versatile` is present in the [official TypeScript SDK](https://github.com/groq/groq-typescript/blob/main/src/resources/chat/completions.ts). [Model docs](https://console.groq.com/docs/models) and [rate limits](https://console.groq.com/docs/rate-limits) returned 403 in this worker. Current Groq pricing/quotas could not be verified here. The operator must confirm the selected model is eligible on their Free plan before enabling Groq. Never attach billing for this project.

The allowlist rejects arbitrary paid-model identifiers. It cannot inspect billing settings; use only an eligible free project/account. No provider request was sent during this task. Adapter tests use mocked HTTP responses, and offline examples are authored fixtures, never a silent generation fallback.

## Hosting adapters

Cloudflare routes to the shared handler via `worker.ts` or the Pages entry. Vercel discovers root `api/generate.ts`, adapts its Node request/response signature to the shared Web Standard handler and supplies server environment variables plus its own bounded limiter. The shared handler accepts an explicit host-derived client IP; Vercel never trusts a caller-supplied Cloudflare IP header. Native function duration is 60 seconds; each provider attempt remains bounded to 18 seconds and the browser to 45 seconds.

## Groq model migration

Live production verification reached Groq but received model-unavailable/retired for `llama-3.3-70b-versatile`. The current official [Groq TypeScript SDK README](https://github.com/groq/groq-typescript/blob/main/README.md) uses `openai/gpt-oss-20b`; its model types include both GPT OSS 20B/120B and document low/medium/high reasoning effort. The adapter now defaults to 20B with low reasoning and deterministically migrates the legacy Llama setting. There is no provider switch or quota-error fallback. Groq's rendered quota pages remain inaccessible (403); current account Free-plan eligibility still belongs to the operator, and no unlimited capacity is claimed.
