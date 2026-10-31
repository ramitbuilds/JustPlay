import { z } from "zod";
import { parse } from "acorn";
export const ControlSchema = z
  .object({
    label: z.string().trim().min(1).max(24),
    key: z
      .string()
      .min(1)
      .max(24)
      .regex(/^[A-Za-z0-9]+$/),
  })
  .strict();
export const GameManifestSchema = z
  .object({
    title: z.string().trim().min(1).max(80),
    description: z.string().max(320),
    instructions: z.string().min(1).max(600),
    controls: z.array(ControlSchema).max(8),
    notes: z.string().max(400),
  })
  .strict();
export const CodeGameSchema = GameManifestSchema.extend({
  format: z.literal("justplay-code-v1"),
  code: z.string().min(50).max(40000),
}).strict();
export type CodeGame = z.infer<typeof CodeGameSchema>;
export const CodePatchSchema = GameManifestSchema.extend({
  patches: z
    .array(
      z
        .object({
          find: z.string().min(1).max(16000),
          replace: z.string().max(20000),
        })
        .strict(),
    )
    .min(1)
    .max(8),
}).strict();
export function isCodeGame(game: unknown): game is CodeGame {
  return (
    !!game &&
    typeof game === "object" &&
    "format" in game &&
    game.format === "justplay-code-v1"
  );
}
export function validateCodeGame(raw: unknown): CodeGame {
  const game = CodeGameSchema.parse(raw);
  const ast = parse(game.code, { ecmaVersion: "latest", sourceType: "script" });
  const factory = ast.body.some(
    (node) =>
      node.type === "FunctionDeclaration" && node.id?.name === "createGame",
  );
  if (!factory)
    throw new Error(
      "The source must declare function createGame({canvas,ctx,input,api}).",
    );
  if (new Set(game.controls.map((c) => c.key)).size !== game.controls.length)
    throw new Error("Each displayed control must use a unique key.");
  return game;
}
export function parseGameSource(raw: string): CodeGame {
  if (raw.length > 50000)
    throw new Error("The generated source exceeded the response budget.");
  const text = raw
    .trim()
    .replace(/^```(?:javascript|js)?\s*/i, "")
    .replace(/\s*```$/, "");
  if (!text.startsWith("/*JUSTPLAY"))
    throw new Error("Begin with the /*JUSTPLAY JSON manifest */ comment.");
  const end = text.indexOf("*/");
  if (end < 0 || end > 4000)
    throw new Error("The game manifest is missing or too large.");
  const manifest = GameManifestSchema.parse(
    JSON.parse(text.slice("/*JUSTPLAY".length, end).trim()),
  );
  return validateCodeGame({
    ...manifest,
    format: "justplay-code-v1",
    code: text.slice(end + 2).trim(),
  });
}
export function applyCodePatch(current: CodeGame, raw: unknown): CodeGame {
  const { patches, ...manifest } = CodePatchSchema.parse(raw);
  let code = current.code;
  for (const patch of patches) {
    if (code.split(patch.find).length !== 2)
      throw new Error(
        "Every patch must match exactly one source fragment. Use more exact context.",
      );
    code = code.replace(patch.find, () => patch.replace);
  }
  return validateCodeGame({ ...manifest, format: "justplay-code-v1", code });
}
