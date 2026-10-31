# Known limits

- Workspace keys remain unavailable, but Vercel’s existing server-side Groq key was used successfully for live generation, gameplay and an edit. Gemma remains mocked-adapter tested only. Account quotas and billing settings were not inspected; use only an eligible free account.
- The user’s Vercel deployment is live and verified at https://justplay-olive-eta.vercel.app/. Cloudflare remains dry-run verified only; its authentication is unavailable.
- REA MCP unavailable; Instaplay research used public HTML/bootstrap evidence. Its private backend and game quality are not established by this research. Groq documentation and Kenney download access returned 403.
- Five constrained game families, five visual themes, four heroes, slime/bat enemies. Survival is top-down and has no jump mechanic. Runner uses endless-runner controls and increasing speed with a finite finish target. No arbitrary genres, multiplayer, user scripting or uploaded artwork.
- Platform ground paths remain continuous. Optional ledges are bounded; crystals remain on the ground route. This favors reliability over varied platform puzzles. Original pixel animations are deliberately small 4-frame sets; there is no large commercial asset pack. Gold crystals restore one health. No checkpoints or complex power-up inventory.
- Browser saves are local, versioned to 30 entries, and not synchronized. Export/import preserves one selected GameSpec, not the entire history. Imported games use explicit local fixture edits; custom AI edits are available for AI-created games.
- Chromium desktop/mobile emulation tested; no physical iPhone, Safari, Firefox, screen reader or gamepad QA. Canvas gameplay itself is visual and is not fully screen-reader playable. Controls, mission, HUD and status have DOM descriptions. Synthesized sound verified in Chromium; no listening test or music.
- Phaser is lazy loaded on studio entry but is still about 332 KB gzip. Vite emits its expected large-chunk warning and two upstream Zod annotation warnings. They do not block build.
- Native Cloudflare rate limiting is approximate per location and IP, not a global budget or authentication system. Enable only on an eligible free inference project with billing disabled; no guarantee of unlimited free capacity.

- Vercel’s no-dependency limiter is per warm instance, with finite memory and an instance-wide ceiling. It is not shared across cold starts or replicas. A free Hobby WAF rule can add edge enforcement; do not mistake instance throttling for a global budget.

- Sports are arcade challenges: basketball has aim/power shots and basket scoring; cricket has timed batting and wickets. No team matches, dribbling, dunks, multiplayer or fielding simulation. The AI can report unsupported requests, and server family checks prevent sports-to-runner substitution. It still cannot invent arbitrary new runtime mechanics.
