# AI source generation

New games are source, not settings for a fixed engine. `POST /api/generate` accepts `{prompt, current?, runtimeError?}` and returns `{game, trace}`. `game` has format `justplay-code-v1`, title, description, instructions, controls, notes and JavaScript source. The provider receives the user's request unchanged as serialized user data. No keyword classification, family selection, game templates or fallback fixture participates in generation.

Creation requests plain JavaScript prefixed with a JSON manifest comment. The model implements `createGame({canvas,ctx,input,api})`, returning update(dt) and render(). The infrastructure supplies an 800×450 OffscreenCanvas, key/pointer state and small HUD/outcome/synthesized-sound APIs. The model implements the rules, visuals, movement, physics and goals. Editing requests exact source patches with updated metadata, preserving other code. History keeps earlier versions.

Zod validates bounded artifacts and Acorn parses syntax without executing it. The browser runs a short startup probe in a disposable sandbox. One AI repair is available on startup failure; later runtime errors expose a repair action. These checks catch syntax/startup errors, not every gameplay or prompt-fidelity defect. No unrelated replacement game is loaded on failure.

## Groq investigation — 2026-10-31

Reviewed the official [TypeScript SDK README](https://github.com/groq/groq-typescript/blob/main/README.md) and [chat-completion definitions](https://github.com/groq/groq-typescript/blob/main/src/resources/chat/completions.ts). They document the OpenAI-compatible endpoint, `max_completion_tokens`, GPT OSS model IDs, low/medium/high reasoning effort and `include_reasoning`. Requests use separate system/user messages, `openai/gpt-oss-20b`, low reasoning and hidden reasoning. The previous retired `llama-3.3-70b-versatile` setting is normalized to 20B. 120B is allowed only when eligible on the operator's free account.

Groq's rendered model, quickstart, text-chat, structured-output, reasoning and rate-limit documentation pages returned HTTP 403 from this workspace. Current pricing and account quotas were not inspectable. Do not infer unlimited or guaranteed free capacity. Use the existing eligible Free account with billing disabled.

Earlier live requests showed two separate problems: a retired model setting and invalid strict JSON decoding. Those were transport/model issues. The repeated runner was a product architecture issue: AI could only fill settings for a few authored engines. Source generation removes that restriction. Creation now uses text output rather than nesting all JavaScript in a strict JSON schema. Edits use JSON-object mode for small exact patches; JSON/schema errors receive one bounded retry.

## Bounds and recovery

Same-origin JSON only; prompt 3–6000 characters; streamed request at most 192 KiB. Source at most 40,000 characters; upstream response at most 350,000 characters. Two provider attempts maximum, 25-second timeout each. Completion budget up to 5400 tokens for creation and 3000 for edits, reduced for larger input; oversized edits fail with an actionable explanation. Browser request timeout 65 seconds. Free-tier TPM limits can still reject requests; 429 surfaces without automatic retries or provider switches. Model/key/access errors are classified without echoing raw upstream data or secrets.

## Google AI Studio / Gemma — selected provider

User requested Gemma directly instead of Groq. [Google's Gemma-on-Gemini-API guide](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api) was read in full for supported model IDs, native REST contents, system instructions and thinking configuration. The [changelog](https://ai.google.dev/gemini-api/docs/changelog) confirms the Gemma 4 API launch, and [pricing](https://ai.google.dev/gemini-api/docs/pricing#gemma-4) lists Gemma 4 input/output free of charge with no paid tier. Account eligibility/quotas remain operator-specific.

The app defaults to `AI_PROVIDER=gemma` and `gemma-4-26b-a4b-it`. Requests go directly to `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` with `x-goog-api-key`, a real `systemInstruction`, user contents/parts and `thinkingConfig.thinkingLevel=minimal` (documented Gemma 4 thinking-off mode). No Groq/OpenAI message format, strict response schema or paid tools are sent to Google. Thought parts are excluded; MAX_TOKENS triggers one bounded repair. Google invalid-key details, missing access, unavailable models and quota errors have actionable messages. No automatic provider fallback.

Native Google creation and source-patch editing are mocked-adapter and full HTTP/browser tested. No Google key was available for live inference; no live Gemma success is claimed. Credentials remain server-only.
