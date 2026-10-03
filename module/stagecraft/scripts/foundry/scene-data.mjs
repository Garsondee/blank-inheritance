/**
 * Where a stage lives in a Foundry scene. Authored by the GM, read by everyone.
 *
 *   flags.stagecraft.stage       the authored description: painting, rig, lights, zones, marks, chalk policy
 *   flags.stagecraft.published   who is on the stage now: { cards: [...], rev }
 *   flags.stagecraft.live        the GM's overrides, set from the strip along the top of a stage:
 *                                { chalk: { mode, locked }, chalkHidden }   (stay until the GM sets them back)
 *
 * A scene is a stage scene when it carries a description. Nothing else about it changes.
 */

import { describeScene } from "../core/scene.mjs";

export const NS = "stagecraft";

export const rawStage = (scene) => scene?.flags?.[NS]?.stage ?? null;
export const isStageScene = (scene) => !!rawStage(scene) && typeof rawStage(scene) === "object";
export const publishedCards = (scene) => (Array.isArray(scene?.flags?.[NS]?.published?.cards) ? scene.flags[NS].published.cards : []);

/** The description of a scene, understood; the painting's address is made routable (a Foundry install may live under a path). */
export function readStage(scene) {
  const result = describeScene(rawStage(scene));
  if (result.usable && result.scene.painting.src && globalThis.foundry?.utils?.getRoute) {
    result.scene.painting.src = foundry.utils.getRoute(result.scene.painting.src);
  }
  return result;
}

/** The cast, with portraits made routable too. */
export function readCast(scene) {
  const route = globalThis.foundry?.utils?.getRoute ?? ((p) => p);
  return publishedCards(scene).filter((c) => c && typeof c.id === "string").map((c) => ({ ...c, portrait: c.portrait ? route(c.portrait) : c.portrait }));
}

/**
 * Is this the one GM screen that does the housekeeping (saving where a card was put down, making and clearing the chalk
 * journal)? With two GMs connected only the lowest-id active one does, so the same thing is not done twice at once.
 */
export function actingGM() {
  if (!game.user?.isGM) return false;
  const active = game.users?.activeGM;
  return active ? active.id === game.user.id : true;
}

/** The GM's "hands off": while it is on, only a game master can move a card (a hearing, a speech, a death). */
export const handsOff = (scene) => scene?.flags?.[NS]?.live?.handsOff === true;

/** Who may take hold of a card: a game master any; a player a card that names them, or one that names no one, unless hands are off. */
export function canHold(person, user, { handsOff = false } = {}) {
  if (user?.isGM) return true;
  if (handsOff) return false;
  if (!Array.isArray(person?.owners) || person.owners.length === 0) return true;
  return person.owners.includes(user?.id);
}
