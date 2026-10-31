# JustPlay

Create and remix small 2D arcade games with AI.

**Describe your game. Play it immediately.** AI writes the game's JavaScript mechanics and procedural artwork with reusable local sprites, which run in an isolated Canvas player. There are no keyword routes, fixed game families or substitute templates in new generation. Complex ideas become small 2D prototypes; quality and availability depend on the model and free quota.

**[Open JustPlay](https://justplay-olive-eta.vercel.app/)**

## What works

- Original source generation through Google AI Studio’s native Gemini API using Gemma 4. Groq remains an explicit optional adapter.
- Syntax validation, isolated rendering/control checks and one full-source AI repair attempt.
- Keyboard/pointer input, mobile controls generated from the game manifest, pause/restart/fullscreen and sound opt-in.
- Natural-language source patches, immutable history, actual source viewer, local saves, JSON export/import.
- Legacy saved games remain playable; they are not used to answer new requests.

## Deploy on Vercel

Deploy the repository root on the Vite preset using the included `vercel.json`; `api/generate.ts` runs the AI proxy on Vercel. Add `AI_PROVIDER=gemma`, `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/apikey), and `GEMMA_MODEL=gemma-4-26b-a4b-it` as server-only Production variables, then redeploy. No Groq key is needed. See [exact deployment steps](docs/DEPLOYMENT.md#vercel-current-deployment). `wrangler.jsonc` variables apply only to Cloudflare.

## Run in a development/cloud workspace

```sh
npm ci
npm run dev
```

This opens the frontend on port 5173; generation needs the server proxy. For the complete local server, use `npm run dev:full`; `.dev.vars` may hold secure server bindings and is ignored by git. Use only eligible free provider projects with billing disabled. [Deployment](docs/DEPLOYMENT.md) includes mobile-friendly dashboard steps. Never expose keys in `VITE_` variables.

```sh
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run deploy:check
```

## Game ideas and controls

Describe the rules, objective, setting and controls you want. The model writes a compact game within an 800×450 Canvas/Worker contract. It cannot use external libraries, network services or remote assets. Each generated game provides its own instructions and keyboard/touch controls. Pointer-only games use the canvas directly. Tab leaves the canvas; sound starts muted.

AI code can fail or misunderstand a request. Syntax/startup checks and repairs improve reliability but cannot prove gameplay quality. Failures stay visible. The app never silently loads a preset instead.

## Project notes

[Plan](docs/PLAN.md) · [Research](docs/INSTAPLAY_RESEARCH.md) · [Investigation limits](docs/REVERSE_ENGINEERING.md) · [Graphics](docs/GRAPHICS_ANALYSIS.md) · [Architecture](docs/ARCHITECTURE.md) · [AI pipeline & model evidence](docs/AI_PIPELINE.md) · [Asset licenses](docs/ASSET_LICENSES.md) · [Test results](docs/TEST_RESULTS.md) · [Known limits](docs/KNOWN_LIMITATIONS.md)

[PRODUCT.md](PRODUCT.md) and [DESIGN.md](DESIGN.md) define the product and visual system. Original code/art use the preserved MIT [LICENSE](LICENSE); Space Grotesk uses its included OFL.
