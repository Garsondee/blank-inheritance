/**
 * SUBTREE REUSE (design doc §69, GH issue #6 step 7, part 2 of 3 — "Subtree reuse across the 3
 * action slots and into the next turn"). Pure, engine-independent matching logic: given a PREVIOUS
 * search's root and a real action that has since actually happened, decide whether the tree's own
 * predicted child for that action can be trusted as the real, current starting point for the NEXT
 * search — instead of discarding the whole tree and rebuilding from scratch.
 *
 * THE CORE CORRECTNESS PROBLEM: `mcts-puct.mjs`'s tree is built via `forkTurnSandbox`, which for
 * search purposes ALWAYS uses `EXPECTED_OUTCOMES` — a deterministic APPROXIMATION of dice (a Strike
 * becomes an "expected damage" number, not a real hit/miss/crit). A real, live battle applies the
 * actually-chosen action via `REAL_OUTCOMES` — real dice. Verified directly against every branch of
 * `attemptAction` (`engine.mjs`): proposal types `step`/`healAbility`/`stand`/`crawl` never touch the
 * outcomes table at all (pure geometry/fixed values, no dice) — for these, EXPECTED_OUTCOMES and
 * REAL_OUTCOMES are byte-identical. `move` USED to be in that same list, but isn't anymore (GH #18):
 * a move that provokes a real Reactive Strike now dispatches through `outcomes.strike(rng, ...)` via
 * the reactor, same as every other type below — harmless here, since `statesMatch` (below) verifies
 * structurally regardless of proposal type, so a real divergence this causes is still correctly
 * treated as a cache-miss, never silently reused. Every other type (`strike`, `spellAttack`,
 * `saveAttack`, `demoralize`, `conditionSave`, `areaAttack`, `trip`, `shove`, `grapple`, `escape`)
 * dispatches through `outcomes.X(rng, ...)` and will generally diverge from what a real roll actually produces.
 *
 * So naive reuse ("grab the child keyed by whatever proposal was actually taken") is UNSOUND for a
 * stochastic action. The fix: VERIFY, don't assume. After a real action is taken and the real
 * resulting state is known, check whether it structurally matches what the tree's own child already
 * predicted. If yes, reuse is sound REGARDLESS of the proposal's type — trust the verified match, not
 * a type-based guess. This also means "into the next turn" (crossing OTHER combatants' own real
 * actions) costs nothing extra to support: it's the exact same one-hop check, walked repeatedly, no
 * special-casing for who acted (`advanceRoot`, below).
 *
 * SCOPE: `personnel-engine/mcts-puct.mjs`'s own candidate-array node shape only (`{proposal, child}`)
 * — plain UCT (`mcts.mjs`)'s own `children` Map shape is deliberately NOT supported here, matching
 * this whole stage's established rule: the complete system is being assembled on top of PUCT, not
 * UCT, which stays a frozen, untouched comparison baseline (unlike `trap-insurance.mjs`, which WAS
 * asked to support both shapes — subtree reuse has no such requirement, and generalizing pre-emptively
 * would be exactly the premature abstraction this project's own conventions warn against).
 *
 * NOT ATTEMPTED HERE, DELIBERATELY: wiring this into an actual registered policy / a live `runBattle`
 * loop. The whole policy layer is confirmed 100% stateless today (`runTurn` calls the AI callback
 * fresh every action slot; none of the ~8 registered policies carry a persistent per-combatant
 * object) — actually USING reuse across real decide() calls needs some caller to hold onto
 * `{root, hops-since}`, real separate architecture work left for the eventual `mcts-v1` registration
 * step. This file only builds and proves the core, pure, hand-callable mechanism.
 */
import { proposalKey } from "./tree-shared.mjs";
import { isDeepStrictEqual } from "node:util";

