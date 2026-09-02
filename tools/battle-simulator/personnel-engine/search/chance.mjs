/**
 * REAL STOCHASTIC CHANCE NODES — "Phase B" (design doc §61/§62's own language), GH issue #6 step 4:
 * "expanding a proposal into its real crit/hit/miss/crit-miss branches via `degreeProbabilities`,
 * each weighted by its real probability." This is the piece that unlocks issue #21's own headline
 * example — "the exact 3-ply value of stepping into melee next to two Athletics-capable enemies...
 * is a number, not an opinion" — since Phase A's deterministic-only oracle/MCTS can only ever resolve
 * a Trip at its expected-value collapse, never as a genuine crit/hit/miss/crit-fail branch.
 *
 * SCOPE, real and stated plainly: this first slice covers exactly the two action types the tough+
 * xenowarden trip-pile-on trap actually needs — `strike` and `trip`. Every other stochastic action
 * type this engine has (shove, grapple, saveAttack, demoralize, conditionSave, areaAttack) is real,
 * separate, deferred work — `isStochasticProposal` names exactly which types are covered so a caller
 * never silently treats an uncovered type as deterministic. Adding one is a real, contained addition
 * to `makeDegreeForcedOutcomes` below, matching the exact shape `REAL_OUTCOMES`/`EXPECTED_OUTCOMES`
 * already establish for that action type — not a new pattern.
 *
 * HOW: `forkTurnSandbox` was widened (design doc §64) to accept an optional `outcomes` table,
 * defaulting to `EXPECTED_OUTCOMES` exactly as before. `makeDegreeForcedOutcomes(degree, report)`
 * builds a THIRD such table — instead of rolling a real d20 (`REAL_OUTCOMES`) or computing a
 * continuous probability-weighted average (`EXPECTED_OUTCOMES`), it resolves deterministically for
 * ONE SPECIFIC forced degree, with damage dice collapsed to their expectation for that degree (issue
 * #6's own explicit, stated simplification — exact damage-die enumeration is real, separate, future
 * work). `attemptAction` itself never knows or cares which table produced a roll — legality, action
 * costs, modifier computation (multiple attack penalty, range penalty, flanking, cover), prone
 * application, and dying transitions are ALL still the engine's own real, unmodified logic; this file
 * never re-derives any of them. The `report` object is how a degree-forced table hands back the REAL
 * modifier/DC `attemptAction` actually computed for this attempt, so `expandChanceNode` can compute
 * `degreeProbabilities` from the SAME real numbers a live roll would use, without re-deriving
 * multiple-attack-penalty/range-penalty/flanking/cover math a second time.
 */
import { forkTurnSandbox } from "../engine.mjs";
import { degreeProbabilities, averageStrikeDamage, averageDamage, mitigateDamage } from "../../engine/resolve.mjs";

const STOCHASTIC_TYPES = new Set(["strike", "trip"]);

/** Real, explicit membership check — never assume, always name exactly which proposal types this
 * file actually knows how to expand into real chance-node branches. */
export function isStochasticProposal(proposal) {
  return STOCHASTIC_TYPES.has(proposal.type);
}

function makeDegreeForcedOutcomes(degree, report) {
  return {
    strike(_rng, { strike, target, targetEffective, mapPenalty }) {
      report.modifier = strike.attackBonus + mapPenalty;
      report.dc = targetEffective.ac;
      const avgRaw = averageStrikeDamage(strike);
      let appliedDamage = 0;
      if (degree === "success") appliedDamage = mitigateDamage(avgRaw, { target, targetEffective, strike });
      else if (degree === "criticalSuccess") appliedDamage = mitigateDamage(avgRaw * 2, { target, targetEffective, strike });
      if (appliedDamage > 0) target.currentHP = Math.max(0, target.currentHP - appliedDamage);
      return {
        roll: {
          expected: true, forced: true, d20: null, degree, total: null,
          attackBonus: strike.attackBonus, mapPenalty, targetAc: targetEffective.ac,
          damage: appliedDamage > 0 ? { raw: appliedDamage, entries: [] } : null
        },
        appliedDamage, immune: false
      };
    },
    trip(_rng, { attacker, target, targetEffective }) {
      report.modifier = attacker.athleticsModifier ?? 0;
      report.dc = 10 + target.saves.fort;
      let appliedDamage = 0;
      if (degree === "criticalSuccess") {
        appliedDamage = mitigateDamage(averageDamage("1d6", 0), { target, targetEffective, strike: null });
        target.currentHP = Math.max(0, target.currentHP - appliedDamage);
      }
      const fell = degree === "criticalSuccess" || degree === "success";
      const selfFell = degree === "criticalFailure";
      return { roll: { expected: true, forced: true, d20: null, degree, total: null }, appliedDamage, fell, selfFell };
    }
  };
}

/**
 * Real chance-node expansion. `proposal` must be `isStochasticProposal(proposal)` — callers check
 * this themselves so a policy/search can dispatch stochastic vs. deterministic proposals differently
 * without this function silently guessing.
 *
 * Forks the sandbox once per real degree of success with `probability > 0` (up to 4, per issue #6's
 * own "up to 4 outcome children"), each with the DEGREE-FORCED outcomes table above. The very first
 * fork (forced to "success", regardless of that degree's own real probability) exists purely to read
 * back the REAL modifier/DC `attemptAction` actually used via `report` — every other real modifier
 * input (multiple attack penalty, range, flanking, cover, condition penalties) is computed identically
 * by `attemptAction` no matter which degree gets forced, so one real fork is enough to learn it, and
 * `degreeProbabilities` is then computed ONCE and shared by every branch.
 *
 * Returns an array of `{ degree, probability, state, turn, legal }`, one entry per real branch worth
 * keeping (`probability > 0`), OR a single `{ degree: null, probability: 1, state, turn, legal: false }`
 * entry if the proposal turns out illegal (the engine's own legality check, never re-derived here —
 * an illegal proposal has no real degree to branch on at all).
 */
export function expandChanceNode({ state, turn, combatantId, proposal }) {
  const report = {};
  const probeSandbox = forkTurnSandbox({ state, turn, outcomes: makeDegreeForcedOutcomes("success", report) });
  const probeResult = probeSandbox.apply(combatantId, proposal);
  if (!probeResult.legal) {
    return [{ degree: null, probability: 1, state: probeSandbox.state, turn: probeSandbox.turn, legal: false }];
  }

  const probs = degreeProbabilities(report.modifier, report.dc);
  const branches = [];
  for (const degree of ["criticalSuccess", "success", "failure", "criticalFailure"]) {
    const probability = probs[degree];
    if (probability <= 0) continue;
    if (degree === "success") {
      branches.push({ degree, probability, state: probeSandbox.state, turn: probeSandbox.turn, legal: true });
      continue;
    }
    const sandbox = forkTurnSandbox({ state, turn, outcomes: makeDegreeForcedOutcomes(degree, {}) });
    const result = sandbox.apply(combatantId, proposal);
    branches.push({ degree, probability, state: sandbox.state, turn: sandbox.turn, legal: result.legal });
  }
  return branches;
}
