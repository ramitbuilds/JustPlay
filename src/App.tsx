import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Play,
  Plus,
  Sparkles,
  Library,
  Download,
  Upload,
  Check,
  Trash2,
  Save,
  ChevronRight,
  LoaderCircle,
  X,
  WandSparkles,
} from "lucide-react";
import { isCodeGame, type CodeGame } from "./code-game";
import { probeGame } from "./sandbox";
import CodePlayer from "./CodePlayer";
import { requestGame } from "./api";
import {
  deleteGame,
  importGame,
  listGames,
  saveGame,
  type SavedGame,
  type PlayableGame,
} from "./storage";
import GamePlayer from "./GamePlayer";
type Session = {
  id: string;
  versions: PlayableGame[];
  source: "ai" | "example";
  prompt: string;
  index: number;
  thumbnail?: string;
};
const ideas = [
  "A pinball table inside a greenhouse, with flower bumpers and a bee-shaped ball",
  "A chess puzzle about escaping a maze of moving pieces",
  "A cricket fielding game where I catch high balls",
  "A taxi game where I pick up passengers in a rainy town",
];
function App() {
  const [route, setRoute] = useState(location.hash.slice(1) || "home"),
    [prompt, setPrompt] = useState(""),
    [session, setSession] = useState<Session | null>(null),
    [pending, setPending] = useState(false),
    [phase, setPhase] = useState(""),
    [error, setError] = useState(""),
    [formError, setFormError] = useState<{
      target: "create" | "edit";
      message: string;
    } | null>(null),
    [notice, setNotice] = useState(""),
    [edit, setEdit] = useState(""),
    [games, setGames] = useState<SavedGame[]>([]),
    [corrupt, setCorrupt] = useState(0),
    [saved, setSaved] = useState(false),
    [runtimeError, setRuntimeError] = useState(""),
    [showCode, setShowCode] = useState(false),
    [deleting, setDeleting] = useState<string | null>(null);
  const composer = useRef<HTMLTextAreaElement>(null),
    editInput = useRef<HTMLTextAreaElement>(null),
    fileInput = useRef<HTMLInputElement>(null),
    title = useRef<HTMLHeadingElement>(null);
  const spec = session?.versions[session.index];
  useEffect(() => {
    setRuntimeError("");
  }, [spec]);
  useEffect(() => {
    const change = () => {
      setRoute(location.hash.slice(1) || "home");
      setError("");
      setFormError(null);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    if (route === "gallery") void refresh();
    title.current?.focus();
    window.scrollTo(0, 0);
  }, [route]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (session && !saved) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [session, saved]);
  useEffect(() => {
    if (!pending && formError)
      (formError.target === "create" ? composer : editInput).current?.focus();
  }, [pending, formError]);
  async function refresh() {
    try {
      const result = await listGames();
      setGames(result.games);
      setCorrupt(result.corrupt);
    } catch {
      setError(
        "Your browser could not open local storage. Allow site storage, or export your game instead.",
      );
    }
  }
  async function checkAndRepair(game: CodeGame) {
    setPhase("Checking the generated game…");
    try {
      await probeGame(game);
      return game;
    } catch (failure) {
      setPhase("Asking AI to repair a startup error…");
      const repaired = await requestGame(
        "Repair the runtime failure while preserving this game's intended rules and artwork.",
        game,
        failure instanceof Error ? failure.message : "Startup failed",
        setPhase,
      );
      await probeGame(repaired);
      return repaired;
    }
  }
  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (prompt.trim().length < 3) {
      setFormError({
        target: "create",
        message: "Describe your game in at least 3 characters.",
      });
      composer.current?.focus();
      return;
    }
    setFormError(null);
    setPending(true);
    setError("");
    setPhase("AI is writing your game…");
    try {
      const design = await checkAndRepair(
        await requestGame(prompt, undefined, undefined, setPhase),
      );
      setPhase("Code checked. Loading your game…");
      setSession({
        id: crypto.randomUUID(),
        versions: [design],
        index: 0,
        source: "ai",
        prompt,
      });
      setSaved(false);
      setNotice("AI-written game checked. Ready to play.");
      location.hash = "studio";
    } catch (err) {
      setFormError({
        target: "create",
        message:
          err instanceof Error
            ? err.message
            : "Could not generate this game. Try again.",
      });
      composer.current?.focus();
    } finally {
      setPending(false);
      setPhase("");
    }
  }
  async function revise(e: React.FormEvent) {
    e.preventDefault();
    if (!spec || !session || edit.trim().length < 3) {
      setFormError({
        target: "edit",
        message: "Describe the change in at least 3 characters.",
      });
      editInput.current?.focus();
      return;
    }
    if (session.versions.length >= 30) {
      setError(
        "This game has reached 30 versions. Export it and start a new game.",
      );
      return;
    }
    setFormError(null);
    setPending(true);
    setError("");
    setPhase("AI is editing the source…");
    try {
      const next = await checkAndRepair(
        isCodeGame(spec)
          ? await requestGame(edit, spec, runtimeError || undefined, setPhase)
          : await requestGame(session.prompt + "\nRequested changes: " + edit),
      );
      setRuntimeError("");
      setSession({
        ...session,
        versions: [...session.versions, next],
        source: "ai",
        thumbnail: undefined,
        index: session.versions.length,
      });
      setSaved(false);
      setNotice(
        `Version ${session.versions.length + 1} ready. AI code edit checked.`,
      );
      setEdit("");
    } catch (err) {
      setFormError({
        target: "edit",
        message:
          err instanceof Error ? err.message : "Could not apply this edit.",
      });
    } finally {
      setPending(false);
      setPhase("");
    }
  }
  async function persist() {
    if (!session) return;
    try {
      await saveGame({
        id: session.id,
        versions: session.versions,
        source: session.source,
        prompt: session.prompt,
        updated: Date.now(),
        thumbnail: session.thumbnail,
      });
      setSaved(true);
      setNotice("Saved to your library on this browser.");
    } catch {
      setError(
        "Could not save to this browser. Export the game to keep a copy.",
      );
    }
  }
  function exportSpec() {
    if (!spec) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(spec, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "justplay-game.json";
    a.click();
    URL.revokeObjectURL(url);
    setNotice("Game exported.");
  }
  async function readFile(file?: File) {
    if (!file) return;
    try {
      const next = await importGame(file);
      if (isCodeGame(next)) await probeGame(next);
      setSession({
        id: crypto.randomUUID(),
        versions: [next],
        index: 0,
        source: isCodeGame(next) ? "ai" : "example",
        prompt: "Imported game",
      });
      setSaved(false);
      setNotice("Game imported.");
      location.hash = "studio";
    } catch {
      setError(
        "That file is not a valid JustPlay game. Choose an exported JSON game under 100 KB.",
      );
    }
    if (fileInput.current) fileInput.current.value = "";
  }
  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <a className="brand" href="#home" aria-label="JustPlay home">
          <span className="brand-symbol">
            <Play fill="currentColor" size={17} />
          </span>
          justplay<span className="brand-period">.</span>
        </a>
        <nav aria-label="Main navigation">
          <a className={route === "home" ? "active" : ""} href="#home">
            Create
          </a>
          <a className={route === "gallery" ? "active" : ""} href="#gallery">
            <Library size={15} />
            Your library
            {games.length > 0 && <span className="count">{games.length}</span>}
          </a>
        </nav>
        <span className="header-note">Small idea. Whole new world.</span>
      </header>
      <main id="main" tabIndex={-1}>
        {route === "home" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <h1 ref={title} tabIndex={-1}>
                  Your imagination,
                  <br />
                  <span>playable.</span>
                </h1>
                <p>
                  Describe your game. Play it immediately.
                  <br />A little idea is all it takes to start a whole new
                  adventure.
                </p>
              </div>
              <div className="hero-art code-hero" aria-hidden="true">
                <span className="code-window-dots">● ● ●</span>
                <span className="code-hero-symbol">{"{ play }"}</span>
                <p>
                  Your idea becomes
                  <br />
                  <b>rules, art &amp; code.</b>
                </p>
                <div className="art-caption">
                  <span className="status-dot" /> Written by AI. Played by you.
                </div>
              </div>
            </section>
            <section className="create-section" aria-label="Create a game">
              <form className="composer" onSubmit={generate}>
                <label htmlFor="game-prompt">
                  <Sparkles size={18} />
                  What do you want to play?
                </label>
                <textarea
                  id="game-prompt"
                  aria-invalid={formError?.target === "create" || undefined}
                  aria-describedby={
                    formError?.target === "create"
                      ? "create-error"
                      : "create-help"
                  }
                  ref={composer}
                  name="prompt"
                  autoComplete="off"
                  maxLength={6000}
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A tiny fox exploring a forest full of glowing crystals…"
                  disabled={pending}
                />
                {formError?.target === "create" && (
                  <p id="create-error" className="form-error" role="alert">
                    {formError.message}
                  </p>
                )}
                <div className="composer-bottom">
                  <span>
                    Your idea. Original game code.
                    <small>AI writes the mechanics and visuals.</small>
                  </span>
                  <button className="primary" disabled={pending} type="submit">
                    {pending ? (
                      <LoaderCircle className="spin" size={18} />
                    ) : (
                      <WandSparkles size={18} />
                    )}{" "}
                    {pending ? "Designing…" : "Create my game"}
                    <ArrowUpRight size={18} />
                  </button>
                </div>
              </form>
              <p className="honesty" id="create-help">
                Describe any game idea. AI builds a compact 2D prototype;
                complex ideas may be simplified. Generation uses your provider’s
                available free quota and can need a repair.
              </p>
            </section>
            <section className="examples-section">
              <div className="section-heading">
                <div>
                  <h2>Where will your idea go?</h2>
                  <p>
                    Writing prompts to start from. Every game is generated when
                    you ask.
                  </p>
                </div>
              </div>
              <div className="idea-grid">
                {ideas.map((idea) => (
                  <button
                    key={idea}
                    className="idea-card"
                    onClick={() => {
                      setPrompt(idea);
                      composer.current?.focus();
                      composer.current?.scrollIntoView({
                        block: "center",
                        behavior: "smooth",
                      });
                    }}
                  >
                    {idea}
                    <ArrowUpRight size={18} />
                  </button>
                ))}
              </div>
            </section>
            <section className="closing">
              <span className="brand-symbol small">
                <Play fill="currentColor" size={14} />
              </span>
              <h2>
                Less setting up.
                <br />
                More “one more try.”
              </h2>
              <p>
                Your games stay in your browser.
                <br />
                No account. Just an idea and a little curiosity.
              </p>
            </section>
          </>
        )}
        {route === "studio" && spec && session && (
          <section className="studio">
            <div className="studio-top">
              <div>
                <a className="back-link" href="#home">
                  <ArrowLeft size={15} />
                  Create another world
                </a>
                <h1 ref={title} tabIndex={-1}>
                  {spec.title}
                </h1>
                <p>
                  {isCodeGame(spec) ? "AI-written source" : "Legacy saved game"}{" "}
                  · v{session.index + 1}
                </p>
              </div>
              <div className="studio-actions">
                <button onClick={exportSpec}>
                  <Download size={16} />
                  Export
                </button>
                <button className="primary" onClick={persist}>
                  {saved ? <Check size={16} /> : <Save size={16} />}{" "}
                  {saved ? "Saved" : "Save game"}
                </button>
              </div>
            </div>
            <div className="studio-layout">
              <div className="play-column">
                {isCodeGame(spec) ? (
                  <CodePlayer
                    key={session.id + ":" + session.index}
                    game={spec}
                    onRuntimeError={setRuntimeError}
                    onThumbnail={(thumbnail) =>
                      setSession((current) =>
                        current && current.index === current.versions.length - 1
                          ? { ...current, thumbnail }
                          : current,
                      )
                    }
                  />
                ) : (
                  <GamePlayer spec={spec} />
                )}
                <div className="game-notes">
                  <h2>How to play</h2>
                  <p>
                    {isCodeGame(spec) ? spec.instructions : spec.description}
                  </p>
                  {isCodeGame(spec) && spec.notes && <p>{spec.notes}</p>}
                  {isCodeGame(spec) && (
                    <>
                      <button onClick={() => setShowCode(!showCode)}>
                        {showCode ? "Hide source" : "View generated source"}
                      </button>
                      {showCode && (
                        <pre className="source-view" tabIndex={0}>
                          <code>{spec.code}</code>
                        </pre>
                      )}
                    </>
                  )}
                </div>
              </div>
              <aside className="edit-panel">
                <div className="edit-title">
                  <WandSparkles size={20} />
                  <h2>Make it yours.</h2>
                </div>
                <p>
                  Change a rule. Set a new mood.
                  <br />
                  See where your idea goes next.
                </p>
                <form onSubmit={revise}>
                  <label htmlFor="edit-prompt">What would you change?</label>
                  <textarea
                    ref={editInput}
                    id="edit-prompt"
                    aria-invalid={formError?.target === "edit" || undefined}
                    aria-describedby={
                      formError?.target === "edit" ? "edit-error" : undefined
                    }
                    name="edit"
                    autoComplete="off"
                    value={edit}
                    onChange={(e) => setEdit(e.target.value)}
                    maxLength={6000}
                    placeholder="Describe a change to the rules, controls or artwork…"
                    rows={4}
                    disabled={pending}
                  />
                  {formError?.target === "edit" && (
                    <p id="edit-error" className="form-error" role="alert">
                      {formError.message}
                    </p>
                  )}
                  <button className="primary" disabled={pending} type="submit">
                    {pending ? (
                      <LoaderCircle className="spin" size={16} />
                    ) : (
                      <Plus size={16} />
                    )}
                    Apply changes
                    <ArrowRight size={16} />
                  </button>
                </form>
                {runtimeError && (
                  <div role="alert">
                    <p>The generated code stopped: {runtimeError}</p>
                    <button
                      disabled={pending}
                      onClick={() => {
                        setEdit(
                          "Repair this runtime error while preserving the game's rules and visuals.",
                        );
                        editInput.current?.focus();
                      }}
                    >
                      Ask AI to repair
                    </button>
                  </div>
                )}
                <p className="local-note">
                  AI edits the actual source. Your earlier versions stay
                  available. Each request uses the provider’s free quota.
                </p>
                <div className="versions">
                  <h3>Version history</h3>
                  {session.versions.map((_v, i) => (
                    <button
                      key={i}
                      aria-current={i === session.index ? "true" : undefined}
                      disabled={pending}
                      onClick={() => setSession({ ...session, index: i })}
                    >
                      <span>
                        <b>Version {i + 1}</b>
                        <small>
                          {i === 0 ? "Original game" : "AI source revision"}
                        </small>
                      </span>
                      {i === session.index ? (
                        <Check size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </button>
                  ))}
                </div>
              </aside>
            </div>
          </section>
        )}
        {route === "studio" && !session && (
          <section className="empty-state">
            <h1 ref={title} tabIndex={-1}>
              A world is waiting.
            </h1>
            <p>Describe a game to open the studio.</p>
            <a className="button primary" href="#home">
              Start creating
              <ArrowRight size={16} />
            </a>
          </section>
        )}
        {route === "gallery" && (
          <section className="gallery">
            <div className="section-heading">
              <div>
                <h1 ref={title} tabIndex={-1}>
                  Your little worlds.
                </h1>
                <p>Saved on this browser. Ready for another adventure.</p>
              </div>
              <div className="studio-actions">
                <button onClick={() => fileInput.current?.click()}>
                  <Upload size={16} />
                  Import game
                </button>
                <a className="button primary" href="#home">
                  <Plus size={16} />
                  New game
                </a>
              </div>
            </div>
            {corrupt > 0 && (
              <p role="status">
                {corrupt} damaged save{corrupt > 1 ? "s were" : " was"} skipped.
                Valid games are still available.
              </p>
            )}
            {games.length === 0 ? (
              <div className="empty-state">
                <Library size={42} strokeWidth={1} />
                <h2>Room for your first world.</h2>
                <p>Create a game, make it your own, then save it here.</p>
                <a className="button primary" href="#home">
                  Find your first game
                  <ArrowRight size={16} />
                </a>
              </div>
            ) : (
              <div className="examples-grid">
                {games.map((game) => {
                  const v = game.versions.at(-1)!;
                  return (
                    <article className="example" key={game.id}>
                      <button
                        className="preview-button"
                        onClick={() => {
                          setSession({
                            ...game,
                            index: game.versions.length - 1,
                          });
                          setSaved(true);
                          location.hash = "studio";
                        }}
                        aria-label={`Open ${v.title}`}
                      >
                        <div className="saved-preview">
                          {game.thumbnail ? (
                            <img
                              src={game.thumbnail}
                              alt=""
                              width="320"
                              height="180"
                              loading="lazy"
                            />
                          ) : (
                            <span aria-hidden="true">{"{ play }"}</span>
                          )}
                        </div>
                        <span className="preview-play">
                          <Play size={18} />
                        </span>
                      </button>
                      <div className="example-heading">
                        <h2>{v.title}</h2>
                        <button
                          aria-label={`Delete ${v.title}`}
                          onClick={() => setDeleting(game.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p>
                        {isCodeGame(v) ? "Generated source" : "Legacy save"} ·{" "}
                        {game.versions.length} version
                        {game.versions.length > 1 ? "s" : ""}
                      </p>
                      {deleting === game.id && (
                        <div className="delete-confirm">
                          <p>Delete this local save?</p>
                          <button
                            onClick={async () => {
                              try {
                                await deleteGame(game.id);
                                setDeleting(null);
                                await refresh();
                                setNotice("Game removed from your library.");
                              } catch {
                                setError(
                                  "Could not delete this save. Try again.",
                                );
                              }
                            }}
                          >
                            Delete game
                          </button>
                          <button onClick={() => setDeleting(null)}>
                            Keep game
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
        {!["home", "studio", "gallery"].includes(route) && (
          <section className="empty-state">
            <h1>Let’s find your way back.</h1>
            <a href="#home">Go to JustPlay</a>
          </section>
        )}
        {(error || notice || pending) && (
          <div
            className={`notification ${error ? "error" : ""}`}
            role={error ? "alert" : "status"}
            aria-live="polite"
          >
            <span>{pending ? phase : error || notice}</span>
            {!pending && (
              <button
                aria-label="Dismiss notification"
                onClick={() => {
                  setError("");
                  setNotice("");
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
        <input
          className="sr-only"
          type="file"
          accept="application/json,.json"
          aria-label="Import a JustPlay game"
          ref={fileInput}
          onChange={(e) => void readFile(e.target.files?.[0])}
        />
      </main>
      <footer>
        <a className="brand" href="#home">
          justplay.
        </a>
        <span>A little imagination goes a long way.</span>
        <a
          href="https://github.com/ramitbuilds/JustPlay"
          target="_blank"
          rel="noreferrer"
        >
          Made to be played
          <ArrowUpRight size={14} />
        </a>
      </footer>
    </>
  );
}
export default App;
