// Reusable art only: these entries contain no gameplay rules or game routing.
export const ASSET_CATALOG = {
  car: {
    kind: "image",
    file: "car.svg",
    description: "top-down red car, nose points up; 128x192",
  },
  tree: {
    kind: "image",
    file: "tree.svg",
    description: "layered green tree; 128x160",
  },
  coin: { kind: "image", file: "coin.svg", description: "gold coin; 96x96" },
  rock: {
    kind: "image",
    file: "rock.svg",
    description: "shaded stone; 128x96",
  },
  player: {
    kind: "image",
    file: "player.svg",
    description: "friendly character; 96x128",
  },
  ball: { kind: "image", file: "ball.svg", description: "striped ball; 96x96" },
} as const;
export type AssetId = keyof typeof ASSET_CATALOG;
export const assetIds = Object.keys(ASSET_CATALOG) as AssetId[];
