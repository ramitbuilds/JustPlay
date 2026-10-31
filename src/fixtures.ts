import { validateSpec, type GameSpec } from "./spec";
export const examples: { prompt: string; spec: GameSpec; label: string }[] = [
  {
    label: "Crystalwood",
    prompt:
      "A fox collecting crystals in a lush magical forest platformer with enemies.",
    spec: validateSpec({
      schemaVersion: 1,
      title: "Crystalwood",
      description:
        "Follow the fireflies. Gather crystals and find the ancient forest gate.",
      genre: "platformer",
      theme: "forest",
      hero: "fox",
      seed: 8291,
      difficulty: 2,
      speed: 175,
      health: 5,
      goal: 10,
      mechanics: { doubleJump: true, dash: false, shooting: false },
      enemies: ["slime"],
      night: false,
    }),
  },
  {
    label: "Neon Drift",
    prompt:
      "A neon cyberpunk endless runner with obstacles and increasing speed.",
    spec: validateSpec({
      schemaVersion: 1,
      title: "Neon Drift",
      description:
        "A rooftop escape above a city that never sleeps. Jump the barriers and collect energy.",
      genre: "runner",
      theme: "neon",
      hero: "robot",
      seed: 4142,
      difficulty: 2,
      speed: 185,
      health: 3,
      goal: 15,
      mechanics: { doubleJump: true, dash: true, shooting: false },
      enemies: ["bat"],
      night: true,
    }),
  },
  {
    label: "The Last Lantern",
    prompt:
      "A top-down dungeon survival game with enemies, health and a win objective.",
    spec: validateSpec({
      schemaVersion: 1,
      title: "The Last Lantern",
      description:
        "Keep your lantern burning. Defeat the creatures to open the dungeon seal.",
      genre: "survival",
      theme: "dungeon",
      hero: "knight",
      seed: 1837,
      difficulty: 2,
      speed: 150,
      health: 6,
      goal: 12,
      mechanics: { doubleJump: false, dash: true, shooting: true },
      enemies: ["slime", "bat"],
      night: true,
    }),
  },
];
// Explicit developer/test fixtures only. Never used as a silent network fallback.
export function editFixture(current: GameSpec, instruction: string): GameSpec {
  const spec = structuredClone(current);
  const text = instruction.toLowerCase();
  if (text.includes("harder"))
    spec.difficulty = Math.min(5, spec.difficulty + 1);
  else if (text.includes("more tries") || text.includes("more wickets"))
    spec.health = Math.min(8, spec.health + 1);
  else if (text.includes("target score"))
    spec.goal = Math.min(30, spec.goal + 2);
  else if (text.includes("flying"))
    spec.enemies = Array.from(new Set([...spec.enemies, "bat"]));
  else if (text.includes("night")) spec.night = true;
  else if (text.includes("double jump")) spec.mechanics.doubleJump = true;
  else
    throw new Error(
      "Offline edits support: make it harder, add flying enemies, change to nighttime, give me a double jump. Configure AI for other edits.",
    );
  return validateSpec(spec);
}

export const sportsExamples: typeof examples = [
  {
    label: "Court Craft",
    prompt:
      "A basketball shooting game on an outdoor court. Aim shots and score ten points.",
    spec: validateSpec({
      schemaVersion: 1,
      title: "Court Craft",
      description:
        "Find your angle. Hold to charge and release in the green band to sink a basket.",
      genre: "basketball",
      theme: "court",
      hero: "athlete",
      seed: 202501,
      difficulty: 2,
      speed: 150,
      health: 6,
      goal: 10,
      mechanics: { doubleJump: false, dash: false, shooting: true },
      enemies: [],
      night: false,
    }),
  },
  {
    label: "Midsummer Sixes",
    prompt:
      "A cricket batting game. Time the bat swing to hit boundaries and score twelve runs.",
    spec: validateSpec({
      schemaVersion: 1,
      title: "Midsummer Sixes",
      description:
        "Read the delivery, time your swing and send the ball to the boundary.",
      genre: "cricket",
      theme: "stadium",
      hero: "athlete",
      seed: 202502,
      difficulty: 2,
      speed: 150,
      health: 5,
      goal: 12,
      mechanics: { doubleJump: false, dash: false, shooting: false },
      enemies: [],
      night: false,
    }),
  },
];
