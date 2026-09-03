/**
 * FOG-OF-WAR DETERMINIZATION — Stage 2, step 8 of GH issue #6's own 8-step build order (design doc
 * §71, GH issue #10): "search over what the side actually knows." Issue #10's own §1: "Perfect-
 * information mode when it is true: if every living enemy is currently visible to the acting side
 * (cheap check via vision.mjs), search the true state. Assert this holds in the mirror-arena tests."
 * This file is that check — `isFullyVisible` — the first, smaller half of step 8; real determinization
 * (§2 of issue #10: sample k plausible worlds consistent with belief, search each, vote at the root)
 * is real, separate, still-unstarted work for its own later component.
 *
 * WHAT "fully visible" MEANS, precisely: every living enemy of `side` has a real belief entry
 * (`knowledge/belief.mjs`'s own `believedEnemies`) AND that entry's own `visible` flag is `true` —
 * matching belief.mjs's own exact "still worth tracking" convention (`enemy.currentHP > 0`, not
 * `isDead()` — belief.mjs already stops tracking anything at `currentHP <= 0` regardless of PC-style
 * dying rules, so matching `isDead()` here would create a real mismatch: a downed-but-not-yet-"dead"
 * enemy belief.mjs has ALREADY deleted from its own Map would wrongly read as "no belief entry, so not
 * fully visible" against a stricter isDead() check). "No belief entry at all" (never perceived, or a
 * combatant that arrived after this side's own first refresh and was never subsequently seen) counts
 * as NOT fully visible, same as a stale (`visible:false`) one — both mean "this side cannot currently
 * confirm the true state," which is exactly what determinization exists to handle.
 *
 * `refreshBelief` is called here exactly as `decide.mjs`'s own `generateProposals` already calls it —
 * a real, deliberate, already-audited side effect (mutates `state.belief[side]` in place, idempotent,
 * never touches the battle's own RNG or advances anything) — not a new "read-only" convention invented
 * for this file.
 *
 * A REAL, VERIFIED-DIRECTLY GAP THIS INVESTIGATION SURFACED, worth recording even though it does NOT
 * block this step: `cloneStateForPlanning` (engine.mjs, the one function every `forkTurnSandbox` fork
 * in the whole engine goes through) never copies `state.belief` or `state.blindDeployment` onto a
 * forked node's own state. So every node in a search tree BELOW the root sees `state.belief` as
 * `undefined`, and `refreshBelief` — finding no prior belief AND a falsy (because absent)
 * `blindDeployment` on that clone — reseeds belief with every living enemy's TRUE current position,
 * regardless of what the real, live battle's own belief actually says. This is a real, pre-existing
 * property of `generateProposals`'s own movement-heuristic machinery (already true for `lookahead-v1`'s
 * own multi-ply reasoning too, not something step 8 introduces), and it is NOT a problem for
 * determinization specifically: determinization's own design (Perfect Information Monte Carlo) samples
 * ONE plausible world and then searches it AS IF it were fully known ground truth throughout that
 * whole search — which is exactly what the engine already does, clone-gap included. The gap would only
 * matter for a genuinely belief-aware SINGLE tree (issue #10's own explicitly-deferred §3, "single-tree
 * IS-MCTS"), not for sampling-then-searching. Not fixed here — real, separate potential cleanup, out of
 * this step's own scope, and risky to touch blind (it could change `lookahead-v1`/`greedy-v1`'s own
 * already-tested, already-shipped multi-ply behavior).
 */
import { refreshBelief, believedEnemies } from "../knowledge/belief.mjs";

export function isFullyVisible(state, side) {
  refreshBelief(state, side);
  const believed = new Map(believedEnemies(state, side).map((b) => [b.id, b]));
  for (const enemy of state.combatants.values()) {
    if (enemy.side === side || enemy.currentHP <= 0) continue; // matches belief.mjs's own exact tracking convention
    if (believed.get(enemy.id)?.visible !== true) return false;
  }
  return true;
}
