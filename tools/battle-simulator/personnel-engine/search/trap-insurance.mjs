/**
 * ROOT TRAP INSURANCE — Stage 2, step 6 of GH issue #6's own build order (design doc §66): "a shallow
 * alpha-beta / expectiminimax check at the root and on the top-2 candidates before committing... the
 * tough+xenowarden loss is precisely a 2-3-ply trap — the class of blunder a highly selective MCTS is
 * known to miss." Verified true, not assumed, before building this: `mcts-uct-v1` and `mcts-puct-v1`
 * both walk straight into that exact real trap, confidently, even at 800 real iterations — because
 * neither one has real chance-node awareness (Phase B, design doc §64) wired into its own tree search
 * yet, only the Phase-A oracle does. This is NOT "MCTS is broken" — it is exactly the documented,
 * expected gap issue #6 itself names, and this file is the documented, expected patch for it.
 *
 * HOW: MCTS already runs and picks a real answer by real visit count. This wraps that result — it
 * takes MCTS's own top `topK` candidates (by real visit count, the same "robust child" signal MCTS
 * itself already trusts), and asks the Phase-A/B oracle's own `evaluateProposal` (design doc §64's
 * own real, chance-node-aware machinery) what EACH of those top candidates is REALLY worth, `oracleDepth`
 * plies deep. Whichever of those top-K has the real HIGHEST oracle-verified value wins — MCTS's own
 * statistical pick is only overridden when the oracle's real, exact check disagrees, never silently
 * discarded, and the override is always reported so a caller can see when this fired.
 *
 * COST: bounded and real — `topK` real oracle checks at `oracleDepth` plies, not a full re-search.
 * For the tough+xenowarden trap (2 real top candidates, depth 3), this is a few hundred real nodes,
 * not thousands — a real, cheap insurance premium against a real, confidently-wrong statistical pick,
 * exactly Baier & Winands' own "MCTS-Minimax Hybrid" framing this design doc section cites.
 *
 * SCOPE: scale-agnostic (design doc §75, GH issue #20) — inherits the oracle's own current scope,
 * which is now dual-scale too. Requires an MCTS result whose own `root` exposes either
 * `root.candidates` (PUCT's shape) or `root.children` (plain UCT's shape) — both `mcts-uct-v1` and
 * `mcts-puct-v1` already do, on either scale.
 */
import { evaluateProposal } from "./expectiminimax.mjs";

/** Normalizes either MCTS result shape (`mcts.mjs`'s own `root.children` Map, or `mcts-puct.mjs`'s
 * own `root.candidates` array) into one real list of `{ proposal, visits }`, real-visit-descending. */
function topCandidatesByVisits(root, topK) {
  const raw = root.candidates ? root.candidates : [...(root.children ? root.children.values() : [])];
  return raw
    .filter((c) => c.visits > 0 && c.proposal)
    .sort((a, b) => b.visits - a.visits)
    .slice(0, topK);
}

/**
 * `mctsResult` is any `{ bestProposal, root, ... }` result from `mcts.mjs`'s or `mcts-puct.mjs`'s own
 * `search()`. Returns a new result object — `{ ...mctsResult, bestProposal, meanValue, trapInsurance }`
 * — where `trapInsurance` is `{ checked: [...], overridden: boolean }`: `checked` lists every real
 * candidate the oracle actually verified with its own real value, and `overridden` is true exactly
 * when the oracle's own pick differs from MCTS's own original one. Returns `mctsResult` completely
 * unmodified (no `trapInsurance` field at all) if there's nothing real to check (no `bestProposal`, or
 * an MCTS result whose own root doesn't expose real candidates) — a caller can tell "insurance ran and
 * found nothing to change" (`trapInsurance.overridden === false`) apart from "insurance never ran."
 *
 * `adapter` (optional, design doc §75): threaded straight into `evaluateProposal`'s own real
 * `EngineAdapter` support — no `weights` default needed here (none existed before this either; every
 * real caller already resolves `weights` via `adapter.DEFAULT_WEIGHTS` before calling this function).
 */
export function applyTrapInsurance({ mctsResult, state, combatantId, turn, weights, oracleDepth = 3, topK = 2, adapter = null }) {
  if (!mctsResult.bestProposal || !mctsResult.root) return mctsResult;
  const candidates = topCandidatesByVisits(mctsResult.root, topK);
  if (!candidates.length) return mctsResult;

  const me = state.combatants.get(combatantId);
  if (!me) return mctsResult;
  const rootSide = me.side;
  const actor = {
    actingId: combatantId,
    initiativeIndex: state.initiativeOrder ? state.initiativeOrder.indexOf(combatantId) : 0,
    round: state.round ?? 1,
    turn
  };
  const initiativeOrder = state.initiativeOrder ?? [combatantId];

  const checked = [];
  let best = null;
  for (const c of candidates) {
    const evaluated = evaluateProposal({ state, actor, proposal: c.proposal, weights, rootSide, depthRemaining: oracleDepth, initiativeOrder, adapter });
    if (!evaluated) continue; // a real illegal candidate should not occur (MCTS only ever visits legal ones), but never assume
    checked.push({ proposal: c.proposal, mctsVisits: c.visits, oracleValue: evaluated.value });
    if (!best || evaluated.value > best.oracleValue) best = { proposal: c.proposal, oracleValue: evaluated.value };
  }
  if (!best) return mctsResult;

  const overridden = JSON.stringify(best.proposal) !== JSON.stringify(mctsResult.bestProposal);
  return {
    ...mctsResult,
    bestProposal: best.proposal,
    meanValue: best.oracleValue,
    trapInsurance: { checked, overridden }
  };
}
