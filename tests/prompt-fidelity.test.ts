import { describe, it, expect } from "vitest";
import {
  parseGameSource,
  validateCodeGame,
  applyCodePatch,
} from "../src/code-game";
import { game, source, patch } from "./code-fixture";
describe("generated source boundary", () => {
  it("accepts raw JavaScript and a fenced response", () => {
    expect(parseGameSource(source)).toEqual(game);
    expect(parseGameSource("```js\n" + source + "\n```")).toEqual(game);
  });
  it("validates syntax without running source on the server", () => {
    expect(
      validateCodeGame({
        ...game,
        code: "throw new Error('never execute');\n" + game.code,
      }),
    ).toBeDefined();
    expect(() =>
      validateCodeGame({ ...game, code: game.code + " {" }),
    ).toThrow();
  });
  it("rejects missing factory, unbounded source and duplicate controls", () => {
    expect(() =>
      validateCodeGame({ ...game, code: "var value=1;".repeat(10) }),
    ).toThrow("createGame");
    expect(() => parseGameSource("x".repeat(50001))).toThrow();
    expect(() =>
      validateCodeGame({
        ...game,
        controls: [game.controls[0], game.controls[0]],
      }),
    ).toThrow("unique");
  });
  it("rejects absent or ambiguous edits", () => {
    expect(() =>
      applyCodePatch(game, {
        ...patch,
        patches: [{ find: "absent", replace: "" }],
      }),
    ).toThrow("exactly one");
    expect(() =>
      applyCodePatch(game, {
        ...patch,
        patches: [{ find: "ctx", replace: "context" }],
      }),
    ).toThrow("exactly one");
  });
  it("preserves replacement metacharacters literally", () => {
    const next = applyCodePatch(game, {
      ...patch,
      patches: [
        { find: "const color='#d8ed83';", replace: "const color='$&';" },
      ],
    });
    expect(next.code).toContain("const color='$&';");
  });
});
it("new artifacts reject fake pointer buttons and uncovered actions", () => {
  expect(() =>
    validateCodeGame({
      ...game,
      controls: [{ label: "Move", key: "Pointer" }],
    }),
  ).toThrow("actual KeyboardEvent");
  expect(() =>
    validateCodeGame({
      ...game,
      controls: [
        { label: "Paint", key: "Space" },
        { label: "Unused", key: "KeyX" },
      ],
    }),
  ).toThrow("Missing input verification");
});
it("source patches preserve asset and input-test metadata when omitted", () => {
  const partial = { ...patch };
  delete (partial as { runtimeVersion?: number }).runtimeVersion;
  delete (partial as { verification?: unknown }).verification;
  delete (partial as { renderer?: string }).renderer;
  const next = applyCodePatch(game, partial);
  expect(next.runtimeVersion).toBe(2);
  expect(next.verification).toEqual(game.verification);
  expect(next.renderer).toBe("canvas2d");
});
