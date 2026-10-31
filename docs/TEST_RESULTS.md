> Historical report. The source-generation change supersedes preset-family generation described below. See [AI_PIPELINE.md](AI_PIPELINE.md) and [ARCHITECTURE.md](ARCHITECTURE.md) for the current implementation.

# Verification — 2026-10-31

## Prompt fidelity and sports regression

- Reproduced live: cricket returned a renamed neon platformer; basketball returned a renamed neon runner. The previous schema could not express sports mechanics.
- Added real basketball and cricket runtimes and a supported/unsupported AI decision. Family/theme/mechanic checks reject unrelated designs and feed bounded repair.
- **65 unit/integration tests passed**, including rejection of a canned Neon Dash response for cricket/basketball, valid sports designs, mismatch repair, unsupported requests and edit-family preservation.
- **16 browser gameplay/UI tests passed**, including basketball scoring/win/loss/restart, cricket boundaries/wickets/win/loss/restart and mobile shot charging.
- **3 native Vercel HTTP browser tests passed**, including both sport creation requests and edits. Upstream responses are mocked only in these local tests.
- NodeNext emitted-server HTTP smoke, typecheck, lint and production build passed.
- Inspected basketball/cricket canvas and mobile studio screenshots. Sports-specific instructions, score units, action buttons and edit suggestions replace irrelevant platformer controls.

Live production verification at https://justplay-olive-eta.vercel.app/ now passes:

- `Create a cricket game.` returned HTTP **200**, genre **cricket**, stadium/athlete, wickets, a 20-run goal and no enemies. A fresh browser creation loaded the cricket pitch; a timed swing scored **1 run**, with no page errors.
- `Create a basketball game.` returned HTTP **200**, genre **basketball**, court/athlete, a 15-point target and no enemies. A fresh browser creation loaded the hoop/court and charged shot controls; a shot/miss deducted a try, with no page errors. Local physical-input tests separately scored baskets through victory and exercised the green-band guide at its lowest supported angle.
- The returned sport designs had different titles, seeds, rules and controls; neither was a renamed runner. These live requests used the actual Vercel proxy and Groq, with no API mocking or fixture fallback.
- A live chess request returned a clear unsupported-mechanics error; no unrelated game was loaded.
- [Live basketball](screenshots/live-basketball.png) · [Live cricket](screenshots/live-cricket.png). Both captures show AI-designed sessions, separate from the explicitly labeled local demos.

Provider QA found HTTP 400 JSON-decoding failures. A simpler flat supported/decline decision and one bounded repair now produce valid data; this does not establish that every nested schema is unsupported by Groq. Shot-guide QA also corrected Arcade’s fixed-step gravity bias so green-band assistance matches actual physics. Final checks: 65 unit/integration tests; 19 browser tests (10 original + 6 sports + 3 native HTTP); typecheck/lint/build and emitted NodeNext HTTP smoke passed.

## Vercel API compatibility result

**Live app:** https://justplay-olive-eta.vercel.app/

- **49 unit/integration tests passed.**
- **12 browser tests passed** (10 gameplay/UI + 2 native Vercel HTTP tests).
- Typecheck, lint, production build, emitted NodeNext ESM import/HTTP smoke all passed. Vercel’s automatic build for `e5de03d` succeeded.
- Production GET `/api/generate` now returns **405 JSON**, replacing the original 404.
- A real browser prompt created **Fox Crystal Quest** through Groq with HTTP **200**, using strict GameSpec JSON-schema output. Played the generated game: **2 crystals collected, health 4, no page errors**. No API response mocking or fixture fallback was used in this production check.
- A real edit request returned HTTP **200**, changed difficulty **1 → 2**, and preserved every other field. Both live responses passed shared validation.
- [Live gameplay screenshot](screenshots/vercel-live-game.png) · [desktop error state](screenshots/vercel-error-desktop.png) · [mobile error state](screenshots/vercel-error-mobile.png).

Live debugging found three independent problems: missing Vercel API discovery, Node function startup/ESM compatibility, and an unavailable/retired Groq model. Legacy `llama-3.3-70b-versatile` now maps to current `openai/gpt-oss-20b`. JSON mode alone failed live validation; strict JSON-schema decoding with a bounded output allowance solved it. Secrets stayed in Vercel throughout. Provider quota/billing eligibility was not inspected.

## Initial implementation results

| Check actually run                 | Result                                                               |
| ---------------------------------- | -------------------------------------------------------------------- |
| `npm run typecheck`                | Passed                                                               |
| `npm run lint`                     | Passed; generated `.wrangler` artifacts excluded                     |
| `npm test`                         | 24 passed, one Vitest file                                           |
| `npm run test:e2e`                 | 10 passed in Chromium, about one minute                              |
| `npm run deploy:check`             | Production TypeScript/Vite build and Wrangler 4.156.0 dry run passed |
| `npm audit --omit=dev`             | 0 vulnerabilities                                                    |
| Impeccable context and detector    | Ran from verified upstream checkout; detector returned `[]`          |
| Local Cloudflare Worker smoke      | HTML 200 with CSP; AI without key 503; cross-origin POST 403         |
| Actual scene console smoke         | Platformer, runner, survival: no page errors or console errors       |
| Public deployment / live inference | Not run: no credentials                                              |

