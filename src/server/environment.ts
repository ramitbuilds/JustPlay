import type { ProviderEnv } from "./providers.js";

export function providerEnvironment(env: NodeJS.ProcessEnv): ProviderEnv {
  const groq = env.GROQ_API_KEY?.trim();
  const gemini = env.GEMINI_API_KEY?.trim();
  // Gemma through Google AI Studio is the default. A stale Groq key never selects it implicitly.
  return {
    AI_PROVIDER: env.AI_PROVIDER?.trim() || "gemma",
    GROQ_API_KEY: groq,
    GEMINI_API_KEY: gemini,
    GROQ_MODEL: env.GROQ_MODEL?.trim(),
    GEMMA_MODEL: env.GEMMA_MODEL?.trim(),
  };
}
