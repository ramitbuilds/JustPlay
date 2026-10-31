import type { ProviderEnv } from "./providers";

export function providerEnvironment(env: NodeJS.ProcessEnv): ProviderEnv {
  const groq = env.GROQ_API_KEY?.trim();
  const gemini = env.GEMINI_API_KEY?.trim();
  // Vercel doesn't read wrangler.jsonc. A single configured key is unambiguous;
  // if both keys exist, require an explicit provider instead of guessing.
  return {
    AI_PROVIDER:
      env.AI_PROVIDER?.trim() ||
      (groq && !gemini ? "groq" : gemini && !groq ? "gemma" : undefined),
    GROQ_API_KEY: groq,
    GEMINI_API_KEY: gemini,
    GROQ_MODEL: env.GROQ_MODEL?.trim(),
    GEMMA_MODEL: env.GEMMA_MODEL?.trim(),
  };
}
