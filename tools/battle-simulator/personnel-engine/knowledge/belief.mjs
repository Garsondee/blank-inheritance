/**
 * Persistent per-side belief state for the PERSONNEL-SCALE engine (design doc §19) — ported from
 * ../../ai/knowledge/belief.mjs. Unlike terrain.mjs (a bare re-export, since that file has zero
 * imports of its own), this one has exactly one external dependency — `anyoneOnSideCanPerceive` —
 * and that function's own distance math must run against this tree's 5ft-square grid, not the
 * Frame-scale 50ft one. A bare `export *` here would still transitively resolve to
 * ../../engine/vision.mjs (ES module re-exports carry the ORIGINAL file's own bindings, not the
 * re-exporting file's), silently pricing every perception check at the wrong scale. So this file
 * is a full copy with that one import swapped to this tree's own vision.mjs — everything else is
 * unmodified: the algorithm (deployment-moment seeding, last-known-position tracking, the
 * deliberately narrow "position only, never fed to the tactical evaluator" scope) is exactly as
 * correct at 5ft as it was at 50ft, per the same reasoning as vision.mjs/pathfind.mjs's own ports.
 *
 * engine/vision.mjs (this tree's own) answers "can X perceive Y RIGHT NOW"; this is the layer that
 * REMEMBERS across rounds when the answer was "no."
 *
 * SCOPE, DECIDED DELIBERATELY NARROW after the Frame-scale terrain work's own hard lesson (design
 * doc §15q: an evaluator term fed a misleading position produced a genuine infinite oscillation).
 * Belief here tracks ONLY last-known POSITION, and is consumed ONLY by movement/pursuit candidate
 * generation — "where do I go looking." It does NOT feed the tactical evaluator's threat/reach
 * scoring, and it does NOT need to, because attacks are already correctly gated by REAL-TIME
 * perception (this tree's own legality.mjs checks), so a stale belief can never cause an illegal
 * or nonsensical attack.
 *
 * `state.belief` persists on `state` itself because it must survive across many separate decide()
 * calls throughout a battle — decide() is otherwise a pure function of state+turn with no memory
 * of its own.
 */
import { anyoneOnSideCanPerceive } from "../vision.mjs";

/**
 * Bring `side`'s belief up to date with what it can perceive RIGHT NOW, using the COMBINED vision
 * of every living member of that side — not just whichever combatant is about to act.
 *
 * A currently-visible enemy's position is refreshed to ground truth. An enemy nobody on the side
 * can currently see keeps its LAST recorded belief unchanged except for the `visible` flag —
 * that's the whole memory mechanism: stale position, marked stale.
 */
export function refreshBelief(state, side) {
  if (!state.belief) state.belief = {};
  // Deployment moment (design doc §15s): this side's FIRST-EVER refresh seeds a belief entry for
  // EVERY living enemy at its current (deployment) position, regardless of whether anyone can
  // currently perceive it through a wall. This matches how tabletop combat actually starts —
  // everyone sees the battlefield lineup before position-specific Line of Effect quirks kick in —
  // and it's what stops fog-of-war from meaning "start knowing NOTHING," which would leave two
  // sides separated by a wall from round 1 with no way to ever discover each other at all. Fog
  // only starts genuinely degrading belief from the SECOND refresh onward, when a side that once
  // knew where an enemy was stops being able to confirm it.
  //
  // OPT-IN EXCEPTION (design doc §35 — `state.blindDeployment`): a genuinely randomized deployment
  // (scenarios/random-deployment.mjs) already guarantees NO cross-side Line of Effect exists at the
  // start — the whole point is a real "find each other first" opening, not a known lineup viewed
  // through a temporarily-blocking wall. Seeding true positions there would silently defeat that
  // guarantee (every combatant would already know exactly where to walk from turn 1), so a scenario
  // that sets this flag starts belief genuinely EMPTY instead — real fog of war from round 0, not
  // just from round 1 onward. Every scenario that doesn't set it keeps §15s's original behavior
  // completely unchanged; this is a new, narrower mode, not a replacement for the old default.
  const isFirstRefresh = !state.belief[side];
  if (isFirstRefresh) {
    state.belief[side] = state.blindDeployment
      ? new Map()
      : new Map(
          [...state.combatants].filter(([, c]) => c.side !== side && c.currentHP > 0)
            .map(([id]) => [id, { position: { ...state.positions.get(id) }, lastSeenRound: state.round, visible: false }])
        );
  }
  const belief = state.belief[side];

  for (const [id, enemy] of state.combatants) {
    if (enemy.side === side) continue; // never track our own side — we always know where we are
    if (enemy.currentHP <= 0) { belief.delete(id); continue; } // a confirmed kill isn't something to keep "pursuing"

    if (anyoneOnSideCanPerceive(side, state, id)) {
      belief.set(id, { position: { ...state.positions.get(id) }, lastSeenRound: state.round, visible: true });
    } else {
      const existing = belief.get(id);
      if (existing) belief.set(id, { ...existing, visible: false });
      // else: no entry at all — never seen, and stays that way until refreshBelief finds them visible
    }
  }
  return belief;
}

/** Every enemy this side currently believes exists somewhere, with its last-known position. Empty if nothing has ever been seen. */
export function believedEnemies(state, side) {
  const belief = state.belief?.[side];
  if (!belief) return [];
  return [...belief.entries()].map(([id, b]) => ({ id, ...b }));
}
