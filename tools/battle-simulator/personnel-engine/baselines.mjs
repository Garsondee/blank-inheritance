/**
 * ANCHOR BASELINES (design doc §51 — "it's hard to know if we have a strong or bad bot," Ingram's
 * own direct ask, 2026-09-02). Every measurement this project has produced so far is RELATIVE — is
 * mutated-X better than baseline-X, does archetype A beat archetype B — and never ABSOLUTE. Nothing
 * has ever asked "compared to a bot that's actually trying to lose, or one with no strategy at all,
 * how good is `decide()` really?" These three functions are that floor, each a genuinely different
 * kind of "bad" so a real comparison teaches something different from each:
 *
 * - `decideRandom` — zero intelligence. Picks uniformly at random among whatever's legal, no bias in
 *   any direction. Beating this by a wide margin is the lowest possible bar: "does having ANY
 *   strategy help at all." A bot that can't clear this decisively has nothing to be proud of.
 * - `decideWorst` — actively adversarial, but adversarial according to THIS project's own real
 *   evaluator (`evaluateState`), not some separate hostile logic. Reuses the EXACT SAME scored-
 *   candidate machinery `decide()`'s own competence<1 fallback path already uses, and picks the
 *   LOWEST-gain legal option instead of the highest. This one doubles as a sanity check on the
 *   evaluator itself: if `decide()` doesn't crush this by an even WIDER margin than it beats Random,
 *   that's real evidence the evaluator isn't actually separating good play from bad — a far deeper
 *   problem than any single weight being mistuned.
 * - `decideNearestOnly` — a real, simple, HONEST heuristic, not randomness or malice: always go after
 *   whichever living enemy is closest, attack it if in range, otherwise move toward it, no other
 *   consideration (no HP caution, no positioning, no maneuvers, never picks a "better" target).
 *   Sits between the other two on purpose — a bot with one club-footed idea, the kind of floor a
 *   REAL unsophisticated opponent would actually play like, not a strawman.
 *
 * All three reuse `generateProposals`/`forkTurnSandbox` exactly as `decide()` does — legality is
 * still never re-derived, only ever confirmed by the real engine in a real sandbox — so a real
 * tournament between any of these and `decide()` is exactly as fair and exactly as legality-enforced
 * as any other matchup this project has ever run. None of these are `assertCompleteWeights`-style AI
 * PROFILES (they don't consult `weights` the way a real profile does — `decideWorst` reads them only
 * to invert the SAME scoring, `decideRandom`/`decideNearestOnly` ignore them entirely) — see
 * `personnel-mirror.mjs`'s own `decisionMode` dispatch for how a profile-shaped wrapper plugs one of
 * these in without needing a second code path through the whole tournament/report pipeline.
 */
import { forkTurnSandbox } from "./engine.mjs";
import { generateProposals, decisionRng } from "./decide.mjs";
import { evaluateState, DEFAULT_WEIGHTS } from "./evaluate/state-value.mjs";
import { splitByRelation } from "./factions.mjs";
import { distanceFeet } from "./grid.mjs";
import { BASELINE_V1 } from "./ai-profiles.mjs";

/** Every legal proposal for `combatantId` right now — real proposals filtered down to only the ones
 * the real engine actually accepts, exactly `decide()`'s own "legality is never re-derived" rule. */
function legalProposals(state, combatantId, turn) {
  const proposals = generateProposals(state, combatantId, turn);
  const legal = [];
  for (const proposal of proposals) {
    const sandbox = forkTurnSandbox({ state, turn });
    const result = sandbox.apply(combatantId, proposal);
    if (result.legal) legal.push({ proposal, result });
  }
  return legal;
}

/**
 * Zero intelligence: uniform-random pick among every real legal option. Seeded via `decisionRng`
 * (the same per-decision stream `decide()`'s own `sampleByCompetence` uses) — deterministic given
 * the battle seed, so a Random-baseline battle is exactly as reproducible as any other.
 */
export function decideRandom(state, combatantId, turn) {
  const legal = legalProposals(state, combatantId, turn);
  if (!legal.length) return null;
  const rng = decisionRng(state, combatantId, turn.decisionIndex ?? 0);
  const chosen = legal[Math.floor(rng() * legal.length)];
  return { ...chosen.proposal, score: null, reason: `Random pick among ${legal.length} legal options (anchor baseline — no strategy at all)` };
}

/**
 * The real adversarial floor: score every legal option with the SAME `evaluateState` the real AI
 * uses, then take the WORST one instead of the best — actively avoiding whatever this project's own
 * evaluator considers good, using its own real understanding of the game. `weights` defaults to
 * `DEFAULT_WEIGHTS` (the same real weights `BASELINE_V1` carries) so "worst" means "worst by the
 * exact yardstick everything else in this project is measured against."
 */