/**
 * Only the fields a real action can actually change. Deliberately NOT a whole-object compare: the
 * live `runBattle` state (`engine.mjs`) always carries a `blindDeployment` OWN key (`undefined` when
 * unused — `blindDeployment: scenario.blindDeployment`), while `cloneStateForPlanning`'s own output
 * (what every tree node's `.state` actually is) never mentions that key at all — `isDeepStrictEqual`
 * treats an explicit `undefined` key and an absent key as UNEQUAL (verified directly), so a naive
 * whole-object compare would fail EVERY hop, for every scenario, silently and permanently. `round`/
 * `combatants`/`positions` are exactly the fields `cloneStateForPlanning`'s own header calls out as
 * "the fields the engine ever mutates" — `gridSize`/`seed`/`initiativeOrder`/`walls` are fixed for
 * the whole life of a battle and comparing them adds nothing.
 */
const RELEVANT_FIELDS = ["round", "combatants", "positions"];

function statesMatch(a, b) {
  return RELEVANT_FIELDS.every((field) => isDeepStrictEqual(a[field], b[field]));
}

/**
 * One verified hop. `previousRoot` is a real search's own root (or a node already reached via a
 * prior `findReusableNode` call — the same function works at any depth). `realProposal` is the real
 * action that was actually taken; `realState` is the real resulting state (same shape as
 * `cloneStateForPlanning`'s output — `{round, gridSize, seed, initiativeOrder, walls, combatants,
 * positions}` — a caller building this from a live `runBattle` state directly is fine too, since only
 * `round`/`combatants`/`positions` are ever compared).
 *
 * Returns `{reused, node, reason}` — `node` is the SAME object reference as the tree's own child
 * (its real accumulated visits/valueSum/candidates preserved, not rebuilt) when `reused` is true, or
 * `null` with a `reason` (`"no-matching-candidate"` | `"never-expanded"` | `"state-diverged"`)
 * otherwise. Never throws — an unmatched/diverged hop is a normal, expected outcome (the caller's
 * own job to fall back to a fresh search), not an error.
 */
export function findReusableNode({ previousRoot, realProposal, realState }) {
  const key = proposalKey(realProposal);
  const candidate = previousRoot.candidates?.find((c) => proposalKey(c.proposal) === key);
  if (!candidate) return { reused: false, node: null, reason: "no-matching-candidate" };
  if (!candidate.child) return { reused: false, node: null, reason: "never-expanded" };
  if (!statesMatch(candidate.child.state, realState)) return { reused: false, node: null, reason: "state-diverged" };
  return { reused: true, node: candidate.child, reason: "reused" };
}

/**
 * Walks MULTIPLE real hops since `previousRoot` was built — by whoever acted, not necessarily the
 * same combatant, which is what makes "into the next turn" (crossing other combatants' own turns)
 * the SAME mechanism as "next action slot," not a special case. `hops` is `[{proposal, resultState},
 * ...]` in chronological order. Stops at the first hop that can't be verified and returns the
 * DEEPEST node successfully reached (or `null`, with `hopsReused: 0`, if even the very first hop
 * failed — nothing here to reuse, a caller should build fresh). `hopsReused` tells a caller/test
 * exactly how much of the requested chain was actually usable, honest partial credit rather than an
 * all-or-nothing signal.
 *
 * Cross-actor hops (an opponent's or ally's REAL choice, not the searching agent's own) are expected
 * to hit `"never-expanded"` more often than same-actor hops — PUCT + progressive widening
 * deliberately concentrate expansion on the searching agent's own best-looking lines, so another
 * actor's real move is disproportionately likely to never have been tried. This function still
 * handles that correctly (fails closed, honest partial credit) — it just won't have as high a hit
 * rate there, a real, structural property, not a bug.
 */
export function advanceRoot({ previousRoot, hops }) {
  let node = previousRoot;
  let hopsReused = 0;
  for (const hop of hops) {
    const result = findReusableNode({ previousRoot: node, realProposal: hop.proposal, realState: hop.resultState });
    if (!result.reused) {
      return { node: hopsReused > 0 ? node : null, hopsReused, reason: `stopped-at-hop-${hopsReused}: ${result.reason}` };
    }
    node = result.node;
    hopsReused += 1;
  }
  return { node, hopsReused, reason: hops.length ? "all-hops-reused" : "no-hops-provided" };
}
