> Historical report. The source-generation change supersedes preset-family generation described below. See [AI_PIPELINE.md](AI_PIPELINE.md) and [ARCHITECTURE.md](ARCHITECTURE.md) for the current implementation.

# Prompt fidelity repair

## Reproduced cause

Live requests did reach Groq, but the previous schema allowed only platformer/runner/survival. `Create a cricket game` returned a neon platformer titled Cricket Dash; `Create a basketball game` returned a neon runner titled Hoops Dash. Descriptions promised sports actions absent from the runtime. This was a capability/semantic-validation defect, not proof of a static fixture fallback or request caching.

## Resulting behavior

- Real basketball shooting runtime: aim angle, held shot power, visible trajectory aid, gravity, rim/backboard collisions, two-point baskets, misses, victory/loss and restart.
- Real cricket batting runtime: deliveries, timing zone, bat overlap, 1/4/6 run hits, wickets, victory/loss and restart.
- AI chooses family, seed, theme, hero, goal, difficulty, speed, misses/wickets and supported mechanics. Sports use separate gameplay logic, not renamed runner levels.
- Server rejects sport-to-runner substitutions. Provider output can explicitly decline unsupported mechanics. Capability copy names all five implemented families before submission.
- Existing platformer, runner, survival, saved games and provider adapters remain supported. Generated code is never executed.

## Verification

Unit tests reproduce the erroneous Neon Dash response and require rejection/repair. Browser tests play both sports through scoring, win/loss, restart and touch input. Native Vercel HTTP tests create and edit both sport designs with mocked upstream responses. Screenshots are in docs/screenshots; live production prompt checks follow the main deployment and are recorded in TEST_RESULTS.

## Live verification

On the user’s production Vercel URL, both exact requests now return 200 and the matching family. Browser creation loads a cricket pitch with bat/runs/wickets and a basketball court with aim/power/hoop controls, rather than a neon runner. Cricket scored a live run; basketball’s physical shot and miss counter were exercised. Local browser tests score basketball baskets through victory and validate the corrected green-band trajectory guide. A live chess prompt is declined explicitly. See TEST_RESULTS and the live sport screenshots for evidence and verification limits.
