# Known limits

- No AI keys were supplied. Real Groq/Gemma inference, live edit quality, provider latency and account quotas have not been exercised. Mocked adapter and browser fixtures verify plumbing, not model intelligence.
- The user deployed to Vercel after the initial task. The new Vercel function is tested over local HTTP with mocked upstream inference; see TEST_RESULTS for live deployment verification. Cloudflare authentication is still unavailable.
- REA MCP unavailable; Instaplay research used public HTML/bootstrap evidence. Its private backend and game quality are not established by this research. Groq documentation and Kenney download access returned 403.
- Three constrained game families, three visual themes, three heroes, slime/bat enemies. Survival is top-down and has no jump mechanic. Runner uses endless-runner controls and increasing speed with a finite finish target. No arbitrary genres, multiplayer, user scripting or uploaded artwork.
- Platform ground paths remain continuous. Optional ledges are bounded; crystals remain on the ground route. This favors reliability over varied platform puzzles. Original pixel animations are deliberately small 4-frame sets; there is no large commercial asset pack. Gold crystals restore one health. No checkpoints or complex power-up inventory.
- Browser saves are local, versioned to 30 entries, and not synchronized. Export/import preserves one selected GameSpec, not the entire history. Imported games use explicit local fixture edits; custom AI edits are available for AI-created games.
- Chromium desktop/mobile emulation tested; no physical iPhone, Safari, Firefox, screen reader or gamepad QA. Canvas gameplay itself is visual and is not fully screen-reader playable. Controls, mission, HUD and status have DOM descriptions. Synthesized sound verified in Chromium; no listening test or music.
- Phaser is lazy loaded on studio entry but is still about 332 KB gzip. Vite emits its expected large-chunk warning and two upstream Zod annotation warnings. They do not block build.
- Native Cloudflare rate limiting is approximate per location and IP, not a global budget or authentication system. Enable only on an eligible free inference project with billing disabled; no guarantee of unlimited free capacity.

- Vercel’s no-dependency limiter is per warm instance, with finite memory and an instance-wide ceiling. It is not shared across cold starts or replicas. A free Hobby WAF rule can add edge enforcement; do not mistake instance throttling for a global budget.
