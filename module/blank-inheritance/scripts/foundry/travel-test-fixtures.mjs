/**
 * Six temporary, clearly-marked test PCs for verifying the map-travel
 * system end to end — the Foundry-touching half. See
 * core/travel-test-fixtures.mjs for what they are and why.
 *
 * Deliberately separate from foundry/travel.mjs's own `ensureTravelToken`
 * (the real shared party marker used by the actual SCENE -> MAP -> SCENE
 * ritual): these are a standalone diagnostic aid a GM places and moves by
 * hand to SEE the map's real geography and the travel graph's own routing
 * against it, not a second production travel system.
 */

import { TEST_FIXTURE_PCS, westernEdgePoint } from "../core/travel-test-fixtures.mjs";
import { deriveFoundryId } from "../core/ids.mjs";
import { fetchModuleJson } from "./io.mjs";

const MODULE_ID = "blank-inheritance";
const CAMPAIGN_MAP_MANIFEST_PATH = "data/campaign/map/campaign-map.json";
const HUB_SOURCE_ID = "the-city";

/** The hub scene, found the same way foundry/travel.mjs#hubScene does (sourceId flag first — an adopted scene keeps its own foreign Foundry id forever). */
async function hubScene() {
  const bySourceId = game.scenes.find((s) => s.getFlag(MODULE_ID, "sourceId") === HUB_SOURCE_ID);
  if (bySourceId) return bySourceId;
  const id = await deriveFoundryId(`scene-${HUB_SOURCE_ID}`);
  return game.scenes.get(id) ?? null;
}

/** Get-or-create all six test Actors. Idempotent, safe to call every time the macro runs. */
export async function ensureTestFixturePCs() {
  if (!game.user?.isGM) return [];
  const actors = [];
  for (const pc of TEST_FIXTURE_PCS) {
    const id = await deriveFoundryId(`travel-test-pc-${pc.id}`);
    let actor = game.actors.get(id);
    if (!actor) {
      actor = await Actor.create(
        {
          _id: id,
          name: pc.name,
          type: "character",
          img: "icons/svg/mystery-man.svg",
          prototypeToken: {
            actorLink: true,
            texture: { src: "icons/svg/mystery-man.svg", tint: pc.color },
            name: pc.name,
            disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY
          },
          flags: { [MODULE_ID]: { sourceId: `travel-test-pc-${pc.id}` } }
        },
        { keepId: true }
      );
    }
    actors.push(actor);
  }
  return actors;
}

/**
 * Place all six on the hub map's own western edge, in real Scene canvas
 * space (via the same sceneCalibration the real travel ritual uses, so
 * "the western edge of the MAP" and "the western edge of THIS SCENE" are
 * guaranteed to agree) — spaced out a little so six markers arriving at the
 * same point don't render as one indistinguishable stack.
 */
export async function placeTestFixturesOnWesternEdge() {
  if (!game.user?.isGM) return [];
  const hub = await hubScene();
  if (!hub) {
    ui.notifications.warn("Blank Inheritance | No hub map scene found — build the scene set first.");
    return [];
  }

  const { sceneCalibration, toScenePoint } = await import("../core/travel-animation.mjs");
  const manifest = await fetchModuleJson(CAMPAIGN_MAP_MANIFEST_PATH).catch(() => null);
  const imageWidth = manifest?.image?.width ?? hub.width;
  const calibration = sceneCalibration(hub.tiles?.contents ?? [], hub.width, imageWidth);
  const imagePoint = westernEdgePoint(manifest);
  const scenePoint = toScenePoint(imagePoint, calibration);

  const actors = await ensureTestFixturePCs();
  const created = [];
  for (let i = 0; i < actors.length; i++) {
    const actor = actors[i];
    const tokenId = await deriveFoundryId(`travel-test-token-${TEST_FIXTURE_PCS[i].id}`);
    const existing = hub.tokens.get(tokenId);
    // Stagger in a small vertical line -- distinct, not stacked, and still
    // obviously "the same testing batch" rather than scattered at random.
    const position = { x: scenePoint.x, y: scenePoint.y + i * 80 };
    if (existing) {
      // actorLink heals a fixture placed before they were linked. An unlinked token's synthetic
      // actor loops forever on an INHERIT ownership entry (core/ownership.mjs) -- this is the
      // token the bug was first seen on (2026-10-01).
      await existing.update({ ...position, actorLink: true });
      created.push(existing);
      continue;
    }
    const [token] = await hub.createEmbeddedDocuments("Token", [
      {
        _id: tokenId,
        actorId: actor.id,
        actorLink: true,
        name: actor.name,
        x: position.x,
        y: position.y,
        texture: { src: actor.prototypeToken.texture.src, tint: actor.prototypeToken.texture.tint },
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
        flags: { [MODULE_ID]: { sourceId: `travel-test-token-${TEST_FIXTURE_PCS[i].id}` } }
      }
    ]);
    created.push(token);
  }

  if (canvas?.scene?.id !== hub.id) {
    const { cueScene } = await import("./director-panel.mjs");
    await cueScene(hub.id);
  }
  ui.notifications.info(`Blank Inheritance | Placed ${created.length} test PCs on the western edge of ${hub.name}.`);
  return created;
}

export async function createTravelTestMacroIfMissing() {
  if (!game.user?.isGM) return;
  const macroId = await deriveFoundryId("travel-test-fixtures-macro");
  if (game.macros.get(macroId)) return;
  await Macro.create(
    {
      _id: macroId,
      name: "TEST: Place Map Journey PCs (Western Edge)",
      type: "script",
      img: "icons/svg/mystery-man.svg",
      command: `await game.modules.get("${MODULE_ID}").api.placeTestFixturesOnWesternEdge();`
    },
    { keepId: true }
  );
}
