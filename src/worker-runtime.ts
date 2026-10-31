import type { CodeGame } from "./code-game";
declare class FileReaderSync {
  readAsDataURL(blob: Blob): string;
}
type Metrics = Record<string, number>;
type Snapshot = { phase: string; metrics: Metrics };
type Input = {
  keys: Record<string, boolean>;
  pressed: Record<string, boolean>;
  pointer: {
    x: number;
    y: number;
    down: boolean;
    pressed: boolean;
    released: boolean;
  };
};
type Api = {
  setHud(value: {
    status?: string;
    stats?: { label: string; value: string | number }[];
  }): void;
  finish(outcome: string, message: string): void;
  sound(frequency: number, duration: number): void;
};
type Game = {
  update(dt: number): void;
  render(): void;
  inspect?: () => Snapshot;
};
type Factory = (context: {
  canvas: OffscreenCanvas;
  ctx: OffscreenCanvasRenderingContext2D | null;
  input: Input;
  api: Api;
  assets: {
    image: (id: string) => ImageBitmap;
  };
}) => Game;
const scope = globalThis as unknown as {
  postMessage: (value: unknown) => void;
  onmessage: ((event: MessageEvent) => void) | null;
  justplayBoot: (factory: Factory) => void;
};
const post = scope.postMessage.bind(scope),
  clock = performance.now.bind(performance),
  schedule = setInterval.bind(globalThis);
// Libraries are bundled before capabilities are removed. Game code cannot fetch/import anything.
for (const name of [
  "Worker",
  "SharedWorker",
  "fetch",
  "WebSocket",
  "WebTransport",
  "EventSource",
  "XMLHttpRequest",
  "importScripts",
  "indexedDB",
  "caches",
  "BroadcastChannel",
])
  for (
    let object: object | null = globalThis;
    object;
    object = Object.getPrototypeOf(object)
  )
    if (Object.prototype.hasOwnProperty.call(object, name)) {
      try {
        Object.defineProperty(object, name, {
          value: undefined,
          writable: false,
          configurable: false,
        });
      } catch {
        /* CSP independently blocks network. */
      }
    }
