/**
 * AI PROFILES (design doc §46 — the "Archetype Ladder" plan proposed 2026-08-30, Stage A: "the
 * profile object and its plumbing... Small, blocks everything else, start here").
 *
 * THE PROBLEM THIS FIXES: before this file, "an AI" wasn't a real, nameable thing — it was a
 * function (`decide`), a module-level constant (`DEFAULT_WEIGHTS`), and behavior scattered across
 * per-combatant fixture fields (`aggression`, `temperament`), a per-state flag (`moraleEnabled`),
 * and a per-call argument (`competence`). You could not freeze that, diff two of them, or hand one
 * to a specific character. A PROFILE is a plain, frozen object that fully determines how a
 * combatant plays — nothing about its behavior lives outside it.
 *
 * TWO RULES, both load-bearing:
 *
 * (1) COMPLETE, NEVER MERGED. A profile's `weights` lists every `DEFAULT_WEIGHTS` key explicitly,
 *     never spread-and-hope. `evaluateState` multiplies weight values straight into the score, so a
 *     profile missing a key computes `undefined * n = NaN` and the whole evaluation silently becomes
 *     garbage rather than failing loudly. `assertCompleteWeights` (below) turns that into a real,
 *     immediate throw — call it on every new profile's own weights before it ever reaches a battle.
 *
 * (2) FROZEN MEANS PINNED NUMBERS, NOT A LIVE REFERENCE. `BASELINE_V1.weights` below is a hand-
 *     copied SNAPSHOT of `DEFAULT_WEIGHTS`' real values at the moment this file was written — NOT
 *     `{ ...DEFAULT_WEIGHTS }` computed at import time, and never `DEFAULT_WEIGHTS` by reference.
 *     If it referenced the live constant, the next time anyone tunes a weight in `state-value.mjs`
 *     (exactly what design doc §44 just did to `tempoDenial`), the "frozen" baseline would silently
 *     move too — defeating the entire point of a checkpoint you can compare future work against.
 *     `Object.freeze` on top makes accidental in-place mutation a hard error, not silent drift.
 *
 * `engineContract` exists for the OTHER kind of drift a frozen NUMBER can't catch: engine code
 * changing what those same numbers produce (Stage 3's blackboard will make `baseline-v1` play
 * differently tomorrow with byte-identical numbers). Bump it by hand whenever a change to
 * `decide.mjs`/`engine.mjs`/`state-value.mjs` could plausibly change ANY profile's own chosen
 * actions on a fixed seed — the golden-sequence tests (`test/battle-simulator/ai-profiles.test.mjs`)
 * are what actually catches this in practice; the field is a human-readable flag for "has this
 * profile's own behavior guarantee been re-verified since the engine last changed," not itself
 * machine-checked.
 */

import { DEFAULT_WEIGHTS } from "./evaluate/state-value.mjs";

/**
 * Throws immediately if `weights` doesn't have EXACTLY the same key set as `DEFAULT_WEIGHTS` — not
 * a subset (silent NaN risk), not a superset (a typo'd or stale key nobody's reading). Call this on
 * every new profile's own weights before it ever reaches `decide()`.
 */
export function assertCompleteWeights(weights, referenceWeights = DEFAULT_WEIGHTS) {
  const expected = new Set(Object.keys(referenceWeights));
  const actual = new Set(Object.keys(weights));
  const missing = [...expected].filter((k) => !actual.has(k));
  const extra = [...actual].filter((k) => !expected.has(k));
  if (missing.length || extra.length) {
    throw new Error(
      `Incomplete AI profile weights: missing [${missing.join(", ")}], extra [${extra.join(", ")}] — ` +
      `every DEFAULT_WEIGHTS key must be present, explicitly, with no stale/typo'd extras (a missing key silently computes NaN once evaluateState multiplies it in).`
    );
  }
}

/** Every real turn-template name `decide.mjs` currently defines — see that file's own
 * `TURN_TEMPLATES`. Kept here, not imported, deliberately: a profile's `templates` field is plain
 * data (portable, serializable, diffable), not a reference to `decide.mjs`'s own private filter
 * functions. `decide()` itself resolves these names back to the real objects. */
export const ALL_TEMPLATE_NAMES = Object.freeze(["unconstrained", "control-then-attack", "double-strike", "reposition-and-shoot", "disengage-and-heal"]);