export function decideWorst(state, combatantId, turn, { weights = DEFAULT_WEIGHTS } = {}) {
  const me = state.combatants.get(combatantId);
  if (!me) return null;
  const before = evaluateState(state, me.side, weights, combatantId);
  const scored = legalProposals(state, combatantId, turn).map(({ proposal, result }) => {
    const sandbox = forkTurnSandbox({ state, turn });
    sandbox.apply(combatantId, proposal);
    const after = evaluateState(sandbox.state, me.side, weights, combatantId);
    return { proposal, result, gain: after - before };
  });
  if (!scored.length) return null;
  scored.sort((a, b) => a.gain - b.gain); // ASCENDING — the worst real option first, on purpose
  const worst = scored[0];
  return { ...worst.proposal, score: Number(worst.gain.toFixed(3)), reason: `Deliberately worst of ${scored.length} legal options by this project's own real evaluator (anchor baseline — gain ${worst.gain.toFixed(1)})` };
}

/**
 * One club-footed idea, applied consistently: find the nearest living enemy, attack it if a real
 * legal attack on it exists, otherwise take whichever legal move ends up closest to it, otherwise
 * take whatever's legal (never holds if the engine offers something real). No HP caution, no
 * maneuvers, no positional reasoning, never reconsiders which target is "better" — a real, honest
 * floor for "an opponent with exactly one plan and no ability to adapt it."
 */
export function decideNearestOnly(state, combatantId, turn) {
  const me = state.combatants.get(combatantId);
  const myPos = state.positions.get(combatantId);
  if (!me || !myPos) return null;
  const legal = legalProposals(state, combatantId, turn);
  if (!legal.length) return null;

  const { enemies } = splitByRelation(me, [...state.combatants.values()]);
  const livingEnemies = enemies.filter((e) => e.currentHP > 0 && state.positions.get(e.id));
  const nearest = livingEnemies.length
    ? livingEnemies.reduce((closest, e) => {
        const d = distanceFeet(myPos, state.positions.get(e.id));
        return d < closest.d ? { enemy: e, d } : closest;
      }, { enemy: livingEnemies[0], d: distanceFeet(myPos, state.positions.get(livingEnemies[0].id)) }).enemy
    : null;

  const ATTACK_TYPES = ["strike", "spellAttack", "saveAttack", "areaAttack"];
  if (nearest) {
    const attackOnNearest = legal.find(({ proposal }) => ATTACK_TYPES.includes(proposal.type) && (proposal.targetId === nearest.id || proposal.originId === nearest.id));
    if (attackOnNearest) return { ...attackOnNearest.proposal, score: null, reason: `Attack nearest enemy (anchor baseline — no other consideration)` };

    const moves = legal.filter(({ proposal }) => proposal.type === "move");
    if (moves.length) {
      const closestMove = moves.reduce((best, m) => {
        const d = distanceFeet(m.proposal.to, state.positions.get(nearest.id));
        return d < best.d ? { move: m, d } : best;
      }, { move: moves[0], d: distanceFeet(moves[0].proposal.to, state.positions.get(nearest.id)) });
      return { ...closestMove.move.proposal, score: null, reason: `Move toward nearest enemy (anchor baseline — no other consideration)` };
    }
  }

  return { ...legal[0].proposal, score: null, reason: `Nothing better to do — first legal option (anchor baseline)` };
}

/**
 * Profile-SHAPED wrappers, not real weighted profiles — `weights`/`competence`/`templates` etc. are
 * only here so these slot into the existing `ALL_PROFILES`/tournament/report machinery (which
 * expects every profile to have that shape) with ZERO special-casing anywhere except one real
 * dispatch point (`personnel-mirror.mjs`'s own `ai` function, keyed on `decisionMode`). Inherited
 * from `BASELINE_V1` for a real reason, not laziness: if a caller ever DID accidentally route one of
 * these through the normal `decide()` path (a real bug, not the intended behavior), it would fall
 * back to ordinary baseline play rather than silently crashing on an incomplete/undefined shape —
 * `decisionMode` is what a correct caller must check FIRST, and these fields are the safety net for
 * a caller that forgets to.
 */
export const RANDOM_BASELINE = Object.freeze({ ...BASELINE_V1, id: "random-baseline", frozenAt: "2026-09-02", decisionMode: "random" });
export const WORST_BASELINE = Object.freeze({ ...BASELINE_V1, id: "worst-baseline", frozenAt: "2026-09-02", decisionMode: "worst" });
export const NEAREST_ONLY_BASELINE = Object.freeze({ ...BASELINE_V1, id: "nearest-only-baseline", frozenAt: "2026-09-02", decisionMode: "nearest-only" });

/** Every real anchor baseline this file defines, keyed by its own `id` — mirrors `archetypes.mjs`'s
 * own `ARCHETYPES` registry shape so callers can treat "profiles" and "anchor baselines" uniformly. */
export const ANCHOR_BASELINES = Object.freeze({
  [RANDOM_BASELINE.id]: RANDOM_BASELINE,
  [WORST_BASELINE.id]: WORST_BASELINE,
  [NEAREST_ONLY_BASELINE.id]: NEAREST_ONLY_BASELINE
});
