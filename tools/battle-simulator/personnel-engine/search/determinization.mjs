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
import { cloneStateForPlanning } from "../engine.mjs";
import { reachableCells } from "../world/pathfind.mjs";
import { decisionRng } from "../decide.mjs";
import { search } from "./mcts-puct.mjs";
import { proposalKey } from "./tree-shared.mjs";

export function isFullyVisible(state, side) {
  refreshBelief(state, side);
  const believed = new Map(believedEnemies(state, side).map((b) => [b.id, b]));
  for (const enemy of state.combatants.values()) {
    if (enemy.side === side || enemy.currentHP <= 0) continue; // matches belief.mjs's own exact tracking convention
    if (believed.get(enemy.id)?.visible !== true) return false;
  }
  return true;
}

/**
 * REAL DETERMINIZATION (design doc §72, GH issue #10's own §2 — "Determinization otherwise: sample k
 * plausible worlds consistent with belief... search each, and vote/average at the root"). This design
 * was adversarially reviewed before any of it was written; the review caught a real crash and a real
 * aggregation flaw, both fixed below — see the design doc for the full trace of each.
 *
 * `sampleDeterminizedWorld({state, side, rng})` builds ONE plausible world: every living enemy of
 * `side`'s opposition that ISN'T currently, genuinely visible (same per-enemy check `isFullyVisible`
 * itself uses) gets a REAL, sampled position instead of — never in addition to — its true one:
 * - STALE (a real belief entry, `visible:false`, real `position`/`lastSeenRound`): sampled uniformly
 *   from the REAL reachable-cell set (`world/pathfind.mjs`'s own `reachableCells` — confirmed directly
 *   that its `from` is a raw `{col,row}` and the mover need not already exist in `state.positions`, so
 *   this needs zero new pathfinding code) starting from the belief's own last-known position, out to a
 *   real, honest, DELIBERATELY conservative travel estimate — see `estimateTravelFeet` below for why
 *   it's `enemy.speed` per elapsed round, not the true 3-action worst case. Sampled the same way
 *   `decide.mjs`'s own blind-exploration code already samples a random reachable cell
 *   (`decide.mjs`'s own `[...reachableCells(...).values()]` + `cells[Math.floor(rng()*cells.length)]`
 *   pattern) — not a new sampling idiom.
 * - NEVER-SEEN (no belief entry at all): EXCLUDED from the sampled world entirely — the simpler of
 *   issue #10's own two offered options ("excluded or placed by a prior"). REAL, DOCUMENTED LIMITATION,
 *   not silently accepted: because exclusion is UNCONDITIONAL across every one of the k samples, the
 *   aggregated result is a unanimous-LOOKING "nothing's there" signal that is actually zero independent
 *   evidence — worse than an honestly-low-confidence guess, and this is the DEFAULT state of every
 *   enemy in a `blindDeployment` scenario before first contact, exactly the phase those scenarios exist
 *   to stress. A cheap partial mitigation (reserving some samples to place never-seen enemies at
 *   plausible entry points instead of excluding them) is real, separate, explicitly deferred — proven
 *   directly by its own dedicated test (`determinization-search.test.mjs`) rather than hidden.
 *
 * Never copies `state.belief`/`state.blindDeployment` onto the sampled output (matching
 * `cloneStateForPlanning`'s own shape) — leaving them absent is what makes the sample's own root treat
 * ITSELF as full ground truth, consistent with every node already below it in any search tree; copying
 * real belief over would make the root behave INCONSISTENTLY with its own descendants. Do not "fix"
 * this by adding them back.
 */
function shuffleInPlace(items, rng) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

