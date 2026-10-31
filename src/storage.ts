import { openDB } from "idb";
import { z } from "zod";
import { GameSpecSchema, validateSpec, type GameSpec } from "./spec";
export const recordSchema = z
  .object({
    id: z.string().uuid(),
    updated: z.number(),
    versions: z.array(GameSpecSchema).min(1).max(30),
    source: z.enum(["ai", "example"]),
    prompt: z.string().max(2000),
  })
  .strict();
export type SavedGame = z.infer<typeof recordSchema>;
const db = () =>
  openDB("justplay", 1, {
    upgrade(db) {
      db.createObjectStore("games", { keyPath: "id" });
    },
  });
export async function listGames(): Promise<{
  games: SavedGame[];
  corrupt: number;
}> {
  const values: unknown[] = await (await db()).getAll("games");
  let corrupt = 0;
  const games: SavedGame[] = [];
  for (const value of values) {
    try {
      const record = recordSchema.parse(value);
      record.versions.forEach(validateSpec);
      games.push(record);
    } catch {
      corrupt++;
    }
  }
  return { games: games.sort((a, b) => b.updated - a.updated), corrupt };
}
export async function saveGame(game: SavedGame) {
  const parsed = recordSchema.parse(game);
  parsed.versions.forEach(validateSpec);
  await (await db()).put("games", parsed);
}
export async function deleteGame(id: string) {
  await (await db()).delete("games", id);
}
export async function importGame(file: File): Promise<GameSpec> {
  if (file.size > 16000)
    throw new Error("Choose a JustPlay JSON file smaller than 16 KB.");
  return validateSpec(JSON.parse(await file.text()));
}
