/**
 * The personnel-scale EngineAdapter (design doc §57/#20) — see `../engine-adapter.mjs`'s own header
 * for the real contract every field here satisfies. A thin, zero-logic wrapper: every field is either
 * a direct re-export or a one-line pass-through of an already-real, already-tested `personnel-engine/`
 * function. This file adds no new behavior — its only job is presenting personnel-engine's existing,
 * unmodified exports in the shared shape.
 */
import { decisionRng, generateProposals, decide } from "../../personnel-engine/decide.mjs";
import { forkTurnSandbox, checkOutcome, resetSandboxForkCount, getSandboxForkCount } from "../../personnel-engine/engine.mjs";
import { evaluateState, DEFAULT_WEIGHTS } from "../../personnel-engine/evaluate/state-value.mjs";
import { FEET_PER_SQUARE } from "../../personnel-engine/grid.mjs";
import { isDead, isUnconscious } from "../../personnel-engine/conditions.mjs";
import { resolveEffectiveStats } from "../../personnel-engine/combatant.mjs";
import { assertValidAdapter } from "../engine-adapter.mjs";

export const PERSONNEL_ADAPTER = Object.freeze({
  id: "personnel",
  feetPerSquare: FEET_PER_SQUARE,
  decisionRng,
  generateProposals,
  forkTurnSandbox,
  checkOutcome,
  evaluateState,
  DEFAULT_WEIGHTS,
  // Real decide() unmodified — supports the full {competence, weights, templates, moraleEnabled,
  // disabledActionTypes} options shape (design doc §46's own AI-profile system).
  nativeGreedyDecide: decide,
  // OPTIONAL fields, not part of assertValidAdapter's REQUIRED_FIELDS (design doc §59, GH issue #5)
  // — decision-cost profiling instrumentation. A caller that wants a real sandbox-evaluation count
  // for one decision brackets it with resetSandboxForkCount()/getSandboxForkCount(); every other
  // caller can ignore these entirely.
  resetSandboxForkCount,
  getSandboxForkCount,
  // OPTIONAL, also not part of REQUIRED_FIELDS (design doc §73, GH issue #20) — real tree-search
  // capability (personnel-engine/search/tree-shared.mjs's own forced-node handling). Real, unchanged,
  // PC-dying-rules-aware functions — a search-capable policy (mcts-uct-v1) checks for these itself
  // and fails clearly if an adapter doesn't provide them, rather than every non-search policy
  // (greedy-v1, budget-demo-v1) being forced to carry fields it never touches.
  isDead,
  isUnconscious,
  resolveEffectiveStats
});
assertValidAdapter(PERSONNEL_ADAPTER); // real, immediate self-check — a missing field fails at import time
