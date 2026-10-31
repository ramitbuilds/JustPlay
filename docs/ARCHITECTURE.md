# Architecture

Vite / React / TypeScript UI; lazily loaded Phaser 3 Arcade physics; Zod strict GameSpec; IndexedDB via idb; Cloudflare Worker with Static Assets and a shared Pages-compatible function for AI. CSS tokens replace Tailwind because this small original design needs no utility dependency.

A validated specification chooses genre, theme, hero, objective, difficulty, seed, enemy variants and bounded mechanics. Deterministic composers create continuous platform routes, spaced runner obstacles and an open survival arena. No AI JavaScript is executed. Asset IDs are enums mapped to local sprites.

Shared server validation limits prompt size and reparses AI responses once through a bounded repair request. Separate Groq chat-completions and Gemini generateContent adapters share semantic checks. API disabled without credentials and enforced rate-limit binding. Browser persistence validates imported and saved data; versions are immutable copies.