## Gameplay and UI coverage

- The three acceptance prompts are represented by explicitly authored fixtures. Separate browser tests mock API responses for all three prompt submissions and subsequent AI-edit requests. These test the complete UI request flow, not a live model.
- Platformer: actual keyboard movement, crystal pickup, double jump, damage collision, staged win/loss trigger conditions, restart reset and a separate **full route completion using controls only**. The observed full run won with 12 crystals and full health. Controlled collision tests position the player at an enemy or exit; they are separate from the full-run viability test.
- Runner: real obstacle jumps through the runtime control interface, increasing speed and full-route victory. Survival: actual keyboard movement, automatic projectiles, enemy pursuit, movement around the arena and 12-kill victory. These runs use no teleportation or score/health mutation.
- Synthesized sound creates a running AudioContext after a trusted jump input in Chromium. Sound begins muted in the product. No listening test was performed.
- Studio: actual keyboard collection, pause/resume, four suggested fixture edits, immutable versions, saves, library reopen/delete. Unit tests check edits preserve title, seed and family, including enabling double jump from a disabled starting state.
- Mobile at 390×844: no horizontal overflow, homepage/studio screenshots, visible touch controls and actual held-pointer movement leading to collection. Fullscreen rejection remains nonblocking. WASD/space text stays in the edit textarea.
- Failure cases: missing proxy/key, rate limit, timeout, malformed JSON, bounded repair, unsupported asset/mechanic fields, invalid import and corrupt saves.

## Visual refinement

Applied Impeccable's published craft/polish principles and Vercel interface guidelines. Read Vercel design.md as scoped design guidance, without adopting its branding. The upstream Impeccable context launcher and detector ran; no integration restart or design hook was claimed. An independent agent inspected the screenshots, design system and source. Its material finding—fullscreen refusal causing a fatal overlay—was repaired and confirmed resolved by source inspection; the regression browser test passes.

Inspected homepage and studio on desktop/mobile, gallery and all three rendered game scenes. Fixed startup timing, keyboard event capture, touch focus, overlapping notices, runner finish behavior, valid enemy selections and unsupported survival double jump. Added health-restoring crystals and a survival-specific static preview. Screenshots are in [screenshots](screenshots/).

Some early development runs failed and drove those repairs. A later survival assertion used a fixed 500ms wall-clock delay and failed under concurrent build load despite movement occurring; it now waits for the actual position threshold. The final complete browser run passed all 10 tests.

## Limits of the evidence

No live provider key, remote deployment, physical phone, Safari, Firefox or screen-reader session was available. Current Groq pricing/quota pages returned 403. Build emits the expected lazy Phaser chunk-size warning and two upstream Zod annotation warnings. See [known limitations](KNOWN_LIMITATIONS.md) and [AI model evidence](AI_PIPELINE.md).

## Vercel compatibility regression

- `npm test`: **40 passed** across core and Vercel regression files.
- Existing Chromium suite: **10 passed**, including all three playable families and the updated missing-route behavior.
- `npm run test:e2e:vercel`: **2 passed**, exercising browser requests through the actual native function over a local HTTP bridge, all three creation families, a versioned edit, and method/origin guards. Only upstream model HTTP responses are mocked.
- Focus/inline-error regression: the missing-route test additionally checks aria-invalid, aria-describedby, prompt retention, focus restoration and no mobile overflow; desktop/mobile error screenshots captured.
- Typecheck, lint and production build passed. Existing Phaser/Zod warnings remain unchanged.
- No new dependencies or paid services. The Vercel limiter is tested for per-IP limits, window expiry, aggregate ceilings, capacity bounds and ignored spoofed Cloudflare headers.
- Read Vercel's official design.md and published Web Interface Guidelines. Applied inline actionable errors and accessible focus/announcement behavior to the existing JustPlay design. The requested getdesign.md source was absent locally and returned HTTP 403 online; see VERCEL_FIX.md for exact source links.

Production baseline: `https://justplay-olive-eta.vercel.app/` served JustPlay but GET `/api/generate` returned **404** before this fix. Deployment verification follows the push to main; no live inference result is claimed by these local tests.

### Node runtime hardening

The first automatic Vercel build completed, but production GET/POST returned `FUNCTION_INVOCATION_FAILED` before JSON handling. The entry now uses Node request/response semantics and explicit `.js` imports in the server ESM graph. `npm run check:vercel` compiles and imports that graph with NodeNext, then exercises real HTTP guards; it passed. The native HTTP browser tests passed again, and the expanded unit suite now has **41 passing tests**, including a distinct failed-function error case. Deployment logs were unavailable, so no more specific original exception is asserted.
