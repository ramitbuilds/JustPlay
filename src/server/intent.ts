import type { GameSpec } from "../spec.js";
export const supportedFamilies =
  "platformers, runners, survival adventures, basketball shootouts and cricket batting games";
export function requestedGenre(
  prompt: string,
  current?: GameSpec,
): GameSpec["genre"] | undefined {
  const text = prompt.toLowerCase();
  if (/\b(basketball|hoops|free[ -]?throws?|slam[ -]?dunks?)\b/.test(text))
    return "basketball";
  if (/\b(cricket|wickets?|batsman|batsmen)\b/.test(text)) return "cricket";
  if (/\b(platformers?|platforming|side[ -]?scroll(?:ing|er)?)\b/.test(text))
    return "platformer";
  if (/\b(runners?|running|endless)\b/.test(text)) return "runner";
  if (/\b(survival|top[ -]?down|dungeon|hordes?|zombies?)\b/.test(text))
    return "survival";
  return current?.genre;
}
export function knownUnsupported(prompt: string): boolean {
  return (
    /\b(chess|checkers|sudoku|racing|racecar|football|soccer|tennis|baseball|golf|hockey|ludo|poker|minecraft|3d)\b/i.test(
      prompt,
    ) && !requestedGenre(prompt)
  );
}
export function assertPromptMatch(
  spec: GameSpec,
  prompt: string,
  current?: GameSpec,
) {
  const expected = requestedGenre(prompt, current);
  if (expected && spec.genre !== expected)
    throw new Error(
      `The requested family is ${expected}. Return a ${expected} game, not a ${spec.genre}. Do not rename an unrelated game.`,
    );
  const lower = prompt.toLowerCase();
  const theme = /\bforest\b/.test(lower)
    ? "forest"
    : /\bneon|cyberpunk\b/.test(lower)
      ? "neon"
      : /\bdungeon\b/.test(lower)
        ? "dungeon"
        : undefined;
  if (theme && spec.theme !== theme)
    throw new Error(`Use the requested ${theme} theme.`);
  if (
    /\bdouble[ -]?jump\b/.test(lower) &&
    ["platformer", "runner"].includes(spec.genre) &&
    !spec.mechanics.doubleJump
  )
    throw new Error("Enable the requested double jump.");
  if (/\b(nighttime|at night|night time)\b/.test(lower) && !spec.night)
    throw new Error("Enable the requested nighttime setting.");
}
