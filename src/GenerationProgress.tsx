import { useEffect, useId, useRef, useState } from "react";
import { Check, LoaderCircle, Sparkles } from "lucide-react";
import LoadingSkeleton from "./LoadingSkeleton";
export type GenerationStage = "writing" | "checking" | "repairing";
export default function GenerationProgress({
  phase,
  stage,
}: {
  phase: string;
  stage: GenerationStage;
}) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.scrollIntoView({
      block: "center",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, []);
  const [started] = useState(Date.now),
    [seconds, setSeconds] = useState(0),
    [percent, setPercent] = useState(6);
  const note = useId();
  useEffect(() => {
    const tick = () => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      setSeconds(elapsed);
      const estimated = Math.round(6 + 89 * (1 - Math.exp(-elapsed / 70)));
      setPercent((previous) =>
        Math.min(
          95,
          Math.max(
            previous,
            estimated,
            stage === "checking" ? 86 : stage === "repairing" ? 72 : 6,
          ),
        ),
      );
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [started, stage]);
  const heading =
    stage === "checking"
      ? "Trying out your game…"
      : stage === "repairing"
        ? "Giving your game another pass…"
        : "Your idea is becoming a game.";
  const eta =
    stage === "repairing"
      ? "An AI repair can add another 1–2 minutes."
      : seconds >= 120
        ? "Longer than the usual estimate. We’re still waiting for the result."
        : stage === "checking"
          ? "Running the game and checking its controls."
          : `Estimated time left: ${Math.max(5, 60 - seconds)}–${Math.max(15, 120 - seconds)} seconds.`;
  return (
    <section className="generation-panel" aria-label="Game generation progress">
      <div className="generation-copy">
        <span className="eyebrow">
          <Sparkles size={14} aria-hidden="true" /> A little imagination, in
          progress
        </span>
        <div className="generation-heading">
          <h2>{heading}</h2>
          <span className="generation-percent">
            {percent}
            <small>% estimated</small>
          </span>
        </div>
        <p className="generation-phase" role="status">
          <LoaderCircle className="spin" size={15} aria-hidden="true" />
          {phase || "Connecting to the AI…"}
        </p>
        <div
          className="generation-track"
          role="progressbar"
          aria-label="Estimated generation progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`${percent}% estimated. ${phase}`}
          aria-describedby={note}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
        <div className="generation-timing">
          <span>{eta}</span>
          <span>
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}{" "}
            elapsed
          </span>
        </div>
        <ol className="generation-steps">
          <li className={stage === "writing" ? "current" : "done"}>
            {stage === "writing" ? (
              <span>1</span>
            ) : (
              <Check size={14} aria-hidden="true" />
            )}
            Write the game
          </li>
          <li className={stage !== "writing" ? "current" : ""}>
            <span>2</span>
            {stage === "repairing" ? "Refine & check" : "Check controls"}
          </li>
          <li>
            <span>3</span>Ready to play
          </li>
        </ol>
        <p className="estimate-note" id={note}>
          Usually 1–2 minutes. Progress and timing are estimates, not exact AI
          measurements. MVP games may need a retry or a small edit.
        </p>
      </div>
      <LoadingSkeleton />
    </section>
  );
}
