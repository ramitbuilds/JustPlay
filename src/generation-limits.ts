// Keep two bounded provider attempts below Vercel's 300-second Fluid Compute limit.
export const PROVIDER_TIMEOUT_MS = 105_000;
export const GENERATION_BUDGET_MS = 225_000;
export const CLIENT_TIMEOUT_MS = 240_000;
