/**
 * The one guarded path allowed to raise an entity's authoring.status above
 * baseline -- design/approvals-desk.md §3, design/data-ownership.md §3's
 * `lifecycle` field category. Pure: takes and returns a plain entity object,
 * zero filesystem access, zero Foundry globals (design/testing-strategy.md
 * §1's core/adapter split). A caller (today: a human running this directly;
 * from #170 on: the Desk UI) is responsible for reading the entity file,
 * calling this, and writing the result back -- I/O is deliberately not this
 * function's job.
 *
 * Deviation from issue #167's own suggested signature, on purpose: the issue
 * sketches `promote(entityId, status, {note, batchId})`, but resolving an id
 * to an entity means reading a file, and core/ may never do that (the rule
 * predates and outranks this one issue's phrasing). This takes the already-
 * loaded entity object instead. `gradedBy` is required rather than defaulted
 * to a hardcoded name, per data-ownership.md §4: "named rather than assumed."
 */

export const PROMOTABLE_STATUSES = Object.freeze(["sound", "final"]);
export const BASELINE_STATUSES = Object.freeze(["needs-lore", "drafted"]);

/**
 * The Sign-Off's own rung (design/scene-signoff.md), scene briefs only. Kept
 * separate from PROMOTABLE_STATUSES because it is a different authority with
 * a different precondition: the Desk grades an item on a read, the Sign-Off
 * seals a scene on a completed four-pass conversation. Both are guarded by
 * assertNotPromotedStatus() below, so no generator can write either.
 */
export const SEALABLE_STATUSES = Object.freeze(["live"]);

/** Every value a writer other than promote()/seal() is forbidden to emit. */
export const GUARDED_STATUSES = Object.freeze([...PROMOTABLE_STATUSES, ...SEALABLE_STATUSES]);

/**
 * The passes, in order. A seal needs every one of them CLEAR.
 *
 * `seam` was added 2026-09-22 (checklist v4), making five. It is the first pass
 * whose subject is a JOIN rather than a scene: whether the party has a valid
 * position at each edge, who travels together, who splits, and whether the
 * journey between two locations is possible in the time the episode allows.
 * It sits after Place because a seam is only measurable once both locations are
 * settled, and before Quality because fixing a seam changes the prose.
 */
export const SIGNOFF_PASSES = Object.freeze(["comprehension", "completeness", "place", "seam", "quality"]);

/**
 * Throws if `status` is a promoted value. Every writer that isn't this file
 * calls this on whatever authoring.status it's about to emit, so a caller
 * that tries to sneak a promotion through some other path learns it did
 * nothing instead of wondering later why the promotion never stuck --
 * design/approvals-desk.md §3.
 */
export function assertNotPromotedStatus(status, { source = "a writer" } = {}) {
  if (GUARDED_STATUSES.includes(status)) {
    const gate = SEALABLE_STATUSES.includes(status) ? "seal()" : "promote()";
    throw new Error(
      `${source} attempted to write authoring.status "${status}" -- only ${gate} ` +
      `(module/blank-inheritance/scripts/core/promote.mjs) may raise a status above ` +
      `baseline. Every other writer must emit "drafted" or "needs-lore".`
    );
  }
}

/**
 * Raises entity.authoring.status to "sound" or "final", stamping who and
 * when (and, when this grading was part of a machine-proposed batch rather
 * than an individual read, that too -- design/approvals-desk.md §5).
 *
 * Refuses: an entity with no authoring block at all (nothing to promote), a
 * target status outside the promotable set (demotion/"changes"/"cut" is the
 * bounce loop, design/approvals-desk.md item 6 -- a DIFFERENT function, not
 * this one), and a missing gradedBy.
 */
/**
 * `dependencyStatuses` is `{ [id]: status }` for every id in
 * `entity.authoring.dependsOn`, supplied by the caller (a pure function
 * cannot look other entities up itself). An id with NO entry is treated the
 * same as a drafted one -- missing information must never let a promotion
 * through, only ever block one (design/approvals-desk.md §3's "nothing
 * reaches sound on top of a drafted foundation," issue #168).
 */
