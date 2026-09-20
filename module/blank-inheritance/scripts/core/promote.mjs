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
 * Throws if `status` is a promoted value. Every writer that isn't this file
 * calls this on whatever authoring.status it's about to emit, so a caller
 * that tries to sneak a promotion through some other path learns it did
 * nothing instead of wondering later why the promotion never stuck --
 * design/approvals-desk.md §3.
 */
export function assertNotPromotedStatus(status, { source = "a writer" } = {}) {
  if (PROMOTABLE_STATUSES.includes(status)) {
    throw new Error(
      `${source} attempted to write authoring.status "${status}" -- only promote() ` +
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
