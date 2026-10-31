import { validateCodeGame, type CodeGame } from "./code-game";
export async function readGameStream(
  response: Response,
  onProgress?: (message: string) => void,
): Promise<CodeGame> {
  const reader = response.body?.getReader();
  if (!reader) throw Error("The generation stream is empty. Please retry.");
  const decoder = new TextDecoder();
  let pending = "",
    bytes = 0;
  const consume = (line: string): CodeGame | undefined => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.type === "error")
      throw Error(
        typeof event.error === "string"
          ? event.error
          : "Generation failed. Please retry.",
      );
    if (event.type === "progress" && typeof event.message === "string")
      onProgress?.(event.message.slice(0, 240));
    if (event.type === "result") return validateCodeGame(event.game);
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 524288)
        throw Error(
          "The generation response exceeded its size budget. Please retry.",
        );
      pending += decoder.decode(value, { stream: true });
      let newline;
      while ((newline = pending.indexOf("\n")) !== -1) {
        const game = consume(pending.slice(0, newline));
        pending = pending.slice(newline + 1);
        if (game) return game;
      }
    }
    pending += decoder.decode();
    const game = consume(pending);
    if (game) return game;
    throw Error(
      "The generation connection ended before a complete game arrived. Please retry.",
    );
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
