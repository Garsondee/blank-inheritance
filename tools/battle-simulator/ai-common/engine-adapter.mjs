/**
 * THE SHARED ENGINE INTERFACE (design doc §57 — "Frame scale and 'personnel' scale should be the
 * same system, we only need one AI not two"; GitHub issue #20). This file defines the CONTRACT both
 * `personnel-engine/` and `engine/` (Frame-scale) satisfy, and is the one place a future policy
 * (lookahead #1, MCTS #6) is written ONCE, against this shape, instead of twice.
 *
 * NOT a rewrite of either engine. Both trees stay exactly as `CLAUDE.md`'s scale-separation rule
 * already requires — hard-isolated, neither importing the other. This module is a genuinely NEW,
 * THIRD layer that depends on both (the same way `analysis/` already depends on `personnel-engine/`
 * without the reverse), sitting above them, not between them.
 *
 * THE CONTRACT (an `EngineAdapter` is a plain object with exactly these fields):
 *
 *   feetPerSquare        number — 5 (personnel) or 50 (Frame). The one real geometric difference;
 *                         every distance/range calculation on either side is already parameterized
 *                         by this constant internally, so nothing here needs to convert units.
 *   decisionRng           (state, combatantId, decisionIndex) => RNG — BYTE-IDENTICAL real code on
 *                         both sides already (verified directly, not assumed, before this file was
 *                         written — see design doc §57's own research note on issue #20). Re-exported
 *                         here, not reimplemented.
 *   generateProposals     (state, combatantId, turn, cache?, includeMovement?) => Proposal[] — the
 *                         real candidate-action generator. `cache`/`includeMovement` are personnel-
 *                         scale-specific performance hints (planTurn's own shared-cache mechanism);
 *                         safely ignored by an adapter whose engine doesn't support them (JS drops
 *                         extra arguments a function doesn't declare).
 *   forkTurnSandbox        ({state, turn}) => { actionsRemaining(), apply(combatantId, proposal) } —
 *                         the real, engine-owned sandbox. Every apply() already resolves through
 *                         EXPECTED_OUTCOMES (deterministic, dice-free) on both sides — confirmed
 *                         directly by reading both engines' own outcome-table seam, not assumed.
 *   checkOutcome           (state, scenario?) => Outcome | null — the real terminal check. Frame-scale
 *                         additionally needs `scenario` (for its own stalemate detection,
 *                         `scenario.stalemateNotBeforeRound`); personnel-scale's own version ignores
 *                         a second argument if one is passed. Both were module-private before this
 *                         file — widened to `export`, zero behavior change, so this adapter has a
 *                         real function to call rather than re-deriving win/loss logic a third time.
 *   evaluateState          (state, side, weights, actingCombatantId?) => number — side-relative,
 *                         symmetric, HP-equivalent score. Frame-scale's own real signature has no
 *                         4th parameter (it has no setupValue-equivalent term) — safe to call it with
 *                         one anyway, JS silently ignores an argument a function doesn't declare.
 *   DEFAULT_WEIGHTS        object — each engine's own real, complete weights object. The KEY SETS
 *                         genuinely differ (personnel has `pileOnRisk`/`setupValue`/the condition-
 *                         tempo terms; Frame has `actionDenial`/`spotted`/`civilians` — see design
 *                         doc §57's own research note for the full, verified list) — a caller that
 *                         needs to know which terms exist reads THIS field, never assumes.
 *   nativeGreedyDecide      (state, combatantId, turn, options) => Proposal | null — each engine's OWN
 *                         real, already-shipped, already-tested `decide()`, completely unmodified.
 *                         This is the deliberately conservative Stage 0 policy (`greedy-v1`, see
 *                         `policies/greedy.mjs`): pure registration, zero new decision logic, zero
 *                         behavior change on either scale. Personnel's own `decide()` supports
 *                         `{competence, weights, templates, moraleEnabled, disabledActionTypes}`;
 *                         Frame's own only supports `{competence, weights}` — a caller passing the
 *                         extra personnel-only fields to the Frame adapter gets them silently ignored
 *                         (Frame's `decide()` doesn't destructure them), not an error. This asymmetry
 *                         is real and stays visible, not papered over — see each adapter's own header.
 *
 * WHAT THIS FILE DOES NOT CLAIM: a single, literally-shared `decide()` body producing byte-identical
 * behavior on both scales. That is real, separate future work (whole-turn templates, morale, and the
 * extra Frame-only action types — repair/spot/evacuate/advance — would all need to either generalize
 * or be modeled as engine-specific extensions to a shared core), not a Stage 0 task. What Stage 0
 * actually delivers: ONE registry, ONE contract, TWO adapters, and a real proof that resolving
 * `greedy-v1` against either adapter reproduces that engine's own existing behavior exactly.
 */

/** Throws if `adapter` is missing any real, required contract field — the same "fail loudly, not
 * with a silent NaN/undefined three calls later" discipline `assertCompleteWeights`
 * (`personnel-engine/ai-profiles.mjs`) already established for weight objects. */
const REQUIRED_FIELDS = Object.freeze([
  "feetPerSquare", "decisionRng", "generateProposals", "forkTurnSandbox",
  "checkOutcome", "evaluateState", "DEFAULT_WEIGHTS", "nativeGreedyDecide"
]);

export function assertValidAdapter(adapter) {
  const missing = REQUIRED_FIELDS.filter((f) => adapter[f] === undefined);
  if (missing.length) {
    throw new Error(`Invalid EngineAdapter (id: ${adapter.id ?? "unknown"}): missing real field(s) [${missing.join(", ")}] — every EngineAdapter must implement the full contract in this file's own header.`);
  }
}

/**
 * THE POLICY REGISTRY (design doc §57/#4 — "a real, pluggable decision-policy interface"). A policy
 * is `{ id, decide(adapter, state, combatantId, turn, options) => Proposal | null }` — engine-
 * AGNOSTIC by construction, since it only ever touches the engine through `adapter`'s own contract
 * fields, never importing `personnel-engine/`/`engine/` directly. Keyed by policy id; registering an
 * id twice is a real config error (a silently-shadowed policy is exactly the kind of bug this
 * project's own `assertCompleteWeights`/`ALL_PROFILES` precedents already refuse to allow), not a
 * silent overwrite.
 */
const policies = new Map();

export function registerPolicy(policy) {
  if (!policy?.id || typeof policy.decide !== "function") {
    throw new Error(`registerPolicy: a policy needs a real string id and a real decide(adapter, state, combatantId, turn, options) function — got ${JSON.stringify(policy)}.`);
  }
  if (policies.has(policy.id)) {
    throw new Error(`registerPolicy: "${policy.id}" is already registered — a duplicate id would silently shadow the real, already-registered policy of the same name.`);
  }
  policies.set(policy.id, Object.freeze({ ...policy }));
  return policies.get(policy.id);
}

export function resolvePolicy(id) {
  const policy = policies.get(id);
  if (!policy) throw new Error(`resolvePolicy: unknown policy id "${id}" — known: [${[...policies.keys()].join(", ")}].`);
  return policy;
}

export function listPolicyIds() {
  return [...policies.keys()];
}

/** Real, direct call-through: resolves `policyId` and invokes it against `adapter` — the one real
 * entry point a scenario's own `ai(state, combatantId, turn)` callback (or a future tournament/search
 * harness) needs, instead of hand-rolling `resolvePolicy(id).decide(adapter, ...)` at every call site. */
export function decideWithPolicy(policyId, adapter, state, combatantId, turn, options) {
  return resolvePolicy(policyId).decide(adapter, state, combatantId, turn, options);
}
