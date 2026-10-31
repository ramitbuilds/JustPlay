import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Maximize,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { CodeGame } from "./code-game";
import type { SandboxMessage } from "./sandbox";
export default function CodePlayer({
  game,
  onThumbnail,
  onRuntimeError,
}: {
  game: CodeGame;
  onThumbnail?: (data: string) => void;
  onRuntimeError?: (message: string) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null),
    shell = useRef<HTMLDivElement>(null),
    channel = useRef(crypto.randomUUID()),
    callbacks = useRef({ onThumbnail, onRuntimeError });
  callbacks.current = { onThumbnail, onRuntimeError };
  const [state, setState] = useState<
      "loading" | "ready" | "playing" | "paused" | "won" | "lost" | "error"
    >("loading"),
    [error, setError] = useState(""),
    [hud, setHud] = useState<{
      status: string;
      stats: { label: string; value: string }[];
    }>({ status: "", stats: [] }),
    [sound, setSound] = useState(false),
    [restart, setRestart] = useState(0),
    [notice, setNotice] = useState("");
  const stateRef = useRef(state);
  stateRef.current = state;
  function post(data: Record<string, unknown>) {
    frame.current?.contentWindow?.postMessage(
      { channel: channel.current, ...data },
      "*",
    );
  }
  useLayoutEffect(() => {
    setState("loading");
    setError("");
    setHud({ status: "", stats: [] });
    const timeout = window.setTimeout(() => {
      if (stateRef.current === "loading") {
        setError(
          "The generated game did not start. Ask AI to repair its code.",
        );
        setState("error");
      }
    }, 7000);
    const receive = (event: MessageEvent<SandboxMessage>) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== "null" ||
        event.data?.channel !== channel.current
      )
        return;
      const d = event.data;
      if (d.type === "playing") setState(d.playing ? "playing" : "paused");
      if (d.type === "ready") {
        clearTimeout(timeout);
        setState("ready");
      }
      if (d.type === "error") {
        clearTimeout(timeout);
        const message = String(
          d.message || "The generated code stopped.",
        ).slice(0, 700);
        setError(message);
        setState("error");
        callbacks.current.onRuntimeError?.(message);
      }
      if (d.type === "hud")
        setHud({
          status: String(d.status ?? "").slice(0, 220),
          stats: Array.isArray(d.stats)
            ? d.stats.slice(0, 6).map((v) => ({
                label: String(v.label).slice(0, 24),
                value: String(v.value).slice(0, 40),
              }))
            : [],
        });
      if (
        d.type === "finish" &&
        (d.outcome === "won" || d.outcome === "lost")
      ) {
        setState(d.outcome);
        setNotice(String(d.message ?? "").slice(0, 240));
      }
      if (d.type === "blur" && stateRef.current === "playing")
        setState("paused");
      if (
        d.type === "thumbnail" &&
        d.data &&
        d.data.length < 180000 &&
        /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(d.data)
      )
        callbacks.current.onThumbnail?.(d.data);
    };
    window.addEventListener("message", receive);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("message", receive);
    };
  }, [game, restart]);
  useEffect(() => {
    post({ type: "sound", enabled: sound });
  }, [sound, state]);
  function play() {
    post({ type: "playing", playing: true });
  }
  function pause() {
    if (state === "paused") {
      play();
      return;
    }
    post({ type: "playing", playing: false });
    setState("paused");
  }
  function reset() {
    channel.current = crypto.randomUUID();
    setRestart((n) => n + 1);
  }
  return (
    <div className="player-shell code-player" ref={shell}>
      <div className="player-hud generated-hud">
        {hud.stats.map((s, i) => (
          <span key={i}>
            <span>{s.label}</span>
            <b>{s.value}</b>
          </span>
        ))}
        {!hud.stats.length && <span>AI-written game · 800 × 450</span>}
      </div>
      <div className="game-stage">
        <iframe
          key={restart + ":" + game.code}
          ref={frame}
          title={game.title + " isolated game"}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          src="/sandbox.html"
          className="code-frame"
          onLoad={() => post({ type: "init", code: game.code })}
        />
        {state !== "playing" && (
          <div className="game-overlay">
            <div>
              <h3>
                {state === "loading"
                  ? "Loading generated code…"
                  : state === "ready"
                    ? game.title
                    : state === "paused"
                      ? "Paused"
                      : state === "won"
                        ? "You did it."
                        : state === "lost"
                          ? "Try again?"
                          : "This code needs a repair."}
              </h3>
              <p>
                {state === "error"
                  ? error
                  : state === "ready"
                    ? game.instructions
                    : state === "loading"
                      ? "Starting the isolated game worker."
                      : notice || "Your game is paused."}
              </p>
              {state === "ready" || state === "paused" ? (
                <button className="accent" onClick={play}>
                  <Play size={16} />
                  {state === "paused" ? "Resume" : "Play game"}
                </button>
              ) : state === "won" || state === "lost" ? (
                <button className="accent" onClick={reset}>
                  <RotateCcw size={16} />
                  Restart game
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
      {hud.status && (
        <p className="sports-feedback" role="status">
          {hud.status}
        </p>
      )}
      <div className="player-toolbar">
        <div className="toolbar-actions">
          <button
            onClick={pause}
            disabled={!["playing", "paused"].includes(state)}
            aria-label={state === "paused" ? "Resume game" : "Pause game"}
          >
            {state === "paused" ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button aria-label="Restart game" onClick={reset}>
            <RotateCcw size={16} />
          </button>
          <button
            aria-label={sound ? "Mute sound" : "Enable sound"}
            aria-pressed={sound}
            onClick={() => setSound((v) => !v)}
          >
            {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
        <span className="control-hint">
          Controls come from this game’s generated source.
        </span>
        <button
          aria-label="Toggle fullscreen"
          onClick={async () => {
            try {
              if (document.fullscreenElement) await document.exitFullscreen();
              else await shell.current?.requestFullscreen();
            } catch {
              setNotice(
                "Fullscreen is unavailable; you can keep playing here.",
              );
            }
          }}
        >
          <Maximize size={16} />
        </button>
      </div>
      {game.controls.length > 0 && (
        <div
          className="generated-controls"
          aria-label="Generated game controls"
        >
          {game.controls.map((c) => (
            <button
              key={c.key}
              disabled={state !== "playing"}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                frame.current?.contentWindow?.focus();
                post({ type: "key", key: c.key, down: true });
              }}
              onPointerUp={() => post({ type: "key", key: c.key, down: false })}
              onPointerCancel={() =>
                post({ type: "key", key: c.key, down: false })
              }
              onKeyDown={(e) => {
                if (["Enter", " "].includes(e.key)) {
                  e.preventDefault();
                  post({ type: "key", key: c.key, down: true });
                }
              }}
              onKeyUp={() => post({ type: "key", key: c.key, down: false })}
              onBlur={() => post({ type: "key", key: c.key, down: false })}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
      {notice && state !== "won" && state !== "lost" && (
        <p className="fullscreen-notice" role="status">
          {notice}
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        Game {state}. {state === "error" ? error : ""}
      </p>
    </div>
  );
}
