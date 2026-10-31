# Known limits

- AI writes arbitrary game mechanics within a compact 2D Canvas/Worker contract. Large ideas become small single-player prototypes. No guarantee every prompt produces a good or faithful game; startup probing is not semantic or gameplay verification.
- No DOM, external libraries, networking, remote artwork, multiplayer or uploaded assets inside generated games. The model can use the preloaded original sprite library and draw additional artwork. Source/token/time budgets favor small games.
- Creation can fail, and edits/repairs consume additional free inference quota. Oversized source may exceed edit budgets. Provider 429 errors remain visible; no silent preset or paid-provider fallback.
- Groq rendered documentation pages returned 403; official SDK sources were inspected. Current account pricing/quota and billing configuration are not visible here. Keep billing disabled. Gemma creation is now live-verified through the existing Vercel credential, including actual game play; its edit path is still mocked-adapter/browser tested.
- Sandbox requires Worker, OffscreenCanvas transfer and Canvas2D. Chromium was tested; physical iPhone, Safari, Firefox, gamepad and screen-reader gameplay were not. Browser failures show repair/retry errors rather than an unrelated game.
- Opaque iframe, CSP, dedicated Worker, bounded messages and watchdog isolate code from the app. They do not provide a hard memory cap or formal protection against browser vulnerabilities.
- Saves are browser-local, at most 30 versions; no accounts or synchronization. Export/import preserves one selected version. Older preset-based saves remain playable as legacy content.
- Canvas gameplay is visual. Instructions, generated control buttons, status and HUD have DOM text; full screen-reader playability depends on generated behavior and is not promised.
- Vercel rate limiting is per warm instance, not shared across replicas/cold starts. Cloudflare's native binding is location scoped. Provider quotas remain the final usage bound.
- Cloudflare was dry-run checked only. REA MCP was unavailable; earlier Instaplay research used public evidence and did not inspect its private backend.
