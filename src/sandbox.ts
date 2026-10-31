import { prepareGame } from "./game-bundle";
import type { CodeGame } from "./code-game";
export type SandboxMessage = {
  channel: string;
  type: string;
  message?: string;
  status?: string;
  stats?: { label: string; value: string }[];
  outcome?: "won" | "lost";
  data?: string;
  frames?: number;
  playing?: boolean;
};
export async function probeGame(game: CodeGame): Promise<void> {
  const bundle = await prepareGame(game);
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe"),
      channel = crypto.randomUUID();
    frame.sandbox.add("allow-scripts");
    frame.src = "/sandbox.html";
    frame.title = "Checking generated game";
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText =
      "position:fixed;left:-10000px;top:0;width:800px;height:450px;border:0";
    let ready = false,
      done = false;
    const timeout = window.setTimeout(
      () =>
        finish(
          new Error(
            "The generated game did not start within the validation budget.",
          ),
        ),
      20000,
    );
    function finish(error?: Error) {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      window.removeEventListener("message", message);
      frame.contentWindow?.postMessage({ channel, type: "stop" }, "*");
      frame.remove();
      if (error) reject(error);
      else resolve();
    }
    function message(event: MessageEvent<SandboxMessage>) {
      if (
        event.source !== frame.contentWindow ||
        event.origin !== "null" ||
        event.data?.channel !== channel
      )
        return;
      const data = event.data;
      if (data.type === "error")
        finish(
          new Error(data.message || "The generated game failed to start."),
        );
      if (data.type === "verified") finish();
      if (data.type === "ready") {
        ready = true;
        frame.contentWindow?.postMessage(
          { channel, type: "playing", playing: true, probe: true },
          "*",
        );
      }
      if (data.type === "finish" && ready) finish();
      if (data.type === "beat" && ready && (data.frames ?? 0) >= 8) finish();
    }
    window.addEventListener("message", message);
    frame.onload = () =>
      frame.contentWindow?.postMessage(
        { channel, type: "init", ...bundle, probe: true },
        "*",
      );
    document.body.append(frame);
  });
}
