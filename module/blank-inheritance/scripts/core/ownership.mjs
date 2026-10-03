/**
 * Document ownership: the one corner of Foundry that can recurse forever on
 * data we wrote ourselves -- the pure half.
 *
 * THE BUG THIS EXISTS FOR (found live 2026-10-01 in the local test world,
 * "switch to scene 00 and back to The City" threw "RangeError: Maximum call
 * stack size exceeded" and left the Director's bar missing). Foundry's
 * `Document#getUserLevel` treats the ownership level INHERIT (-1) as "ask my
 * parent". A world Actor has no parent, so INHERIT there simply resolves to
 * NONE. The synthetic Actor behind an UNLINKED token is different: its parent
 * is the token, and `TokenDocument#getUserLevel` asks its actor, which asks
 * its parent, which asks its actor ... forever. The loop is reached by
 * anything that asks about a user other than the GM: Foundry's own
 * `hasPlayerOwner`, and sf2e's actor data preparation (alliance, initiative
 * tiebreak) on every client.
 *
 * Foundry's own ownership dialog can never put that state in a world Actor:
 * "Default" is a UI-only meta level (-20) that the dialog drops from the map
 * before saving. OUR admin panel could: handing a test character back wrote
 * INHERIT whenever there had been no entry before, which is the normal case.
 *
 * So three rules, all enforced from here:
 *   1. We never write INHERIT into a world Actor's ownership (restoredOwnership).
 *   2. Any INHERIT already there is removed at GM login (planOwnershipRepair).
 *   3. Our own readers ask the WORLD actor behind a token whether a player owns
 *      it, never the token's synthetic copy (isPlayerOwned).
 *
 * Pinned to Foundry's real source by test/tier3-ownership-contract.test.mjs.
 */

/** CONST.DOCUMENT_OWNERSHIP_LEVELS.INHERIT -- "defer to the parent document". */
export const INHERIT = -1;

/** CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE. */
export const NONE = 0;

/** The keys of an ownership map that hold INHERIT: user ids, and "default" if that is the one. */
export function inheritKeys(ownership) {
  return Object.entries(ownership ?? {})
    .filter(([, level]) => level === INHERIT)
    .map(([key]) => key);
}

/**
 * An ownership map with no INHERIT in it.
 *
 * A user's INHERIT entry is dropped: with no entry the user gets `default`,
 * which is what "inherit" was always meant to say. A `default` of INHERIT
 * becomes NONE, which is what a world Actor resolves it to anyway.
 */
export function withoutInherit(ownership) {
  const out = {};
  for (const [key, level] of Object.entries(ownership ?? {})) {
    if (level !== INHERIT) out[key] = level;
    else if (key === "default") out.default = NONE;
  }
  if (!("default" in out)) out.default = NONE;
  return out;
}

/**
 * What an actor's ownership should be after a lent test character is taken
 * back: the level the user had before the lend, or no entry at all if there was
 * none. The old code wrote INHERIT for "no entry", which is the bug above.
 *
 * `previousLevel` is whatever the lend recorded: a level, or null for "none".
 * A recorded INHERIT is treated as "none" (it is itself the stale state).
 */
export function restoredOwnership(ownership, userId, previousLevel) {
  const next = { ...(ownership ?? {}) };
  if (Number.isInteger(previousLevel) && previousLevel !== INHERIT) next[userId] = previousLevel;
  else delete next[userId];
  return withoutInherit(next);
}

/**
 * Which actors need their ownership rewritten, and to what.
 *
 * actors: [{ id, name, ownership }]
 * Returns [{ id, name, removed: [keys], ownership: <the clean map> }], empty
 * when nothing is wrong -- so running it at every login costs nothing.
 */
export function planOwnershipRepair(actors = []) {
  const plan = [];
  for (const actor of actors) {
    const removed = inheritKeys(actor.ownership);
    if (!removed.length) continue;
    plan.push({ id: actor.id, name: actor.name ?? null, removed, ownership: withoutInherit(actor.ownership) });
  }
  return plan;
}

/**
 * Whether a player owns this actor, asked in a way that cannot recurse.
 *
 * `actor.hasPlayerOwner` walks every non-GM user; on the synthetic actor of an
 * unlinked token that walk can loop (see the header). The actor a token stands
 * for in the world has no token parent, so it is always safe to ask. For an
 * ordinary actor, `isToken` is false and this is exactly `hasPlayerOwner`.
 *
 * Duck-typed on purpose: { isToken, token: { baseActor }, hasPlayerOwner }.
 */
export function isPlayerOwned(actor) {
  if (!actor) return false;
  const owner = actor.isToken ? actor.token?.baseActor ?? null : actor;
  return !!owner?.hasPlayerOwner;
}
