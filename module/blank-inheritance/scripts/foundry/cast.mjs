/**
 * The cast board — the Foundry-touching half.
 *
 * Reads the tokens actually placed in the viewed scene. Not the Actors
 * directory: the board is about who is in this scene right now, which is a
 * property of the canvas, not of the world.
 */

import { buildCast, castSummary } from "../core/cast.mjs";

/**
 * Every token on the viewed scene, as board rows.
 *
 * Hidden tokens are included — this board only ever renders on a GM's client,
 * and a hidden token the GM cannot see on their own board is a trap. They are
 * flagged so the row can say so.
 */
export function castForScene() {
  const tokens = canvas?.tokens?.placeables ?? [];
  const rows = buildCast(
    tokens.map((token) => ({
      id: token.id,
      actorId: token.actor?.id ?? null,
      name: token.document?.name ?? token.actor?.name ?? null,
      isPC: token.actor?.hasPlayerOwner ?? false,
      hidden: token.document?.hidden ?? false,
      selected: token.controlled ?? false,
      disposition: token.document?.disposition ?? 0,
      hasActor: !!token.actor
    }))
  );
  return { rows, summary: castSummary(rows) };
}

/**
 * Select a row's token, which is what drives the checks zone beside it.
 *
 * Goes through the token's own control() rather than setting state of our own,
 * so the canvas, the sidebar and this board can never disagree about what is
 * selected. releaseOthers keeps it a single selection, matching what
 * actorForSeat reads.
 */
export function selectCastRow(tokenId) {
  const token = canvas?.tokens?.get(tokenId);
  if (!token) return null;
  token.control({ releaseOthers: true });
  return token;
}
