/**
 * BASELINE POLICIES (design doc §17) — deliberately naive decision rules, existing to answer the
 * question no absolute metric can: **is the real AI actually better than something trivial?**
 *
 * The honest problem with testing a tactical AI is that there is no ground truth for "the correct
 * move" — nobody can write assert.equal(decide(state), OPTIMAL). What you *can* do is establish a
 * floor and prove you clear it. That is what these are for, in two distinct ways:
 *
 *  1. **Head-to-head.** Run the real AI against each baseline across many seeds. A system worth
 *     keeping beats "attack whatever is nearest" decisively. If it merely ties, every layer built
 *     in §15 — the sandbox, the state evaluator, belief, pathfinding — bought nothing measurable,
 *     and that is a finding worth having rather than hiding.
 *
 *  2. **Instrument calibration.** analysis/tactical-metrics.mjs's numbers are only trustworthy if
 *     a known-bad policy actually scores badly on them. A "focus fire" metric that rates the
 *     random bot as highly as the real AI is a broken metric, not evidence of equivalence. Always
 *     read a tactical metric next to what the baselines scored on the same scenario.
 *
 * CONTROLLED-EXPERIMENT DESIGN: every baseline reuses generateProposals() for candidate generation
 * and the real engine sandbox for legality filtering. The ONLY thing that varies is the selection
 * rule. That is deliberate — it isolates the contribution of the sandbox-scored state evaluator
 * specifically, rather than confounding it with candidate-generation quality (which §15's own
 * measurements identified as the larger of the two original problems). It also keeps the
 * comparison fair: a baseline that proposed illegal actions would end its turns early via
 * engine.mjs's illegal-proposal guard, and would lose for a reason that has nothing to do with
 * tactics.
 */
import { generateProposals, decisionRng } from "./decide.mjs";
import { forkTurnSandbox } from "../engine/engine.mjs";
import { distanceFeet } from "../engine/grid.mjs";

/** Candidates that the real engine accepts, paired with the sandbox result they produced. */
function legalProposals(state, combatantId, turn) {
  const out = [];
  for (const proposal of generateProposals(state, combatantId, turn)) {
    const sandbox = forkTurnSandbox({ state, turn });
    const result = sandbox.apply(combatantId, proposal);
    if (result.legal) out.push({ proposal, result });
  }
  return out;
}

const ATTACK_TYPES = new Set(["strike", "spellAttack"]);

/**
 * RANDOM: uniform choice over legal actions. The absolute floor.
 *
 * Worth stating what this bot is expected to be GOOD at, because it is the reason the pre-existing
 * metrics could not have caught §16's evaluator bug: random play scores near-perfect action
 * utilization, maximal verb diversity, and very high decision entropy. It looks healthy on every
 * "is it doing anything" measure while being the worst possible policy. Any metric it does not
 * score badly on is not measuring tactical quality.
 */
export function randomBaseline(state, combatantId, turn) {
  const options = legalProposals(state, combatantId, turn);
  if (!options.length) return null;
  const rng = decisionRng(state, combatantId, turn.decisionIndex ?? 0);
  const pick = options[Math.floor(rng() * options.length)] ?? options[0];
  return { ...pick.proposal, reason: "BASELINE(random): uniform choice among legal actions" };
}

/**
 * NEAREST: attack the closest enemy if any attack is legal; otherwise move toward the closest
 * enemy. The classic naive policy, and the one most video-game enemies actually use.
 *
 * Expected broken poles: proximity bias (ignores a dangerous distant enemy for harmless adjacent
 * chaff — should score near zero on threatPriority) and no notion of finishing a kill.
 */
export function nearestBaseline(state, combatantId, turn) {
  const options = legalProposals(state, combatantId, turn);
  if (!options.length) return null;
  const myPos = state.positions.get(combatantId);
  const distTo = (id) => {
    const p = state.positions.get(id);
    return p && myPos ? distanceFeet(myPos, p) : Infinity;
  };

  const attacks = options.filter((o) => ATTACK_TYPES.has(o.proposal.type));
  if (attacks.length) {
    attacks.sort((a, b) => distTo(a.proposal.targetId) - distTo(b.proposal.targetId));
    return { ...attacks[0].proposal, reason: "BASELINE(nearest): attack the closest enemy" };
  }

  // No attack available — close on whoever is nearest.
  const moves = options.filter((o) => o.proposal.type === "move" || o.proposal.type === "step");
  if (!moves.length) return { ...options[0].proposal, reason: "BASELINE(nearest): no attack or move available" };

  let nearestEnemyPos = null, nearestDist = Infinity;
  const me = state.combatants.get(combatantId);
  for (const c of state.combatants.values()) {
    if (c.side === me.side || c.currentHP <= 0) continue;
    const p = state.positions.get(c.id);
    if (!p) continue;
    const d = distanceFeet(myPos, p);
    if (d < nearestDist) { nearestDist = d; nearestEnemyPos = p; }
  }
  if (!nearestEnemyPos) return { ...moves[0].proposal, reason: "BASELINE(nearest): no enemy to close on" };

  moves.sort((a, b) => distanceFeet(a.proposal.to, nearestEnemyPos) - distanceFeet(b.proposal.to, nearestEnemyPos));
  return { ...moves[0].proposal, reason: "BASELINE(nearest): move toward the closest enemy" };
}

/**
 * GREEDY DAMAGE: take the single highest-expected-damage attack available this instant; if no
 * attack is legal, fall back to NEAREST's movement rule.
 *
 * The strongest of the three, and the genuinely interesting comparison — this is roughly how a
 * competent-but-shortsighted human plays. Its expected broken poles are specifically the things
 * one-action-lookahead cannot see: no focus fire when a weaker target is nearly dead (it will
 * always swing at whatever has the biggest damage number, not whatever a kill would remove), no
 * MAP discipline (a third attack at -10 is still "the best attack available" once the first two
 * are spent), no positioning value, and no reason to ever spend an action on support.
 *
 * Uses the sandbox's own expected-damage result rather than re-deriving it, so it is priced on
 * exactly the same scale the real evaluator uses — no accidental advantage or handicap.
 */
export function greedyDamageBaseline(state, combatantId, turn) {
  const options = legalProposals(state, combatantId, turn);
  if (!options.length) return null;

  const attacks = options.filter((o) => ATTACK_TYPES.has(o.proposal.type));
  if (attacks.length) {
    attacks.sort((a, b) => (b.result.damageApplied ?? 0) - (a.result.damageApplied ?? 0));
    return { ...attacks[0].proposal, reason: "BASELINE(greedy): highest expected damage attack available" };
  }
  return nearestBaseline(state, combatantId, turn);
}

export const BASELINES = {
  random: randomBaseline,
  nearest: nearestBaseline,
  greedy: greedyDamageBaseline
};