export function promote(entity, status, { gradedBy, note = null, batchId = null, dependencyStatuses = {} } = {}) {
  if (!entity || typeof entity !== "object" || Array.isArray(entity)) {
    throw new Error("promote() needs the entity object itself, not an id, a path, or an array");
  }
  if (!entity.authoring || typeof entity.authoring !== "object") {
    throw new Error(`entity "${entity.id ?? "(no id)"}" has no authoring block -- nothing to promote`);
  }
  if (!PROMOTABLE_STATUSES.includes(status)) {
    throw new Error(
      `promote() can only raise status to ${PROMOTABLE_STATUSES.join(" or ")}, not "${status}" -- ` +
      `demoting or cutting an item is the bounce loop (design/approvals-desk.md item 6), not this function`
    );
  }
  if (!gradedBy) {
    throw new Error("promote() requires gradedBy -- who is granting this, named rather than assumed (design/data-ownership.md §4)");
  }

  const dependsOn = entity.authoring.dependsOn ?? [];
  const unresolvedDeps = dependsOn.filter((depId) => !PROMOTABLE_STATUSES.includes(dependencyStatuses[depId]));
  if (unresolvedDeps.length > 0) {
    throw new Error(
      `promote() refused: "${entity.id ?? "(no id)"}" depends on ${unresolvedDeps.join(", ")}, which ` +
      `${unresolvedDeps.length === 1 ? "is" : "are"} not sound/final -- nothing may reach sound on top of a ` +
      `drafted foundation (design/approvals-desk.md §3). Promote the dependency first, or remove it from ` +
      `dependsOn if it's no longer load-bearing.`
    );
  }

  const nextAuthoring = {
    ...entity.authoring,
    status,
    gradedAt: new Date().toISOString().slice(0, 10),
    gradedBy
  };
  if (note !== null) nextAuthoring.note = note;
  if (batchId !== null) nextAuthoring.batchId = batchId;

  return { ...entity, authoring: nextAuthoring };
}

/**
 * Raises a SCENE's authoring.status to "live" -- the Sign-Off's seal
 * (design/scene-signoff.md §3). Pure, same contract as promote(): takes and
 * returns the already-loaded entity, does no I/O, and is called by
 * tools/scene-signoff/seal.mjs which owns reading and writing the file.
 *
 * The precondition is the whole point, and it is why this is a separate
 * function rather than a third value promote() accepts: a seal is only legal
 * on top of a COMPLETE review record -- every pass CLEAR, against a
 * stated checklist version. That makes "I sealed a scene we never actually
 * talked about" impossible by construction rather than by discipline, because
 * the record is written pass by pass as the conversation happens and cannot be
 * conjured at the end (design/approvals-desk.md §3's enforcement principle,
 * applied to a conversation instead of a queue).
 *
 * BLOCKED is deliberately not good enough to seal on. A Place pass waiting on
 * Ingram to draw a building is a legitimate resting state for the review and
 * an illegitimate one for the seal -- that is exactly the case where a scene
 * would otherwise go live with no location, which is the thing the pass exists
 * to prevent.
 */
export function seal(entity, { sealedBy, review, sessionRef = null } = {}) {
  if (!entity || typeof entity !== "object" || Array.isArray(entity)) {
    throw new Error("seal() needs the scene object itself, not an id, a path, or an array");
  }
  if (!sealedBy) {
    throw new Error("seal() requires sealedBy -- whose seal this is, named rather than assumed (design/data-ownership.md §4)");
  }
  if (!review || typeof review !== "object") {
    throw new Error("seal() requires the review record -- a seal on no record is the failure this function exists to prevent");
  }
  if (!Number.isInteger(review.checklistVersion) || review.checklistVersion < 1) {
    throw new Error(
      "seal() requires review.checklistVersion (an integer) -- a seal that does not say what it was checked against " +
      "cannot be re-examined when the checklist grows (design/scene-signoff.md §5)"
    );
  }

  const passes = review.passes ?? {};
  const notClear = SIGNOFF_PASSES.filter((name) => passes[name]?.verdict !== "CLEAR");
  if (notClear.length > 0) {
    const detail = notClear.map((name) => `${name}=${passes[name]?.verdict ?? "unrun"}`).join(", ");
    throw new Error(
      `seal() refused: "${entity.id ?? "(no id)"}" has ${notClear.length} pass(es) not CLEAR (${detail}). ` +
      `All ${SIGNOFF_PASSES.length} Sign-Off passes must clear before a scene goes live (design/scene-signoff.md §4).`
    );
  }

  return {
    ...entity,
    authoring: {
      ...entity.authoring,
      status: "live",
      review: { ...review, sessionRef: sessionRef ?? review.sessionRef ?? null },
      gradedAt: new Date().toISOString().slice(0, 10),
      gradedBy: sealedBy
    }
  };
}
