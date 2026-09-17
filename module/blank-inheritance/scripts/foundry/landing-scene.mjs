/**
 * The landing scene — design/foundry-module-design.md §7: "the landing page
 * is a Scene, not a special screen... a Scene whose only purpose is being
 * the idle 'home base' between beats." Designed there, never built until
 * now (design/induction-terminal.md §7 item 1's own open question: "no
 * 'lobby' or landing scene currently exists as a concept").
 *
 * Built on core/generators/stage-scene.mjs's buildStageSceneData exactly as-is
 * -- a gridless, fully-lit, tokenVision:false scene is the right shape for an
 * idle room regardless of whether real Tokens sit on it (that file's own "a
 * picture, not a battlefield" framing is about the STAGE system's use of it,
 * not a constraint the data shape itself enforces). Background art:
 * artwork/locations/directorate-headquarters--lobby.png, already registered
 * and explicitly unassigned to any specific beat ("general facility interior,
 * not scene-specific" per data/campaign/asset-registry.json) -- a corridor/
 * lobby is exactly what "home base between beats" needs, so no new art had
 * to be commissioned for this.
 *
 * Idempotent by deterministic id, but check-then-create (ensureStageVault's
 * idiom), NOT buildStageDemoScenes' delete-then-recreate -- this scene
 * accumulates real player Tokens over time as people finish induction, and a
 * destructive rebuild would wipe every one of them.
 *
 * SUPERSEDED IN PART, 2026-09-17. The campaign now authors its own landing
 * scene in data/campaign/scene-set.json -- "The Road In", which is both a
 * better home base and the literal road every one of the six arrives on --
 * and foundry/scene-build.mjs builds it with `kind: "landing"`. So everything
 * below now DEFERS to that scene when it exists and only falls back to making
 * its own when it does not.
 *
 * Without that deference this module recreated its own lobby on every startup,
 * beside the authored one, with art that had since been replaced by a WebP
 * derivative -- two scenes of the same name, one of them blank. Found live.
 */

import { buildStageSceneData } from "../core/generators/stage-scene.mjs";
import { nextTokenPosition } from "../core/token-layout.mjs";
import { deriveFoundryId } from "../core/ids.mjs";

const MODULE_ID = "blank-inheritance";
const LANDING_SCENE_SOURCE_ID = "landing-scene";
const BACKGROUND_PATH = `modules/${MODULE_ID}/assets/scenes/directorate-headquarters--lobby.webp`;
// The real pixel size of that PNG -- buildStageSceneData draws it 1:1 at
// these dimensions (its own "match the artwork exactly" comment).
const SCENE_WIDTH = 3072;
const SCENE_HEIGHT = 1536;

/**
 * The scene the campaign itself nominates as the landing scene, if it has been
 * built. Matched on the flag foundry/scene-build.mjs writes, so nothing here
 * has to know the manifest's own ids.
 */
function authoredLandingScene() {
  // Defensive on purpose. This sits underneath placeActorOnLandingScene, whose
  // own contract is best-effort ("a player with a real Actor but no token yet
  // is a far smaller problem than losing the character"), so a collection that
  // is missing, is not iterable, or holds something without getFlag must read
  // as "no authored landing scene" rather than take the induction path down
  // with it. Found by test/tier4-induction-relay.test.mjs, whose mock scenes
  // legitimately carry no flags at all.
  try {
    const scenes = game?.scenes;
    if (!scenes?.find) return null;
    return scenes.find((scene) => scene?.getFlag?.(MODULE_ID, "kind") === "landing") ?? null;
  } catch {
    return null;
  }
}

export async function landingSceneId() {
  return authoredLandingScene()?.id ?? deriveFoundryId(LANDING_SCENE_SOURCE_ID);
}

/** GM only. Creates the landing scene once; a second call is a no-op that returns the existing one. */
export async function ensureLandingScene() {
  if (!game.user.isGM) return null;
  const authored = authoredLandingScene();
  if (authored) return authored; // the campaign has its own; do not make a second

  const id = await landingSceneId();
  const existing = game.scenes.get(id);
  if (existing) return existing;

  const data = buildStageSceneData(
    { id: LANDING_SCENE_SOURCE_ID, name: game.i18n.localize("BLANKINHERITANCE.LandingScene.Name") },
    id,
    BACKGROUND_PATH,
    { width: SCENE_WIDTH, height: SCENE_HEIGHT }
  );
  const scene = await Scene.create(data, { keepId: true, keepEmbeddedIds: true, render: false });
  console.log("Blank Inheritance | Created the landing scene.");
  return scene;
}

/**
 * GM only (Token creation needs the Assistant/GM role regardless of Scene
 * ownership -- common/documents/token.mjs's own metadata.permissions.create
 * is the plain string "TOKEN_CREATE", with no parent-ownership override the
 * way embedded Items have; confirmed live 2026-09-16 against this project's
 * own test world, same permission shape as ACTOR_CREATE). Called from
 * foundry/induction-relay.mjs's own GM-side handler, right after it creates
 * the Actor -- never the actor-creation path's OWN concern.
 *
 * Best-effort by design: a player with a real Actor but no token yet is a
 * far smaller problem than losing the character over a scene that doesn't
 * exist (e.g. a GM who hasn't run ensureLandingScene yet). Returns the
 * created TokenDocument, or null if it could not be placed.
 */
export async function placeActorOnLandingScene(actor) {
  if (!game.user.isGM) return null;
  const id = await landingSceneId();
  const scene = game.scenes.get(id);
  if (!scene) {
    console.warn("Blank Inheritance | No landing scene exists yet -- skipping token placement for", actor.name);
    return null;
  }

  const { x, y } = nextTokenPosition(scene.tokens.size, SCENE_WIDTH, SCENE_HEIGHT);
  const tokenDoc = await actor.getTokenDocument({ x, y }, { parent: scene });
  const [created] = await scene.createEmbeddedDocuments("Token", [tokenDoc.toObject()]);
  return created ?? null;
}

/**
 * GM only, same permission shape as placeActorOnLandingScene (TOKEN_DELETE
 * is Assistant/GM-only too -- common/documents/token.mjs's own metadata,
 * confirmed live). The other half of that function: an Actor deleted
 * without this first would leave an orphaned, actor-less Token sitting on
 * the landing scene forever -- found live 2026-09-16, deleting a test Actor
 * left its token behind pointing at nothing. Called from
 * foundry/induction-relay.mjs's own delete relay, which is exactly the path
 * that deletes an Actor after a token may already have been placed for it
 * (#createCharacterActor's rollback-on-failure).
 */
export async function removeActorTokenFromLandingScene(actorId) {
  if (!game.user.isGM) return;
  const id = await landingSceneId();
  const scene = game.scenes.get(id);
  if (!scene) return;
  const staleIds = scene.tokens.filter((t) => t.actorId === actorId).map((t) => t.id);
  if (staleIds.length) await scene.deleteEmbeddedDocuments("Token", staleIds);
}
