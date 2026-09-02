/**
 * THE ARCHETYPE LIBRARY (design doc §48 — the "Archetype Ladder" plan's own Stage C: "Six named
 * profiles, each with a direction-asserting behavioural test. Immediately useful for the campaign,
 * and doubles as the ladder's opponent pool.")
 *
 * Every archetype below is a REAL profile object (ai-profiles.mjs's own mechanism — complete,
 * frozen, self-checking), and every one of them is a MINIMAL diff from `BASELINE_V1`: only the
 * fields the Ladder plan's own §05 table actually calls out for that archetype differ; everything
 * else — competence, templates, aggression, temperament, disabledActionTypes, every other weight —
 * stays byte-identical to the control. This is deliberate, not laziness: it's what makes each
 * archetype's own behavioral test a clean, direction-asserting comparison (the ONE thing that
 * changed is the thing the test is checking for) rather than a bundle of simultaneous changes with
 * no way to attribute the resulting behavior to any one of them.
 *
 * Every field used below was verified against REAL, ALREADY-CONSUMED engine code before being
 * assigned a direction, not guessed:
 *   - `aggression` (state-value.mjs's own evaluateState): divides a combatant's own caution factor,
 *     so >1 makes it LESS averse to incoming threat exposure (design doc §35, pre-existing).
 *   - `weights.lowHpCaution`/`outnumberedCaution`: scale how sharply that same caution factor grows
 *     as HP drops / the combatant feels outnumbered (design doc §22/§35).
 *   - `weights.threatExposure`: the outer multiplier on the whole caution factor — how much any of
 *     it matters to this combatant's score at all.
 *   - `temperament`/`moraleEnabled` (decide.mjs's own `checkShouldFlee`): "fanatical"/"single-minded"
 *     are GM Core's own named exceptions to morale (pg. 78, verbatim); "mindless" is this project's
 *     own documented extension. All three make `checkShouldFlee` return false unconditionally,
 *     REGARDLESS of `moraleEnabled` — which is exactly why every archetype using one of them below
 *     sets `moraleEnabled: true` explicitly: immunity to a mechanism that's switched OFF anyway isn't
 *     a real, testable behavioral claim, only immunity to one switched ON is.
 *   - `templates` (decide.mjs's own `planTurn`): once a template's own `phases` array is exhausted,
 *     the LAST phase filter keeps applying to every remaining action in the turn — confirmed by
 *     direct reading, not assumed — so `control-then-attack` really does mean "control once, attack
 *     for the rest of the turn," not "control once, then improvise."
 *
 * All six are frozen and self-checked with `assertCompleteWeights` exactly like `BASELINE_V1` — a
 * typo'd or missing weight key here fails at import time, the same real guarantee Stage A already
 * established. Weights are built as `{ ...BASELINE_V1.weights, overriddenKey: value }` rather than
 * hand-retyping every key: this is safe (not the "spread-and-hope" risk `ai-profiles.mjs`'s own
 * header warns about) precisely BECAUSE `BASELINE_V1.weights` is itself already a hand-verified,
 * frozen, complete snapshot — spreading a known-complete frozen object can't reintroduce a missing
 * key, and `assertCompleteWeights` is the real, live proof of that for every archetype below, not an
 * assumption.
 */

import { BASELINE_V1, PROFILES, assertCompleteWeights } from "./ai-profiles.mjs";
import { ANCHOR_BASELINES } from "./baselines.mjs";

/**
 * Aggressive — Ladder plan §05: "aggression > 1, low lowHpCaution, morale off." Doubles the
 * aggression divisor (halves the caution factor before threatExposure even multiplies it) and drops
 * lowHpCaution to a quarter of baseline — a bloodied Aggressive combatant is far slower to treat its
 * own low HP as a reason to hold back. `moraleEnabled` stays at BASELINE_V1's own default (false) —
 * "morale off" is the ABSENCE of an opt-in, not a new field to set.
 */
export const AGGRESSIVE_V1 = Object.freeze({
  ...BASELINE_V1,
  id: "aggressive-v1",
  frozenAt: "2026-08-31",
  aggression: 2.0,
  weights: Object.freeze({ ...BASELINE_V1.weights, lowHpCaution: 2.0 })
});
assertCompleteWeights(AGGRESSIVE_V1.weights);

/**
 * Cautious — Ladder plan §05: "high lowHpCaution / outnumberedCaution, morale on." Doubles
 * lowHpCaution and triples outnumberedCaution, and opts INTO the real morale mechanism
 * (`moraleEnabled: true`) so a Cautious combatant that's genuinely bloodied and on the losing side
 * actually disengages rather than merely scoring retreat options higher.
 */
export const CAUTIOUS_V1 = Object.freeze({
  ...BASELINE_V1,
  id: "cautious-v1",
  frozenAt: "2026-08-31",
  moraleEnabled: true,
  weights: Object.freeze({ ...BASELINE_V1.weights, lowHpCaution: 16.0, outnumberedCaution: 3.0 })
});
assertCompleteWeights(CAUTIOUS_V1.weights);

