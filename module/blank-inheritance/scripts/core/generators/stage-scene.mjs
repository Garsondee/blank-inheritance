/**
 * Building a Foundry Scene that exists to be LOOKED AT rather than played on.
 *
 * The structural call in design/theatre-of-the-mind-staging.md §6 is that the
 * Foundry Scene IS the background and our frames are UI over it. This is what
 * that means in Scene data.
 *
 * Everything below is grounded in the real v14.367 source, because the obvious
 * guesses are wrong in two places:
 *
 *   `background` IS NOT A SCENE FIELD ANY MORE. It moved onto the embedded
 *   Level document (common/documents/level.mjs:86-91); `Scene#background`
 *   survives only as a non-enumerable deprecation shim
 *   (common/documents/scene.mjs:334-349, `until: 16`). Writing
 *   `background.src` at the top level of scene data does nothing at all — no
 *   error, no picture.
 *
 *   PADDING DEFAULTS TO 0.25, not 0 (common/documents/scene.mjs:78). The
 *   background image is always sized to `sceneRect`
 *   (client/canvas/groups/primary.mjs:294-301), never to the padded `rect`, so
 *   a default-padded scene draws the art in the middle of a border of empty
 *   canvas — and that border is `Level#background.color`, default `#999999`
 *   (common/documents/level.mjs:87), which is why an unconfigured stage scene
 *   shows a grey frame rather than a black one.
 *
 * Pure: no Foundry globals, no document creation. The adapter does that.
 */

/** Gridless. `CONST.GRID_TYPES.GRIDLESS` (common/constants.mjs:584). */
export const GRIDLESS = 0;

/**
 * The default level's id. Foundry's own deprecation shim maps `Scene#background`
 * to the level at this exact id (common/documents/scene.mjs:46), so using it
 * keeps the legacy accessor working for anything that still reads it.
 */
export const DEFAULT_LEVEL_ID = "defaultLevel0000";

/**
 * @param {object} source  one entry from data/campaign/stage-demo.json's `scenes`
 * @param {string} id      the deterministic Foundry id, derived by the caller
 * @param {string} backgroundPath  a module-relative path to the staged image
 */
export function buildStageSceneData(source, id, backgroundPath, { width = 1920, height = 960 } = {}) {
  if (!id) throw new Error("buildStageSceneData: a scene needs a deterministic id");
  if (!backgroundPath) throw new Error(`buildStageSceneData: ${source?.id} has no background image`);

  return {
    _id: id,
    name: source.name ?? source.id,

    // Match the artwork exactly. `Level#textures.fit` defaults to "fill"
    // (common/documents/level.mjs:105) and the mesh is resized to sceneRect,
    // so equal dimensions mean a 1:1 draw with no resampling.
    width,
    height,

    // The three fields that decide whether there is dead space around the
    // picture. padding 0 makes `rect` and `sceneRect` the same rectangle
    // (common/grid/gridless.mjs:18-26), and the 2.5% padding tint Foundry
    // paints over `rect` (client/canvas/groups/primary.mjs:332-337) then
    // covers nothing.
    padding: 0,
    shiftX: 0,
    shiftY: 0,

    // Where the camera starts. foundry/stage-camera.mjs pins it there anyway,
    // but `initial` is what a client sees for the instant before the lock
    // applies, and a scene that flashes off-centre reads as a bug.
    initial: { x: Math.round(width / 2), y: Math.round(height / 2) },

    grid: { type: GRIDLESS, size: 100 },

    // A picture, not a battlefield. Vision and darkness would put a black
    // sheet over the art and wait for a token to reveal it, and there are no
    // tokens here to do that.
    tokenVision: false,
    environment: {
      darknessLevel: 0,
      globalLight: { enabled: true, bright: true }
    },

    levels: [
      {
        _id: DEFAULT_LEVEL_ID,
        name: "Default",
        background: {
          src: backgroundPath,
          // Any sliver the cover-scale camera cannot fill should be black,
          // not Foundry's default mid-grey.
          color: "#000000"
        },
        textures: { fit: "fill" }
      }
    ]
  };
}

/**
 * The cast as the stage stores it: every member, revealed or not.
 *
 * Kept pure and separate from the scene data because the two go to DIFFERENT
 * homes — the scene is public, the authored cast is not (see foundry/stage.mjs).
 * Building them in one function would make it far too easy to write the whole
 * cast into the public half by accident.
 */
export function buildStageCast(source, portraitsById, assetPath) {
  return (source.cast ?? []).map((member) => {
    const portrait = portraitsById[member.portraitId];
    if (!portrait) throw new Error(`${source.id} casts "${member.portraitId}", which the manifest does not define`);
    return {
      portraitId: member.portraitId,
      label: portrait.label,
      img: assetPath(member.portraitId),
      kind: portrait.kind ?? null,
      characterRef: portrait.characterRef ?? null,
      // Both identity properties of the CHARACTER (who they are), not the
      // scene (why they're here today) -- so both are read off the portrait,
      // same as label/kind/characterRef, never off the per-scene cast entry.
      faction: portrait.faction ?? null,
      standing: portrait.standing ?? null,
      side: member.side ?? null,
      revealed: member.revealed !== false
    };
  });
}