/** A real, honest, DELIBERATELY CONSERVATIVE estimate of how far a hidden enemy could plausibly have
 * moved since it was last actually seen — `enemy.speed` (one action's worth) per elapsed round, not
 * the true worst case (up to 3 actions of Stride per round, SF2E's own action economy) — using the
 * true ceiling would balloon the reachable radius toward "most of the map," destroying the real signal
 * "last known position" is supposed to carry. `Math.max(1, ...)` guards a real, non-hypothetical bug:
 * `refreshBelief` runs once per real `decide()` call, not once per round, so an enemy seen EARLY in a
 * round and lost LATER the same round keeps `lastSeenRound === state.round` — `state.round -
 * lastSeenRound` alone would then be exactly `0`, wrongly forcing the sample onto the exact stale
 * square even though a real, full turn's worth of movement could have happened in between. Only needs
 * to cover RETROACTIVE uncertainty (where it wandered before now) — the enemy's own FORWARD movement
 * DURING the search itself is handled correctly and for free, since a sampled-but-stale enemy stays a
 * real member of `initiativeOrder` and gets genuine turns inside the search tree. Real, reasonable,
 * untuned — matching every other named search parameter in this directory (issue #12's own job). */
function estimateTravelFeet(state, belief, enemy) {
  const roundsSince = Math.max(1, (state.round ?? 1) - belief.lastSeenRound);
  return roundsSince * (enemy.speed ?? 0);
}

export function sampleDeterminizedWorld({ state, side, rng }) {
  refreshBelief(state, side); // self-contained, matching isFullyVisible's own pattern — idempotent, safe to call whether or not a caller already refreshed
  const sampled = cloneStateForPlanning(state);
  const believed = new Map(believedEnemies(state, side).map((b) => [b.id, b]));

  const hidden = [];
  for (const enemy of state.combatants.values()) {
    if (enemy.side === side || enemy.currentHP <= 0) continue;
    const belief = believed.get(enemy.id);
    if (belief?.visible === true) continue; // genuinely visible right now — true position already stands
    hidden.push({ id: enemy.id, enemy, belief });
  }
  // Shuffled per sample: placement is sequential and cumulative below (each hidden enemy's own
  // occupancy check includes everyone already placed, so two hidden enemies can never land on the
  // same cell — collision-safe by construction regardless of order), but a FIXED order would let
  // whichever enemy goes first always win any contested cell, identically, in every one of the k
  // samples — defeating the whole point of an ensemble, which is supposed to smooth out exactly this
  // kind of single-sample artifact.
  shuffleInPlace(hidden, rng);

  const hiddenIds = new Set(hidden.map((h) => h.id));
  const occupied = [...sampled.positions.entries()]
    .filter(([id]) => !hiddenIds.has(id))
    .map(([id, pos]) => ({ col: pos.col, row: pos.row, side: sampled.combatants.get(id).side }));

  for (const { id, enemy, belief } of hidden) {
    if (!belief) {
      sampled.combatants.delete(id);
      sampled.positions.delete(id);
      continue;
    }
    const maxFeet = estimateTravelFeet(sampled, belief, enemy);
    const cells = [...reachableCells({
      from: belief.position, maxFeet, gridSize: sampled.gridSize, occupiedPositions: occupied,
      walls: sampled.walls, moverSide: enemy.side
    }).values()];
    if (!cells.length) {
      // Degenerate: not even the last-known square is reachable right now (e.g. something else has
      // since moved onto it, with nowhere else in range) — exclude rather than risk placing this
      // enemy directly on top of a real, known combatant.
      sampled.combatants.delete(id);
      sampled.positions.delete(id);
      continue;
    }
    const picked = cells[Math.floor(rng() * cells.length)];
    const destination = picked.path[picked.path.length - 1];
    sampled.positions.set(id, { col: destination.col, row: destination.row });
    occupied.push({ col: destination.col, row: destination.row, side: enemy.side });
  }

  sampled.initiativeOrder = sampled.initiativeOrder.filter((id) => sampled.combatants.has(id));
  return sampled;
}