scope.justplayBoot = (factory) => {
  let game: Game | null = null,
    canvas: OffscreenCanvas,
    ctx: OffscreenCanvasRenderingContext2D | null = null,
    manifest: CodeGame,
    paused = true,
    ended = false,
    testing = false,
    frames = 0,
    last = clock(),
    lastHud = -Infinity,
    lastSound = 0,
    thumbnail = false,
    seed = 41;
  let hud = { status: "", stats: [] as { label: string; value: string }[] };
  const input: Input = {
    keys: Object.create(null),
    pressed: Object.create(null),
    pointer: { x: 400, y: 225, down: false, pressed: false, released: false },
  };
  const images = new Map<string, ImageBitmap>();
  const assets = {
    image(id: string) {
      const image = images.get(id);
      if (!image) throw Error(`Image asset ${id} was not declared in assets.`);
      return image;
    },
  };
  const api: Api = Object.freeze({
    setHud(value) {
      if (!value || typeof value !== "object") return;
      hud = {
        status: String(value.status ?? "").slice(0, 220),
        stats: Array.isArray(value.stats)
          ? value.stats.slice(0, 6).map((x) => ({
              label: String(x?.label ?? "").slice(0, 24),
              value: String(x?.value ?? "").slice(0, 40),
            }))
          : [],
      };
      if (!testing && clock() - lastHud >= 40) {
        lastHud = clock();
        post({ type: "hud", ...hud });
      }
    },
    finish(outcome, message) {
      if (!["won", "lost"].includes(outcome)) return;
      ended = true;
      paused = true;
      if (!testing) {
        post({ type: "hud", ...hud });
        post({
          type: "finish",
          outcome,
          message: String(message ?? "").slice(0, 240),
        });
      }
    },
    sound(frequency = 440, duration = 0.08) {
      if (testing || clock() - lastSound < 100) return;
      lastSound = clock();
      post({
        type: "sound",
        frequency: Math.max(60, Math.min(1800, Number(frequency) || 440)),
        duration: Math.max(0.02, Math.min(0.25, Number(duration) || 0.08)),
      });
    },
  });
  function clearInput() {
    input.keys = Object.create(null);
    input.pressed = Object.create(null);
    Object.assign(input.pointer, {
      x: 400,
      y: 225,
      down: false,
      pressed: false,
      released: false,
    });
  }
  function initialize() {
    clearInput();
    ended = false;
    seed = 41;
    hud = { status: "", stats: [] };
    game = factory({ canvas, ctx, input, api, assets });
    if (
      !game ||
      typeof game.update !== "function" ||
      typeof game.render !== "function"
    )
      throw Error("createGame must return update(dt), render() and inspect().");
    if (manifest.runtimeVersion === 2 && typeof game.inspect !== "function")
      throw Error("Game must expose inspect() for input checks.");
    game.render();
  }
  function snapshot(): Snapshot {
    const value = game!.inspect!();
    if (
      !value ||
      typeof value.phase !== "string" ||
      !value.metrics ||
      typeof value.metrics !== "object"
    )
      throw Error("inspect() must return {phase,metrics:{numericState}}.");
    const entries = Object.entries(value.metrics);
    if (
      !entries.length ||
      entries.length > 24 ||
      entries.some(
        ([, value]) => typeof value !== "number" || !Number.isFinite(value),
      )
    )
      throw Error("Game state contains missing/nonfinite metrics.");
    return { phase: value.phase, metrics: Object.fromEntries(entries) };
  }
  function fingerprint() {
    const sample = new OffscreenCanvas(48, 27),
      context = sample.getContext("2d")!;
    context.drawImage(canvas, 0, 0, 48, 27);
    const pixels = context.getImageData(0, 0, 48, 27).data,
      colors = new Set<number>();
    let hash = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      colors.add(
        (pixels[i] >> 5) * 64 + (pixels[i + 1] >> 5) * 8 + (pixels[i + 2] >> 5),
      );
      hash =
        (hash * 31 + pixels[i] * 3 + pixels[i + 1] * 5 + pixels[i + 2] * 7) | 0;
    }
    return { hash, colors: colors.size };
  }
  function step(dt: number) {
    game!.update(dt);
    input.pressed = Object.create(null);
    input.pointer.pressed = false;
    input.pointer.released = false;
  }
  function runScenario(
    check: NonNullable<CodeGame["verification"]>[number],
    baseline: boolean,
  ) {
    initialize();
    const history: {
      state: Snapshot;
      visual: ReturnType<typeof fingerprint>;
      hud: string;
    }[] = [];
    const capture = () => {
      game!.render();
      history.push({
        state: snapshot(),
        visual: fingerprint(),
        hud: JSON.stringify(hud),
      });
    };
    capture();
    for (const action of check.steps) {
      const keys = action.keys.filter(
        (key) => !baseline || key !== check.control,
      );
      for (const key of Object.keys(input.keys))
        if (!keys.includes(key)) input.keys[key] = false;
      for (const key of keys) {
        if (!input.keys[key]) input.pressed[key] = true;
        input.keys[key] = true;
      }
      if (action.pointer && (!baseline || check.control !== "pointer")) {
        const down = action.pointer.down ?? false;
        Object.assign(input.pointer, {
          x: action.pointer.x,
          y: action.pointer.y,
          pressed: down && !input.pointer.down,
          released: !down && input.pointer.down,
          down,
        });
      }
      for (let n = 0; n < action.frames && !ended; n++) {
        step(1 / 60);
        if (n % 10 === 0 || n === action.frames - 1 || ended) capture();
      }
    }
    return history;
  }

  async function verify() {
    testing = true;
    const originalRandom = Math.random;
    Math.random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    try {
      initialize();
      const initial = snapshot();
      if (initial.phase !== "playing")
        throw Error(
          "Start gameplay on host Play; remove the second start menu.",
        );
      for (let n = 0; n < 30 && !ended; n++) step(1 / 60);
      game!.render();
      if (fingerprint().colors < 4)
        throw Error("The game renders a blank or nearly uniform screen.");
      if (!hud.status || !hud.stats.length)
        throw Error("Show an objective and live numeric HUD statistics.");
      const controls = manifest.controls.length
        ? manifest.controls.map((control) => control.key)
        : ["pointer"];
      let checked = 0;
      for (const control of controls) {
        const hints = (manifest.verification ?? []).filter(
          (check) => check.control === control,
        );
        const candidates: NonNullable<CodeGame["verification"]> = [...hints];
        if (control === "pointer") {
          for (const x of [400, 200, 600])
            for (const y of [225, 120, 330])
              candidates.push({
                name: "Pointer interaction",
                control,
                metric: "",
                steps: [
                  { frames: 90, keys: [], pointer: { x, y, down: true } },
                ],
              });
        } else {
          const contexts = [
            [],
            ...controls
              .filter((key) => key !== control && key !== "pointer")
              .map((key) => [key]),
          ];
          for (const context of contexts) {
            candidates.push({
              name: control,
              control,
              metric: "",
              steps: [
                { frames: 45, keys: context },
                { frames: 90, keys: [...context, control] },
              ],
            });
            if (context.length)
              candidates.push({
                name: control,
                control,
                metric: "",
                steps: [
                  { frames: 60, keys: context },
                  { frames: 90, keys: [control] },
                ],
              });
          }
        }
        let works = false;
        for (const check of candidates) {
          post({ type: "beat", frames });
          const baseline = runScenario(check, true),
            active = runScenario(check, false);
          for (let i = 0; i < Math.max(baseline.length, active.length); i++) {
            const a = baseline[Math.min(i, baseline.length - 1)],
              b = active[Math.min(i, active.length - 1)];
            const metrics = check.metric
              ? [check.metric]
              : Object.keys(a.state.metrics);
            const changed = metrics.some(
              (metric) =>
                Number.isFinite(a.state.metrics[metric]) &&
                Number.isFinite(b.state.metrics[metric]) &&
                Math.abs(a.state.metrics[metric] - b.state.metrics[metric]) >=
                  0.0001,
            );
            if (
              changed &&
              (a.visual.hash !== b.visual.hash || a.hud !== b.hud)
            ) {
              works = true;
              break;
            }
          }
          if (works) break;
        }
        if (!works)
          throw Error(
            `Control ${control} did not change actual gameplay with visible/HUD feedback, either alone, held with another action, or after movement. Fix its input handling and expose actual gameplay metrics through inspect().`,
          );
        checked++;
      }
      post({ type: "verified", checks: checked });
    } finally {
      Math.random = originalRandom;
      testing = false;
      game = null;
    }
  }
  scope.onmessage = async (event) => {
    const value = event.data;
    try {
      if (value.type === "init") {
        canvas = value.canvas;
        manifest = value.manifest;
        for (const item of value.images ?? []) images.set(item.id, item.bitmap);
        ctx = canvas.getContext("2d");
        if (value.probe && manifest.runtimeVersion === 2) {
          await verify();
          return;
        }
        initialize();
        post({ type: "ready" });
        last = clock();
      }
      if (value.type === "playing") {
        paused = !value.playing;
        last = clock();
        clearInput();
        post({ type: "playing", playing: !paused });
      }
      if (value.type === "release") clearInput();
      if (value.type === "key") {
        if (value.down && !input.keys[value.key])
          input.pressed[value.key] = true;
        input.keys[value.key] = !!value.down;
      }
      if (value.type === "pointer") {
        const pressed = input.pointer.pressed || value.pointer.pressed,
          released = input.pointer.released || value.pointer.released;
        Object.assign(input.pointer, value.pointer, { pressed, released });
      }
    } catch (error) {
      game = null;
      post({
        type: "error",
        message: String(error instanceof Error ? error.message : error).slice(
          0,
          700,
        ),
      });
    }
  };
  schedule(() => {
    if (!game || testing) return;
    const time = clock(),
      dt = Math.max(0, Math.min(0.05, (time - last) / 1000));
    last = time;
    try {
      if (!paused && !ended) {
        step(dt);
        game.render();
        frames++;
      }
      post({ type: "beat", frames });
      if (frames >= 12 && !thumbnail) {
        thumbnail = true;
        const thumb = new OffscreenCanvas(320, 180);
        thumb.getContext("2d")!.drawImage(canvas, 0, 0, 320, 180);
        void thumb
          .convertToBlob({ type: "image/png" })
          .then((blob) => {
            const reader = new FileReaderSync();
            const data = reader.readAsDataURL(blob);
            if (data.length < 180000) post({ type: "thumbnail", data });
          })
          .catch(() => {});
      }
    } catch (error) {
      game = null;
      post({
        type: "error",
        message: String(error instanceof Error ? error.message : error).slice(
          0,
          700,
        ),
      });
    }
  }, 16);
};
