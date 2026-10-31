# Architecture

Vite, React and TypeScript provide the composer, studio, source viewer, version history and local IndexedDB library. Groq or Gemma writes new JavaScript game source. Zod validates artifact bounds; Acorn parses syntax. No genre router chooses game logic.

Generated code executes only in a dedicated Worker created by trusted `/sandbox.js`, inside an iframe with `sandbox="allow-scripts"` and no same-origin permission. The iframe has an opaque origin, cannot reach parent DOM/storage, and applies a restrictive meta CSP with `connect-src 'none'`. The Worker inherits that CSP; ambient network, nested Worker and storage capabilities are removed. The app origin never evaluates generated source. CSP does not enable unsafe-eval.

Canvas rendering uses transferred OffscreenCanvas, not parent DOM. Trusted code bounds text/HUD/sound messages, validates parent/iframe source and random channel, limits message frequency, and kills unresponsive Workers after about 2.6 seconds. Pause, restart, sound opt-in and native keyboard/pointer input are host infrastructure. A temporary probe checks startup and a few update frames before studio entry. This is defense in depth, not a formal resource sandbox: memory exhaustion and malicious browser vulnerabilities are not fully containable. No runtime probe proves complete gameplay correctness.

Vercel discovers `api/generate.ts`, a native Node request/response adapter with explicit ESM imports. Cloudflare routes via `worker.ts` or its Pages function. Both use the same bounded server handler. Vercel supplies server-only environment variables and a bounded per-instance limiter. Instance counters are not a global quota.

Old GameSpec saves still validate and open in the legacy Phaser renderer. Legacy runtime/fixture modules are compatibility code and tests only; new generation and new edits never select them. Editing an old save asks AI to generate a new source prototype from its original prompt. Exports include the selected source artifact; imports validate syntax and startup before opening.

## 2D submission quality update

New artifacts declare runtimeVersion=2, renderer=canvas2d, selected sprite assets and inspect() gameplay state. The trusted app loads the small compiled Worker engine and local SVG sprites; no network capability is granted to generated code. The AI still writes all game mechanics. Original sprite assets are reusable artwork, not game-family templates.

Before studio entry, a disposable Worker verifies a nonblank render, numeric inspect() state, objective/HUD and each declared control. It automatically tests held and sequential input combinations with seeded randomness, comparing trajectories with/without only the tested input. A control must alter real numeric state plus rendered output or HUD. Prerequisite keys can remain held in both runs. Failure goes to the existing single AI repair; failed repairs remain errors, never preset replacements. This catches many broken controls and static scenes but does not prove all goals reachable or every game fun. Legacy saved source remains playable; new edits upgrade to the verified contract.

Mobile control presses no longer focus the iframe, preserving independent touch pointers for simultaneous movement/actions. Browser tests exercise actual two-finger drive-and-steer input. The user chose 2D for the submission deadline; 3D development was removed from this delivery.