/**
 * Every non-`move` proposal already votes/aggregates correctly under an exact `proposalKey` — a
 * Strike/spell/demoralize/etc. keys on a stable `targetId` (+ a small integer index) that doesn't
 * change based on where a HIDDEN enemy's own sampled position landed. `move` is different: its own key
 * embeds the destination cell AND the full Dijkstra path, both of which shift almost every sample
 * (movement generation is downstream of wherever the hidden enemy got sampled to) — so even the exact
 * same real tactical idea ("retreat toward that corner") fragments into a near-total k-way tie with one
 * vote each under an exact key. Bucketed instead, by real compass octant relative to the ACTOR'S OWN
 * true (never hidden) current position — captures the real, qualitatively meaningful distinction
 * (retreat vs. advance vs. flank), not raw cell identity.
 */
function categoryKey(proposal, actorTruePos) {
  if (proposal.type !== "move") return proposalKey(proposal);
  const angle = Math.atan2(proposal.to.row - actorTruePos.row, proposal.to.col - actorTruePos.col);
  const octant = (((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8);
  return `move:${octant}`;
}

/**
 * The real public entry point. When `isFullyVisible` (the same detector, called fresh here so this
 * function is self-contained), search the true state exactly as `search()` already does today — zero
 * behavior change on the open arena, issue #10's own §1. Otherwise: `k` independent samples, each
 * searched in full, POOLED (not per-sample-averaged, not voted by count) by `categoryKey` — pooling
 * `valueSum`/`visits` across samples (rather than averaging k pre-computed per-sample means) is the
 * statistically sound way to combine samples of different internal sizes, and reuses data `search()`
 * already returns (`root.candidates`) instead of throwing away everything but `bestProposal`. The
 * winning category is the one with the highest POOLED mean value; its own representative proposal
 * (the first one seen for that category) is returned as `bestProposal`.
 *
 * NOT wired into any live `decide()` sequence — matching subtree reuse's own explicit scope boundary,
 * this is the real, standalone, hand-callable mechanism; making an actual registered policy branch on
 * it is separate, later work.
 *
 * PERSONNEL-SCALE ONLY, unlike `mcts-puct.mjs`'s own `search()` below (design doc §74, GH issue #20):
 * `...searchOptions` would pass an `adapter` straight through to `search()` if a future caller
 * supplied one, but `decisionRng`/`isFullyVisible`/`sampleDeterminizedWorld` in this file all stay
 * hardcoded to personnel-only imports — a caller doing that today would get a half-adapted result,
 * not a real error. Porting THIS file is its own separate, dedicated future step, not covered here.
 */
export function searchWithDeterminization({ state, combatantId, turn, k = 8, ...searchOptions }) {
  const me = state.combatants.get(combatantId);
  const side = me.side;
  if (isFullyVisible(state, side)) {
    return search({ state, combatantId, turn, ...searchOptions });
  }
  const rng = decisionRng(state, combatantId, turn.decisionIndex ?? 0);
  const myTruePos = state.positions.get(combatantId);
  const buckets = new Map();

  for (let i = 0; i < k; i++) {
    const sampledState = sampleDeterminizedWorld({ state, side, rng });
    const result = search({ state: sampledState, combatantId, turn, ...searchOptions });
    for (const candidate of result.root?.candidates ?? []) {
      if (!candidate.visits) continue;
      const key = categoryKey(candidate.proposal, myTruePos);
      const bucket = buckets.get(key) ?? { representativeProposal: candidate.proposal, valueSum: 0, visits: 0 };
      bucket.valueSum += candidate.valueSum;
      bucket.visits += candidate.visits;
      buckets.set(key, bucket);
    }
  }

  let best = null;
  for (const bucket of buckets.values()) {
    const meanValue = bucket.valueSum / bucket.visits;
    if (!best || meanValue > best.meanValue) best = { representativeProposal: bucket.representativeProposal, visits: bucket.visits, meanValue };
  }
  return {
    bestProposal: best?.representativeProposal ?? null,
    visits: best?.visits ?? 0,
    meanValue: best?.meanValue ?? 0,
    samples: k,
    determinized: true
  };
}
