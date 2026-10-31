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
import { examples, sportsExamples, editFixture } from "./fixtures";
import { type GameSpec } from "./spec";
import { requestGame } from "./api";
import {
  deleteGame,
  importGame,
  listGames,
  saveGame,
  type SavedGame,
} from "./storage";
import GamePlayer from "./GamePlayer";
const genreLabel = {
  platformer: "Platformer",
  runner: "Endless runner",
  survival: "Survival",
  basketball: "Basketball shootout",
  cricket: "Cricket batting",
};
const showcasedGames = [...examples, ...sportsExamples];
type Session = {
  id: string;
  versions: GameSpec[];
  source: "ai" | "example";
  prompt: string;
  index: number;
};
function World({ spec, large = false }: { spec: GameSpec; large?: boolean }) {
  return (
    <div
      className={`world-art ${spec.theme} ${spec.genre === "basketball" || spec.genre === "cricket" ? "sports" : ""} ${spec.genre === "survival" ? "arena" : ""} ${large ? "large" : ""}`}
      style={{ backgroundImage: `url(/assets/${spec.theme}.svg)` }}
      aria-hidden="true"
    >
      <div className="world-ground" />
      <span className={`sprite ${spec.hero}`} />
      <span className="crystal c1" />
      <span className="crystal c2" />
      <span className="crystal c3" />
      <span className="world-platform" />
      <span className="world-portal" />
      {(spec.genre === "basketball" || spec.genre === "cricket") && (
        <>
          <span className={`sport-prop ${spec.genre}`} />
          <span className="sport-ball" />
        </>
      )}
      {spec.genre === "survival" && (
        <>
          <span className="sprite slime enemy-preview" />
          <span className="sprite bat enemy-preview flying" />
        </>
      )}
      {spec.theme === "forest" && (
        <>
          <span className="tree t1" />
          <span className="tree t2" />
        </>
      )}
    </div>
  );
}
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
    [deleting, setDeleting] = useState<string | null>(null);
  const composer = useRef<HTMLTextAreaElement>(null),
    editInput = useRef<HTMLTextAreaElement>(null),
    fileInput = useRef<HTMLInputElement>(null),
    title = useRef<HTMLHeadingElement>(null);
  const spec = session?.versions[session.index];
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
  function openExample(i: number) {
    const e = showcasedGames[i];
    setSession({
      id: crypto.randomUUID(),
      versions: [structuredClone(e.spec)],
      index: 0,
      source: "example",
      prompt: e.prompt,
    });
    setSaved(false);
    setNotice("");
    setError("");
    location.hash = "studio";
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
    setPhase("Asking AI to design your game…");
    try {
      const design = await requestGame(prompt);
      setPhase("Design validated. Loading your world…");
      setSession({
        id: crypto.randomUUID(),
        versions: [design],
        index: 0,
        source: "ai",
        prompt,
      });
      setSaved(false);
      setNotice("AI design validated. Ready to play.");
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
    setPhase(
      session.source === "example"
        ? "Applying a local example edit…"
        : "Asking AI to revise this version…",
    );
    try {
      const next =
        session.source === "example"
          ? editFixture(spec, edit)
          : await requestGame(edit, spec);
      setSession({
        ...session,
        versions: [...session.versions, next],
        index: session.versions.length,
      });
      setSaved(false);
      setNotice(
        `Version ${session.versions.length + 1} ready. ${session.source === "example" ? "Local fixture edit; no AI request." : "AI edit validated."}`,
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
    setNotice("Game design exported.");
  }
  async function readFile(file?: File) {
    if (!file) return;
    try {
      const next = await importGame(file);
      setSession({
        id: crypto.randomUUID(),
        versions: [next],
        index: 0,
        source: "example",
        prompt: "Imported game",
      });
      setSaved(false);
      setNotice("Imported design. Local fixture editing is enabled.");
      location.hash = "studio";
    } catch {
      setError(
        "That file is not a valid JustPlay game. Choose an exported JSON game under 16 KB.",
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
              <div className="hero-art">
                <World spec={examples[0].spec} large />
                <div className="art-caption">
                  <span className="status-dot" />A world waiting for you
                  <span>Crystalwood · local example</span>
                </div>
                <button
                  className="art-play"
                  onClick={() => openExample(0)}
                  aria-label="Play Crystalwood example"
                >
                  <Play fill="currentColor" size={24} />
                </button>
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
                  maxLength={2000}
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
                    Five real ways to play.
                    <small>
                      Platformer · Runner · Survival · Basketball · Cricket
                    </small>
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
                Supports arcade platformers, runners, survival adventures,
                basketball shooting and cricket batting. Other mechanics are not
                supported yet. Local examples work without an AI key.
              </p>
            </section>
            <section className="examples-section">
              <div className="section-heading">
                <div>
                  <h2>A few worlds to get lost in.</h2>
                  <p>Real, playable starting points. Make yourself at home.</p>
                </div>
                <span className="section-note">HANDCRAFTED LOCAL EXAMPLES</span>
              </div>
              <div className="examples-grid">
                {showcasedGames.map((e, i) => (
                  <article className="example" key={e.label}>
                    <button
                      className="preview-button"
                      onClick={() => openExample(i)}
                      aria-label={`Play ${e.label}`}
                    >
                      <World spec={e.spec} />
                      <span className="preview-play">
                        <Play size={18} fill="currentColor" />
                      </span>
                    </button>
                    <div className="example-heading">
                      <h3>
                        <button
                          className="text-button"
                          onClick={() => openExample(i)}
                        >
                          {e.label}
                        </button>
                      </h3>
                      <ArrowUpRight size={20} />
                    </div>
                    <p>
                      {genreLabel[e.spec.genre]}
                      <span>·</span>
                      {e.spec.theme === "forest"
                        ? "A curious little adventure"
                        : e.spec.theme === "neon"
                          ? "Chase the city lights"
                          : e.spec.genre === "basketball"
                            ? "Find your perfect shot"
                            : e.spec.genre === "cricket"
                              ? "Time it. Send it for six."
                              : "Keep the darkness at bay"}
                    </p>
                    <button
                      className="use-idea"
                      onClick={() => {
                        setPrompt(e.prompt);
                        composer.current?.focus();
                        composer.current?.scrollIntoView({
                          block: "center",
                          behavior: "smooth",
                        });
                      }}
                    >
                      Use this idea
                      <ArrowRight size={14} />
                    </button>
                  </article>
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
                  {genreLabel[spec.genre]} · {spec.theme} ·{" "}
                  {session.source === "example"
                    ? "Local example"
                    : "AI designed"}{" "}
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
                <GamePlayer spec={spec} />
                <div className="game-notes">
                  <h2>Your mission</h2>
                  <p>
                    {spec.genre === "basketball"
                      ? `Score ${spec.goal} points. Arrows adjust aim. Hold Space to charge, then release in the green power band. You have ${spec.health} missed shots.`
                      : spec.genre === "cricket"
                        ? `Score ${spec.goal} runs. Press Space when the delivery reaches the green batting zone. Good timing earns fours and sixes; misses cost a wicket.`
                        : spec.genre === "survival"
                          ? `Defeat ${spec.goal} creatures. Your lantern fires automatically; keep moving to stay alive.`
                          : spec.genre === "runner"
                            ? "Jump the rooftop barriers and reach the end. The city gets faster as you run."
                            : `Gather ${spec.goal} crystals and reach the glowing forest gate. Jump on slimes to defeat them.`}
                  </p>
                  <div className="mechanic-tags">
                    {spec.mechanics.doubleJump && <span>Double jump</span>}
                    {spec.mechanics.dash && <span>Dash</span>}
                    {spec.enemies.includes("bat") && (
                      <span>Flying enemies</span>
                    )}
                    <span>Difficulty {spec.difficulty}/5</span>
                  </div>
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
                    maxLength={2000}
                    placeholder={
                      spec.genre === "basketball"
                        ? "Give me more tries…"
                        : spec.genre === "cricket"
                          ? "Give me more wickets…"
                          : "Give me a double jump…"
                    }
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
                <div className="edit-suggestions">
                  {(spec.genre === "basketball" || spec.genre === "cricket"
                    ? [
                        "Make it harder",
                        spec.genre === "cricket"
                          ? "Give me more wickets"
                          : "Give me more tries",
                        "Raise the target score",
                        "Change to nighttime",
                      ]
                    : [
                        "Make it harder",
                        "Add flying enemies",
                        "Change to nighttime",
                        "Give me a double jump",
                      ]
                  ).map((s) => (
                    <button
                      key={s}
                      disabled={pending}
                      onClick={() => {
                        setEdit(s);
                        editInput.current?.focus();
                      }}
                    >
                      {s}
                      <Plus size={13} />
                    </button>
                  ))}
                </div>
                <p className="local-note">
                  {session.source === "example"
                    ? "Local example mode: the four suggested edits use explicit fixtures. Custom prompts need AI creation."
                    : "Edits use your configured AI provider and its available free quota."}
                </p>
                <div className="versions">
                  <h3>Version history</h3>
                  {session.versions.map((v, i) => (
                    <button
                      key={i}
                      aria-current={i === session.index ? "true" : undefined}
                      disabled={pending}
                      onClick={() => setSession({ ...session, index: i })}
                    >
                      <span>
                        <b>Version {i + 1}</b>
                        <small>
                          {i === 0
                            ? "Original world"
                            : `${v.night ? "Nighttime" : "Daytime"} · difficulty ${v.difficulty}`}
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
            <p>
              Choose a local example or describe a new game to open the studio.
            </p>
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
                <p>Play an example, make it your own, then save it here.</p>
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
                        <World spec={v} />
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
                        {genreLabel[v.genre]} · {game.versions.length} version
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
