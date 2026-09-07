/**
 * Building the worked stage scenes.
 *
 * Reads data/campaign/stage-demo.json (pushed into the module by
 * tools/module-sync/sync-campaign-data.mjs) and creates one real Foundry Scene
 * per entry, each with its background art in place and its cast staged.
 *
 * DELIBERATELY NOT part of the ordinary content sync. These are demonstration
 * scenes — four arrangements with a demo cast — and folding them into
 * runRealContentSync would mean a routine content push silently recreating
 * them in a live world. They are built on request, from their own macro.
 *
 * Idempotent by deterministic id, like every other generator here: running it
 * twice updates the same four scenes rather than making four more.
 */

import { buildStageCast, buildStageSceneData } from "../core/generators/stage-scene.mjs";
import { deriveFoundryId } from "../core/ids.mjs";
import { fetchModuleJson } from "./io.mjs";
import { writeAuthoredCast } from "./stage.mjs";

const MODULE_ID = "blank-inheritance";
const MANIFEST_PATH = "data/campaign/campaign/stage-demo.json";
const ASSET_ROOT = `modules/${MODULE_ID}/assets/stage`;

const portraitPath = (id) => `${ASSET_ROOT}/${id}.webp`;
const backgroundPath = (sceneId) => `${ASSET_ROOT}/bg-${sceneId}.webp`;

/**
 * @returns {Promise<{built: string[], failed: Array<{id: string, error: string}>}>}
 */
export async function buildStageDemoScenes() {
  if (!game.user.isGM) {
    ui.notifications.warn(game.i18n.localize("BLANKINHERITANCE.Stage.NotGM"));
    return { built: [], failed: [] };
  }

  const manifest = await fetchModuleJson(MANIFEST_PATH);
  const portraitsById = Object.fromEntries((manifest.portraits ?? []).map((p) => [p.id, p]));
  const built = [];
  const failed = [];

  for (const source of manifest.scenes ?? []) {
    try {
      const id = await deriveFoundryId(source.id);
      const data = buildStageSceneData(source, id, backgroundPath(source.id));

      // Replace rather than merge. A stage scene is generated wholesale from
      // the manifest, and a partial update would leave last run's levels and
      // grid behind while looking like it had worked.
      const existing = game.scenes.get(id);
      if (existing) await existing.delete();
      const scene = await Scene.create(data, { keepId: true, keepEmbeddedIds: true });
      if (!scene) throw new Error("Scene.create returned nothing");

      await scene.setFlag(MODULE_ID, "sourceId", source.id);
      const cast = buildStageCast(source, portraitsById, portraitPath);
      await writeAuthoredCast(scene, cast, source.layout);

      built.push(scene.name);
    } catch (err) {
      console.error(`Blank Inheritance | Could not build stage scene ${source.id}:`, err);
      failed.push({ id: source.id, error: String(err?.message ?? err) });
    }
  }

  ui.notifications.info(game.i18n.format("BLANKINHERITANCE.Stage.Built", { count: built.length }));
  return { built, failed };
}

/**
 * A macro, so building the demo is a click rather than a console incantation.
 *
 * Same shape and same idempotence as the two sync macros in foundry/sync.mjs:
 * a deterministic id means re-running module setup never leaves a second copy
 * in the directory.
 */
export async function createStageDemoMacroIfMissing() {
  const macroId = await deriveFoundryId("stage-demo-macro");
  if (game.macros.get(macroId)) return;
  await Macro.create(
    {
      _id: macroId,
      name: game.i18n.localize("BLANKINHERITANCE.Stage.MacroName"),
      type: "script",
      img: "icons/svg/eye.svg",
      command: `await game.modules.get("${MODULE_ID}").api.buildStageDemoScenes();`
    },
    { keepId: true }
  );
  console.log("Blank Inheritance | Created the staged-scene demo macro.");
}