/**
 * Flanker — Ladder plan §05: "reposition-heavy template subset, high threatExposure." Restricted to
 * `reposition-and-shoot` (move, then attack for the rest of the turn — the actual flanking shape:
 * close/reangle first, strike after) plus `unconstrained` as the only fallback, for a turn where
 * nothing worth moving toward exists and forcing a move anyway would just waste an action. Nearly
 * triples `threatExposure` — a Flanker cares MUCH more than baseline about who can currently see/hit
 * it, which is exactly the pressure that makes constant repositioning pay off in the evaluator rather
 * than reading as pointless motion.
 */
export const FLANKER_V1 = Object.freeze({
  ...BASELINE_V1,
  id: "flanker-v1",
  frozenAt: "2026-08-31",
  templates: Object.freeze(["reposition-and-shoot", "unconstrained"]),
  weights: Object.freeze({ ...BASELINE_V1.weights, threatExposure: 0.35 })
});
assertCompleteWeights(FLANKER_V1.weights);

/**
 * Brawler — Ladder plan §05: "double-strike + control-then-attack only," verbatim; no other field
 * changes. Both templates' own phase filters (`isAttackType` alone; `isControlType` then
 * `isAttackType`) can never select a "move" proposal once at least one legal attack/control action
 * exists — a Brawler that's already in the fight stays in it.
 */
export const BRAWLER_V1 = Object.freeze({
  ...BASELINE_V1,
  id: "brawler-v1",
  frozenAt: "2026-08-31",
  templates: Object.freeze(["double-strike", "control-then-attack"])
});
assertCompleteWeights(BRAWLER_V1.weights);

/**
 * Mindless — Ladder plan §05: "temperament: 'mindless', low competence, single-action greedy (no
 * templates)." `competence: 0.3` alone already puts `decide()` on its pre-Stage-2 single-action path
 * (whole-turn template planning only runs at `competence >= 1` — confirmed directly in `decide.mjs`),
 * so `templates: []` is the literal, honest expression of "no templates" rather than a functional
 * requirement — verified safe by direct code reading: an empty template list makes `planTurn` return
 * null immediately (`results.length === 0`), and `decide()` falls through to that exact same
 * single-action path regardless, never a crash. `moraleEnabled: true` for the same reason as every
 * other temperament-immune archetype below: immunity only means something when the mechanism it's
 * immune to is actually switched on.
 */
export const MINDLESS_V1 = Object.freeze({
  ...BASELINE_V1,
  id: "mindless-v1",
  frozenAt: "2026-08-31",
  competence: 0.3,
  templates: Object.freeze([]),
  temperament: "mindless",
  moraleEnabled: true
});
assertCompleteWeights(MINDLESS_V1.weights);

/**
 * Zealot — Ladder plan §05: "temperament: 'fanatical' — morale never fires." The ONLY diff from
 * BASELINE_V1 is `temperament` plus `moraleEnabled: true` (again, so "never fires" is a real claim
 * about a mechanism that's actually on, not a vacuous one). Full competence, every template, neutral
 * weights and aggression — a Zealot plays exactly like the control right up until the moment it would
 * otherwise flee, and then it simply doesn't.
 */
export const ZEALOT_V1 = Object.freeze({
  ...BASELINE_V1,
  id: "zealot-v1",
  frozenAt: "2026-08-31",
  temperament: "fanatical",
  moraleEnabled: true
});
assertCompleteWeights(ZEALOT_V1.weights);

/** Every real archetype this file defines, keyed by its own `id`. */
export const ARCHETYPES = Object.freeze({
  [AGGRESSIVE_V1.id]: AGGRESSIVE_V1,
  [CAUTIOUS_V1.id]: CAUTIOUS_V1,
  [FLANKER_V1.id]: FLANKER_V1,
  [BRAWLER_V1.id]: BRAWLER_V1,
  [MINDLESS_V1.id]: MINDLESS_V1,
  [ZEALOT_V1.id]: ZEALOT_V1
});

/** `ai-profiles.mjs`'s own `PROFILES` (baseline-v1, no-maneuvers-v1) merged with every archetype
 * here AND every real anchor baseline (design doc §51 — random-baseline/worst-baseline/nearest-only-
 * baseline) — the one real, complete registry a CLI/tournament caller resolves any profile id
 * against, so it never needs to know which file a given id actually came from. Lives here, not in
 * `ai-profiles.mjs`, on purpose: that file exports the MECHANISM (and the two control profiles that
 * prove it), this one is the growable content library downstream of it — merging in the other
 * direction would make the two files import each other. */
export const ALL_PROFILES = Object.freeze({ ...PROFILES, ...ARCHETYPES, ...ANCHOR_BASELINES });
