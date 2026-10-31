import { ASSET_CATALOG, type AssetId } from "./asset-catalog";
import type { CodeGame } from "./code-game";
let engine: Promise<string> | undefined;
export async function prepareGame(game: CodeGame) {
  engine ??= fetch("/runtime/engine.js")
    .then(async (response) => {
      if (!response.ok)
        throw Error(
          "The game engine bundle is missing. Redeploy the latest build.",
        );
      return response.text();
    })
    .catch((error) => {
      engine = undefined;
      throw error;
    });
  const images: { id: string; bitmap: ImageBitmap }[] = [];
  await Promise.all(
    (game.assets ?? []).map(async (id: AssetId) => {
      const asset = ASSET_CATALOG[id],
        image = new Image();
      image.src = "/assets/library/" + asset.file;
      await image.decode();
      images.push({ id, bitmap: await createImageBitmap(image) });
    }),
  );
  return {
    engineSource: await engine,
    manifest: game,
    code: game.code,
    images,
    models: [],
  };
}
