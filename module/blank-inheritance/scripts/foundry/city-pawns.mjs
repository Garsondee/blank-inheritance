/**
 * Pawns: each player character's own token on The City
 * (design/world-map-destinations.md §9).
 *
 * A pawn is the character's real token, backed by the character's own Actor,
 * so the player owns it -- which is what points each player's camera at their
 * own journey (foundry/travel-camera.mjs follows the tokens a viewer owns).
 *
 * Players never drag them. Ingram, 2026-09-28: "We take away normal Foundry
 * VTT token movement by dragging deliberately from players on the world map,
 * the only way to move their tokens is via our system." The guards below
 * refuse any player-requested move of any token on the hub; the GM's own
 * client (which moves pawns when the party travels) is untouched.
 */

import { resolveTokenRing } from "../core/generators/token-ring.mjs";
import { deriveFoundryId } from "../core/ids.mjs";
import { scenePointFor } from "./travel.mjs";

const MODULE_ID = "blank-inheritance";
const HUB_SOURCE_ID = "the-city";

/** Whether a Scene is The City. */
export function isHubScene(scene) {
  return scene?.getFlag?.(MODULE_ID, "sourceId") === HUB_SOURCE_ID || scene?.getFlag?.(MODULE_ID, "kind") === "hub";
}

/**
 * How many grid squares across a pawn is. The hub's grid is 50 scene pixels
 * (50 m) on a 12,400-pixel map, so a one-square token is a speck at any zoom
 * that shows more than a district; three reads as a person on the map.
 */
export const PAWN_SQUARES = 3;

/** A pawn's side length on the hub, in scene pixels. */
export function pawnSize(hub) {
  return (hub?.grid?.size ?? hub?.dimensions?.size ?? 100) * PAWN_SQUARES;
}

/** The pawn token of one player on the hub, if it exists. */
export function pawnFor(hub, userId) {
  return hub?.tokens?.find((t) => t.getFlag(MODULE_ID, "pawn")?.userId === userId) ?? null;
}

/**
 * Make sure every listed player has a pawn on the hub, standing at their
 * place (`placeOf`: userId -> data/locations id). Creates what is missing and
 * moves what exists, without animation: this is setting the board, not a
 * journey.
 */
export async function ensurePawns(hub, placeOf) {
  if (!game.user?.isGM || !hub) return [];
  const half = pawnSize(hub) / 2;
  const created = [];
  const updates = [];
  for (const [userId, placeRef] of Object.entries(placeOf)) {
    const user = game.users.get(userId);
    const actor = user?.character;
    if (!actor || !placeRef) continue;
    const point = await scenePointFor(placeRef);
    if (!point) continue;
    const x = Math.round(point.x - half);
    const y = Math.round(point.y - half);
    const existing = pawnFor(hub, userId);
    if (existing) {
      // actorLink heals a pawn made before pawns were linked (see below).
      updates.push({ _id: existing.id, x, y, width: PAWN_SQUARES, height: PAWN_SQUARES, hidden: false, actorLink: true });
      continue;
    }
    const base = (await actor.getTokenDocument({ x, y })).toObject();
    created.push({
      ...base,
      _id: await deriveFoundryId(`city-pawn-${userId}`),
      x,
      y,
      width: PAWN_SQUARES,
      height: PAWN_SQUARES,
      hidden: false,
      // Linked, so the pawn's actor IS the character's own Actor. "The character's real token" was
      // only true of a character whose prototype token happened to be linked; an unlinked pawn
      // stands for a synthetic copy parented to the token, and that copy loops forever on any
      // ownership entry set to INHERIT (core/ownership.mjs).
      actorLink: true,
      ring: resolveTokenRing("character", {}),
      // The map is read whole (scene-build.mjs turns the hub's vision off); a pawn never limits what its player sees.
      sight: { ...(base.sight ?? {}), enabled: false },
      flags: { ...(base.flags ?? {}), [MODULE_ID]: { ...(base.flags?.[MODULE_ID] ?? {}), pawn: { userId } } }
    });
  }
  if (updates.length) await hub.updateEmbeddedDocuments("Token", updates, { animate: false });
  if (created.length) await hub.createEmbeddedDocuments("Token", created, { keepId: true });
  return created;
}

/**
 * Players cannot move anything on The City by hand. Both hooks run on the
 * client that asked for the move, so returning false there stops a player's
 * drag, keyboard nudge or ruler move before it is ever sent.
 */
export function registerPawnGuards() {
  Hooks.on("preUpdateToken", (tokenDoc, changes) => {
    if (game.user?.isGM) return;
    if (!isHubScene(tokenDoc.parent)) return;
    if ("x" in changes || "y" in changes || "elevation" in changes) return false;
  });
  Hooks.on("preMoveToken", (tokenDoc) => {
    if (game.user?.isGM) return;
    if (isHubScene(tokenDoc.parent)) return false;
  });
}