/**
 * The frozen reference profile — byte-identical to `decide()`'s own pre-§46 defaults (competence 1,
 * every template available, no morale, no capability restrictions, neutral aggression), so
 * assigning `BASELINE_V1` to every combatant reproduces exactly what every scenario already did
 * before AI profiles existed. This is what makes it a meaningful CONTROL: it isn't a guess at a
 * good baseline, it's a name for the behavior every already-shipped test already assumes.
 */
export const BASELINE_V1 = Object.freeze({
  id: "baseline-v1",
  frozenAt: "2026-08-30",
  engineContract: 2, // bumped design doc §55: pileOnRisk added to evaluateState — re-verified against ai-profiles.test.mjs's own golden sequences (both still byte-identical: pileOnRisk is a real no-op in a 1-enemy-per-side fight, since there's no second attacker left to price a pile-on from)
  competence: 1.0,
  templates: ALL_TEMPLATE_NAMES,
  temperament: null, // null = ordinary morale rules apply, not an override
  moraleEnabled: false,
  aggression: 1.0, // the documented neutral value — see combatant.mjs's own "absent = 1.0" convention
  disabledActionTypes: Object.freeze([]),
  weights: Object.freeze({
    enemyDamage: 1.0,
    allyDamage: 1.0,
    threatExposure: 0.12,
    offensiveReach: 0.2,
    objective: 2.5,
    closing: 0.75,
    resource: 3.0,
    tempoDenial: 1.0,
    maneuverTempoDenial: 0.3,
    lowHpCaution: 8.0,
    outnumberedCaution: 1.0,
    setupValue: 0.3,
    mobilityDenial: 0.75,
    pileOnRisk: 0.25
  })
});
assertCompleteWeights(BASELINE_V1.weights); // real, immediate self-check — a typo here fails at import time, not mid-battle

/**
 * Design doc §46 — absorbs `personnel-complex-battle.mjs`'s own `partyManeuvers` flag into the
 * general profile mechanism: `disabledActionTypes` is a real, honest capability restriction
 * (`decide.mjs`'s own `filterDisabledTypes`, applied before anything ever scores a proposal), not a
 * fixture-data hack. Deliberately does NOT replace `partyManeuvers` itself — that flag stays, it's
 * already shipped, tested, and used by the real registered `complex-4v4-no-maneuvers-random-arcs`
 * scenario (design doc §43) — this is the SAME real intent (a combatant that can never attempt
 * Trip/Shove/Grapple) expressed the general way, proving the mechanism actually generalizes.
 */
export const NO_MANEUVERS_V1 = Object.freeze({
  ...BASELINE_V1,
  id: "no-maneuvers-v1",
  disabledActionTypes: Object.freeze(["trip", "shove", "grapple"]),
  weights: BASELINE_V1.weights // same reference on purpose — Object.freeze is shallow, and re-copying an already-frozen, already-verified object would just be a wasted assertCompleteWeights call
});

/**
 * Merge a profile's own `temperament`/`aggression` onto a loaded fixture, producing the combatant
 * object a scenario actually deploys. The PROFILE is authoritative — assigning one is a deliberate
 * "play this character this way," not a fallback only used when the fixture is silent — so
 * `BASELINE_V1`'s own `temperament: null` really does mean "ordinary morale rules," including
 * clearing whatever a fixture might otherwise have carried. No real fixture in this roster sets
 * either field today, so this has zero observable effect yet; it's here so a future archetype
 * (mindless, fanatical, aggressive) has one real, tested place to take effect.
 */
export function applyProfileToCombatant(fixture, profile) {
  return { ...fixture, temperament: profile.temperament, aggression: profile.aggression };
}

/** The exact shape `decide()`'s own options object expects — spread this directly into an `ai`
 * function's own `decide(state, combatantId, turn, decideOptionsForProfile(profile))` call. */
export function decideOptionsForProfile(profile) {
  return {
    competence: profile.competence,
    weights: profile.weights,
    templates: profile.templates,
    moraleEnabled: profile.moraleEnabled,
    disabledActionTypes: profile.disabledActionTypes
  };
}

/** Every real profile this file defines, keyed by its own `id` — the one place a CLI (or a future
 * Stage C archetype loader) resolves "--profile=no-maneuvers-v1" back to the real frozen object,
 * instead of every caller hand-rolling its own if/else chain over profile names. */
export const PROFILES = Object.freeze({
  [BASELINE_V1.id]: BASELINE_V1,
  [NO_MANEUVERS_V1.id]: NO_MANEUVERS_V1
});
