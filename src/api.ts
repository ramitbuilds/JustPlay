import { CLIENT_TIMEOUT_MS } from "./generation-limits";
import { readGameStream } from "./response-stream";
import { validateCodeGame, type CodeGame } from "./code-game";
export async function requestGame(
  prompt: string,
  current?: CodeGame,
  runtimeError?: string,
  onProgress?: (message: string) => void,
): Promise<CodeGame> {
  let response: Response;
  try {
    response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/x-ndjson",
      },
      body: JSON.stringify({ prompt, current, runtimeError }),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      ["TimeoutError", "AbortError"].includes(error.name)
    )
      throw new Error(
        "Game creation took too long. Try again with a simpler idea. Your current game is unchanged.",
      );
    throw new Error(
      "Could not reach the game service. Check your connection and try again.",
    );
  }
  if (
    response.ok &&
    response.headers.get("Content-Type")?.includes("application/x-ndjson")
  ) {
    try {
      return await readGameStream(response, onProgress);
    } catch (error) {
      if (
        error instanceof Error &&
        ["TimeoutError", "AbortError"].includes(error.name)
      )
        throw Error(
          "Generation exceeded the browser time budget. Please retry; your current game is unchanged.",
        );
      if (error instanceof TypeError)
        throw Error(
          "The connection to the game service ended during generation. Please retry; your current game is unchanged.",
        );
      if (error instanceof SyntaxError)
        throw Error(
          "The game service returned an unreadable generation stream. Please retry.",
        );
      throw error;
    }
  }
  if (!response.headers.get("Content-Type")?.includes("application/json")) {
    if (response.status === 429)
      throw new Error("Too many game requests. Wait a minute and try again.");
    if (response.status === 504)
      throw new Error(
        "Game creation took too long. Try again with a simpler idea.",
      );
    if (response.status >= 500)
      throw new Error(
        "The game service is temporarily unavailable. Try again shortly; if it continues, check the Vercel function deployment.",
      );
    if ([401, 403].includes(response.status))
      throw new Error(
        "This deployment requires access. Sign in to the deployment, or open its public production URL.",
      );
    throw new Error(
      "The game API is missing from this deployment. Redeploy the latest main branch with Vercel’s Vite preset, then try again. ",
    );
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "The game service returned an unreadable response. Try again; your current game is unchanged.",
    );
  }
  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : undefined;
    throw new Error(message || "Could not generate this game. Try again.");
  }
  try {
    return validateCodeGame(
      data && typeof data === "object" && "game" in data
        ? data.game
        : undefined,
    );
  } catch {
    throw new Error(
      "The game service returned an invalid code artifact. Try a simpler idea; your current game is unchanged.",
    );
  }
}
