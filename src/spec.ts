import { z } from "zod";
export const GameSpecSchema = z
  .object({
    schemaVersion: z.literal(1),
    title: z.string().trim().min(1).max(70),
    description: z.string().max(240),
    genre: z.enum([
      "platformer",
      "runner",
      "survival",
      "basketball",
      "cricket",
    ]),
    theme: z.enum(["forest", "neon", "dungeon", "court", "stadium"]),
    hero: z.enum(["fox", "robot", "knight", "athlete"]),
    seed: z.number().int().min(1).max(2147483647),
    difficulty: z.number().int().min(1).max(5),
    speed: z.number().min(120).max(260),
    health: z.number().int().min(1).max(8),
    goal: z.number().int().min(5).max(30),
    mechanics: z
      .object({
        doubleJump: z.boolean(),
        dash: z.boolean(),
        shooting: z.boolean(),
      })
      .strict(),
    enemies: z
      .array(z.enum(["slime", "bat"]))
      .min(0)
      .max(2),
    night: z.boolean(),
  })
  .strict();
export type GameSpec = z.infer<typeof GameSpecSchema>;
export function validateSpec(raw: unknown): GameSpec {
  const spec = GameSpecSchema.parse(raw);
  if (spec.genre === "survival" && !spec.mechanics.shooting)
    throw new Error("Survival requires shooting to defeat enemies.");
  if (spec.genre === "survival" && spec.mechanics.doubleJump)
    throw new Error(
      "Double jump is supported by platformers and runners. Try dash for a top-down game.",
    );
  if (new Set(spec.enemies).size !== spec.enemies.length)
    throw new Error("Enemy identifiers must be unique.");
  if (spec.genre === "survival" && spec.enemies.length === 0)
    throw new Error("Survival requires at least one enemy kind.");
  if (isSport(spec)) {
    if (spec.enemies.length || spec.mechanics.doubleJump || spec.mechanics.dash)
      throw new Error(
        "Sports games require no enemies, double jump or dash. Their action is shooting or batting.",
      );
  }
  return spec;
}
export function parseModelSpec(content: string): GameSpec {
  if (content.length > 16000) throw new Error("The game design is too large.");
  const text = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return validateSpec(JSON.parse(text));
}
export const specContract = JSON.stringify(z.toJSONSchema(GameSpecSchema));

export function isSport(spec: Pick<GameSpec, "genre">) {
  return spec.genre === "basketball" || spec.genre === "cricket";
}
export const DesignResponseSchema = z
  .object({
    supported: z.boolean(),
    reason: z.string().max(240),
    spec: GameSpecSchema.nullable(),
  })
  .strict();
export const DesignWireSchema = GameSpecSchema.extend({
  supported: z.boolean(),
  reason: z.string().max(240),
}).strict();
export const designContract = JSON.stringify(z.toJSONSchema(DesignWireSchema));
