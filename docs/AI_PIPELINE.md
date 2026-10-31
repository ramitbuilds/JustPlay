# AI source generation

New games are source, not settings for a fixed engine. `POST /api/generate` accepts `{prompt, current?, runtimeError?}` and returns `{game, trace}`. `game` has format `justplay-code-v1`, title, description, instructions, controls, notes and JavaScript source. The provider receives the user's request unchanged as serialized user data. No keyword classification, family selection, game templates or fallback fixture participates in generation.

Creation requests plain JavaScript prefixed with a JSON manifest comment. The model implements `createGame({canvas,ctx,input,api})`, returning update(dt) and render(). The infrastructure supplies an 800×450 OffscreenCanvas, key/pointer state and small HUD/outcome/synthesized-sound APIs. The model implements the rules, visuals, movement, physics and goals. Editing requests exact source patches with updated metadata, preserving other code. History keeps earlier versions.

Zod validates bounded artifacts and Acorn parses syntax without executing it. The browser runs a short startup probe in a disposable sandbox. One AI repair is available on startup failure; later runtime errors expose a repair action. These checks catch syntax/startup errors, not every gameplay or prompt-fidelity defect. No unrelated replacement game is loaded on failure.

## Groq investigation — 2026-10-31

Reviewed the official [TypeScript SDK README](https://github.com/groq/groq-typescript/blob/main/README.md) and [chat-completion definitions](https://github.com/groq/groq-typescript/blob/main/src/resources/chat/completions.ts). They document the OpenAI-compatible endpoint, `max_completion_tokens`, GPT OSS model IDs, low/medium/high reasoning effort and `include_reasoning`. Requests use separate system/user messages, `openai/gpt-oss-20b`, low reasoning and hidden reasoning. The previous retired `llama-3.3-70b-versatile` setting is normalized to 20B. 120B is allowed only when eligible on the operator's free account.

Groq's rendered model, quickstart, text-chat, structured-output, reasoning and rate-limit documentation pages returned HTTP 403 from this workspace. Current pricing and account quotas were not inspectable. Do not infer unlimited or guaranteed free capacity. Use the existing eligible Free account with billing disabled.

Earlier live requests showed two separate problems: a retired model setting and invalid strict JSON decoding. Those were transport/model issues. The repeated runner was a product architecture issue: AI could only fill settings for a few authored engines. Source generation removes that restriction. Creation now uses text output rather than nesting all JavaScript in a strict JSON schema. Edits use JSON-object mode for small exact patches; JSON/schema errors receive one bounded retry.

## Bounds and recovery

Same-origin JSON only; prompt 3–6000 characters; streamed request at most 192 KiB. Source at most 40,000 characters; upstream response at most 350,000 characters. Two provider attempts maximum, 105-second timeout each (headers and body), inside a 225-second overall generation budget. Completion budget up to 5400 tokens for creation and 3000 for edits, reduced for larger input; oversized edits fail with an actionable explanation. Browser request timeout 240 seconds. Vercel Fluid Compute is enabled in vercel.json with a 300-second maximum duration, within its documented Hobby limit. Free-tier TPM limits can still reject requests; 429 surfaces without automatic retries or provider switches. Transport failures and upstream HTTP 5xx can use the single remaining attempt; exhausted failures identify provider unavailability, timeout or connection failure separately. Model/key/access errors are classified without echoing raw upstream data or secrets.

## Google AI Studio / Gemma — selected provider

User requested Gemma directly instead of Groq. [Google's Gemma-on-Gemini-API guide](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api) was read in full for supported model IDs, native REST contents, system instructions and thinking configuration. The [changelog](https://ai.google.dev/gemini-api/docs/changelog) confirms the Gemma 4 API launch, and [pricing](https://ai.google.dev/gemini-api/docs/pricing#gemma-4) lists Gemma 4 input/output free of charge with no paid tier. Account eligibility/quotas remain operator-specific.

The app defaults to `AI_PROVIDER=gemma` and `gemma-4-26b-a4b-it`. Requests go directly to `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` with `x-goog-api-key`, a real `systemInstruction`, user contents/parts and `thinkingConfig.thinkingLevel=minimal` (documented Gemma 4 thinking-off mode). No Groq/OpenAI message format, strict response schema or paid tools are sent to Google. Thought parts are excluded; MAX_TOKENS triggers one bounded repair. Google invalid-key details, missing access, unavailable models and quota errors have actionable messages. No automatic provider fallback.

Native Google creation and source-patch editing are mocked-adapter and full HTTP/browser tested. The timeout follow-up verified real Google Gemma generation on Vercel in 46.9 seconds and played its actual output successfully. The workspace still has no Google key; the existing Production credential stayed server-only. See TEST_RESULTS.md.

## Streaming and deployment deadlines

Clients request `Accept: application/x-ndjson`. After origin, configuration, quota and input checks, the server immediately sends a progress event, then heartbeat events every 8 seconds, and one result or error event. Provider progress identifies the actual selected provider and retry. Heartbeats keep the HTTP connection active; they do not extend Vercel's execution limit. JSON-only callers remain supported.

The native Node adapter flushes headers and pipes the response body with backpressure rather than buffering response.text(). Client disconnect aborts the Google request. The browser reads bounded fragmented UTF-8 lines, ignores heartbeats, validates the final game and preserves server errors. Streaming begins before inference finishes, not as a fabricated percentage of completion.

[Vercel duration](https://vercel.com/docs/functions/configuring-functions/duration) and [limits](https://vercel.com/docs/functions/limitations) were checked: Fluid Compute supports 300 seconds on Hobby. The deployment schema confirms `fluid: true` enables Fluid Compute. No paid plan or separate service is required. Streamed errors use HTTP 200 with an explicit terminal error event/status because headers have already been sent. Server logs record provider/model, attempt, duration, HTTP status and upstream request ID; no key, prompt, generated source or raw upstream error is logged.

## Playability and art contract

Creation/editing now requires runtimeVersion=2, canvas2d, actual native keyboard controls (pointer-only uses an empty array), asset declarations and inspect() numeric gameplay state. The provider receives the local sprite catalog and instructions for complete rules/objectives, dt-based motion, feedback and outcomes. It is never given a keyword-selected racing/cricket/basketball engine. Prompting alone cannot guarantee quality; automatic browser input/render checks and one feedback-based full-source repair run before accepting the game. Google source budget is up to 7000 tokens (edits 4200), within existing request deadlines; Groq retains its smaller budget.

Input checks are now owned by the engine, with optional model-supplied hints. They sample each input trajectory rather than only its final frame, so valid jumps/brakes that settle back to the same state are accepted. Scenarios include simultaneous and sequential controls; numeric changes must also have pixel or HUD feedback. Model-authored test metadata is no longer required, avoiding valid-code rejection caused by mislabeled test controls.

Transient Google HTTP 5xx may use the single remaining attempt on the other reviewed Gemma 4 model via native streamGenerateContent. Both use the same Google credential/free model allowlist. The SSE parser joins only text output, ignores thoughts and keeps source bounds. This is not a switch to Groq or a paid service; persistent Google failures remain visible.
