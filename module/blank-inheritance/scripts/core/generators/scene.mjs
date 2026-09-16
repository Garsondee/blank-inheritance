import { deriveFoundryId } from "../ids.mjs";

/** Lightweight test-scene shape (not a data/schema entity — this is a v0 test fixture format only). */
export async function buildSceneData(source, actorIdBySourceId) {
  const id = await deriveFoundryId(source.id);

  const tokens = [];
  for (const placement of source.placements ?? []) {
    const actorId = actorIdBySourceId[placement.actorSourceId];
    if (!actorId) continue;
    tokens.push({
      _id: await deriveFoundryId(`${source.id}:token:${placement.actorSourceId}`),
      actorId,
      x: placement.x ?? 0,
      y: placement.y ?? 0,
      width: 1,
      height: 1
    });
  }

  return {
    _id: id,
    name: source.name ?? source.id,
    width: source.width ?? 2000,
    height: source.height ?? 1400,
    grid: { size: source.gridSize ?? 100 },
    levels: [
      {
        _id: "defaultLevel0000",
        name: "Default",
        background: { color: source.backgroundColor ?? "#000000" }
      }
    ],
    tokens
  };
}
