/**
 * Turn-loop orchestration for the PERSONNEL-SCALE engine (design doc §19) — ported from
 * ../engine/engine.mjs. THE RULE THIS FILE EXISTS TO ENFORCE, unchanged from the Frame-scale
 * original: state (position, HP, flags) is NEVER mutated except inside attemptAction(), and
 * attemptAction() NEVER runs without a preceding { legal: true } from legality.mjs. An AI script
 * (or an adversarial test) can propose anything; the engine is what makes an illegal proposal a
 * no-op instead of a move.
 *
 * WHAT'S DROPPED, and why — everything below is Frame/vehicle/Day-1-specific machinery that
 * doesn't exist for an ordinary SF2E PC or NPC:
 *  - Field Repair, Evacuate, Spot: Ladle/vehicle/Day-1-specific action types. No proposal branch,
 *    no outcome-table entries, no legality imports for any of them.
 *  - Advance: the Claimant's own scripted occupancy-ignoring move. Ordinary movement (Stride/Step)
 *    already covers everything a real PC or NPC can do.
 *  - The damage-state degradation track and everything downstream of it: scaleHardness/"mounted"
 *    trait log fields, the roster's scaleHardness/scaleBlind/resonanceBand/repairBonus/handlingDC
 *    fields, and snapshotState's damageState field. combatant.mjs's personnel-scale
 *    resolveEffectiveStats never produces a damageState at all — see its own header for why.
 *  - The "damage state dropped mid-turn, reducing the action cap" secondary heldReason branch:
 *    personnel-scale actionsAvailable is only ever 3 or 0 (resolveEffectiveStats has no
 *    intermediate band), so that specific transition is now provably impossible, not just unused.
 *  - The stalemate/immuneToAllDamage outcome branch: the ground-layer Interdiction Field concept
 *    it exists for has no personnel-scale equivalent. checkOutcome here is party-victory /
 *    party-defeat / timeout only.
 *  - scriptedEvents: nothing in the current plan (a straight fight, no narrative triggers) needs
 *    a round-keyed event hook; adding one now would be exactly the kind of speculative surface
 *    area the project's own conventions warn against.
 *  - checkReactionTriggers (the Claimant's Claim): hardcoded to a Large+ size trigger and "the
 *    reactor's one and only reaction" — real, but Claimant-specific machinery, not a generic
 *    SF2E reaction-trigger system. A living NPC's real reaction (e.g. Security Goon's own, per
 *    the raw pack data) has its own real trigger condition that isn't yet extracted or read — see
 *    design doc §19 Phase 2. Reactions stay VISIBLE on the roster (real authored data, for
 *    transcript honesty) but are not fired by anything in this file. Wiring a real trigger
 *    condition in without having read the real ability text yet would be inventing behavior this
 *    project's own conventions explicitly rule out. Revisit once Phase 2 extraction is done.
 *
 * A direct, unavoidable consequence of dropping reactions: nothing in this file can ever reduce a
 * combatant's own HP DURING its own turn (only an opposing turn's Strike/spellAttack can, and that
 * always resolves on the attacker's turn against a different combatant, never the acting one). The
 * "re-derive effective stats every loop iteration, hard-stop if disabled" safety net is kept
 * anyway — it's the same real invariant the Frame-scale file protects, essentially free to keep
 * here, and exactly right if a future reaction or hazard effect ever does need it.
 *
 * Reused directly, unmodified: ../engine/resolve.mjs (dice/degree-of-success/damage math) and
 * ../engine/rng.mjs (the seeded PRNG) — both verified scale-agnostic during planning, same
 * precedent ground-layer/ already established for exactly this kind of reuse.
 *
 * EXTENDED (skill-actions-in-combat expansion, requested directly: "expand to saving throws...
 * keep expanding the list of things that PCs and NPCs can do"): two new action types.
 *  - "saveAttack" — a basic saving throw the TARGET rolls (e.g. a thrown grenade), using
 *    ../engine/resolve.mjs's resolveSave/basicSaveDamage/expectedSaveDamage (also reused
 *    unmodified — this is exactly as scale-agnostic as resolveStrike's own dice math, and already
 *    proven by ground-layer/'s own reuse of resolveSave/basicSaveDamage for its hazard saves).
 *  - "demoralize" — Intimidation's Demoralize action (Player Core pg. 200, mirrored verbatim at
 *    reference/srd/player-core/skill-8-intimidation.json): an Intimidation check against the
 *    target's Will DC, applying the Frightened condition (mirrored at
 *    reference/srd/player-core/condition-18-frightened.json) on success/critical success.
 * Neither counts toward Multiple Attack Penalty or increments turnProgress.strikesAttempted — MAP
 * is specifically an attack-ROLL penalty (Player Core), and neither of these involves the ATTACKER
 * rolling an attack at all. This is the actual mechanism behind the tactic Ingram named directly:
 * Demoralize costs 0 extra penalty regardless of how many Strikes came before it in the same turn,
 * unlike a 2nd/3rd Strike's real -5/-10.
 */

import { makeRng, rollD20, rollFormula } from "../engine/rng.mjs";
import { resolveEffectiveStats } from "./combatant.mjs";
import {
  checkMoveLegality, checkStepLegality, checkStrikeLegal, checkSpellAttackLegal, checkHealAbilityLegal,
  checkSaveAttackLegal, checkDemoralizeLegal, multipleAttackPenalty, rangeIncrementPenalty
} from "./legality.mjs";
import { resolveStrike, mitigateDamage, expectedStrikeDamage, resolveSave, basicSaveDamage, expectedSaveDamage, degreeProbabilities, degreeOfSuccess } from "../engine/resolve.mjs";
import { distanceFeet, FEET_PER_SQUARE } from "./grid.mjs";

/**
 * OUTCOME TABLES (design doc §15f) — the ONE seam where a real battle and a lookahead sandbox
 * differ. Everything else about resolving an action is shared: legality, action costs, the
 * multiple-attack-penalty counter, occupancy. Only the moment a die collapses to a number varies.
 */
const REAL_OUTCOMES = {
  strike(rng, { attacker, strike, target, targetEffective, mapPenalty }) {
    const roll = resolveStrike(rng, { attacker, strike, targetAc: targetEffective.ac, mapPenalty });
    const { appliedDamage } = applyStrikeDamage(roll, target, targetEffective, strike);
    return { roll, appliedDamage, immune: false };
  },
  /** A basic saving throw (e.g. a thrown grenade) — the TARGET rolls, not the attacker. */
  saveAttack(rng, { saveAttack, target, targetEffective }) {
    const saveBonus = target.saves[saveAttack.saveType];
    const saveRoll = resolveSave(rng, { saveBonus, dc: saveAttack.dc });
    const damageEntries = (saveAttack.damage ?? []).map((d) => rollFormula(rng, `${d.dice}${d.bonus >= 0 ? "+" : ""}${d.bonus}`));
    const rawDamage = damageEntries.reduce((sum, e) => sum + e.total, 0);
    const afterSave = basicSaveDamage(rawDamage, saveRoll.degree);
    const appliedDamage = mitigateDamage(afterSave, { target, targetEffective, strike: saveAttack });
    target.currentHP = Math.max(0, target.currentHP - appliedDamage);
    return { roll: { ...saveRoll, damage: { entries: damageEntries, raw: rawDamage, afterSave } }, appliedDamage };
  },
  /** Demoralize (Intimidation): an Intimidation check against the target's Will DC (10 + their Will save). */
  demoralize(rng, { attacker, target }) {
    const modifier = (attacker.intimidationModifier ?? 0) - (attacker.frightened ?? 0); // Frightened penalizes ALL of your own checks, including this one
    const willDC = 10 + target.saves.will;
    const d20 = rollD20(rng);
    const total = d20 + modifier;
    const degree = degreeOfSuccess(d20, total, willDC);
    const appliedFrightened = { criticalSuccess: 2, success: 1, failure: 0, criticalFailure: 0 }[degree];
    return { roll: { d20, modifier, total, dc: willDC, degree }, appliedFrightened };
  }
};

/**
 * The deterministic twin. Takes an rng parameter it deliberately ignores — the signature matches
 * REAL_OUTCOMES so the two are interchangeable, but a sandbox can never advance the battle's dice
 * even by accident.
 */
const EXPECTED_OUTCOMES = {
  strike(_rng, { strike, target, targetEffective, mapPenalty }) {
    const attackModifier = strike.attackBonus + mapPenalty;
    const expected = expectedStrikeDamage({ attackModifier, targetAc: targetEffective.ac, strike, target, targetEffective });
    if (expected > 0) target.currentHP = Math.max(0, target.currentHP - expected);
    return {
      roll: {
        expected: true, d20: null, degree: null, total: null,
        attackBonus: strike.attackBonus, mapPenalty, targetAc: targetEffective.ac,
        damage: expected > 0 ? { raw: expected, entries: [] } : null
      },
      appliedDamage: expected,
      immune: false
    };
  },
  saveAttack(_rng, { saveAttack, target, targetEffective }) {
    const saveBonus = target.saves[saveAttack.saveType];
    const expected = expectedSaveDamage({ saveBonus, dc: saveAttack.dc, damage: saveAttack.damage, target, targetEffective });
    if (expected > 0) target.currentHP = Math.max(0, target.currentHP - expected);
    return {
      roll: { expected: true, d20: null, degree: null, total: null, saveBonus, dc: saveAttack.dc, damage: expected > 0 ? { raw: expected, entries: [] } : null },
      appliedDamage: expected
    };
  },
  /** Expected frightened value applied — a fractional "how frightened, on average" number, exactly the same expected-value philosophy expectedStrikeDamage already uses for fractional HP. */
  demoralize(_rng, { attacker, target }) {
    const modifier = (attacker.intimidationModifier ?? 0) - (attacker.frightened ?? 0);
    const willDC = 10 + target.saves.will;
    const probs = degreeProbabilities(modifier, willDC);
    const appliedFrightened = probs.criticalSuccess * 2 + probs.success * 1;
    return { roll: { expected: true, d20: null, modifier, total: null, dc: willDC, degree: null }, appliedFrightened };
  }
};

/**
 * Player Core pg. 427, Step 1: everyone rolls d20 + their initiative modifier once, at the top of
 * the encounter; ties keep their scenario array order (stable sort) rather than an arbitrary
 * re-roll — SF2E doesn't mandate a specific tiebreak, and a deterministic one keeps the whole
 * battle reproducible from its seed like everything else here.
 */
function rollInitiative(rng, combatants) {
  const rolls = combatants.map((c) => {
    const d20 = rollD20(rng);
    const modifier = c.initiativeModifier ?? 0;
    return { id: c.id, name: c.name, d20, modifier, total: d20 + modifier };
  });
  const order = [...rolls].sort((a, b) => b.total - a.total).map((r) => r.id);
  return { order, rolls };
}

/**
 * @param {object} scenario
 * @param {number} scenario.seed
 * @param {{cols:number, rows:number}} scenario.gridSize
 * @param {number} scenario.roundLimit
 * @param {Array} scenario.combatants - static + initial dynamic fields
 * @param {(state, combatantId, turnState) => object|null} scenario.ai - decision function per combatant
 */
export function runBattle(scenario) {
  const rng = makeRng(scenario.seed);
  const state = {
    round: 0,
    gridSize: scenario.gridSize,
    // `seed` and `initiativeOrder` are on state deliberately (design doc §15d), not just in the
    // log — the AI needs both and can reach neither otherwise: seed so it can derive its OWN
    // per-decision RNG stream without ever drawing from the engine's rng (which would desync every
    // subsequent real die roll), initiativeOrder so an evaluator can tell who's already acted.
    seed: scenario.seed,
    initiativeOrder: null, // filled immediately below, once the roll has happened
    walls: scenario.walls, // Foundry Wall-schema segments (design doc §19 Phase 1b) — undefined means none
    combatants: new Map(scenario.combatants.map((c) => [c.id, structuredClone(c)])),
    positions: new Map(scenario.combatants.map((c) => [c.id, { ...c.position }]))
  };
  const { order: initiativeOrder, rolls: initiativeRolls } = rollInitiative(rng, scenario.combatants);
  state.initiativeOrder = initiativeOrder;

  // Full authored ("sheet") stats, built in INITIATIVE order (not scenario.combatants' authoring
  // order) so every downstream consumer — the artifact's roster panel, the Round 0 deployment
  // listing — inherits the correct order for free via Object.entries/Object.keys, matching the
  // Frame-scale fix for the same divergence (design doc §14i).
  const combatantsById = new Map(scenario.combatants.map((c) => [c.id, c]));
  const roster = Object.fromEntries(
    initiativeOrder.map((id) => {
      const c = combatantsById.get(id);
      return [id, {
        name: c.name, kind: c.kind, side: c.side, size: c.size, maxHP: c.maxHP,
        initiativeModifier: c.initiativeModifier ?? 0,
        ac: c.ac, hardness: c.hardness ?? 0,
        saves: c.saves, speed: c.speed, strikes: c.strikes ?? [],
        // Real authored data, shown for transcript honesty — NOT fired by anything in this file.
        // See this file's own header for why reactions are deliberately not wired up in Phase 1.
        reactions: c.reactions ?? [],
        spells: c.spells ?? [], healAbilities: c.healAbilities ?? [],
        saveAttacks: c.saveAttacks ?? [], intimidationModifier: c.intimidationModifier ?? null
      }];
    })
  );
  const log = {
    seed: scenario.seed, gridSize: scenario.gridSize,
    // Both new for the artifact viewer (design doc §19): feetPerSquare so a shared renderer can
    // correctly scale range rings at 5ft instead of assuming the Frame-scale 50ft it was built for
    // (tools/battle-simulator/artifact/geometry.mjs's own former hardcoded constant), and walls so
    // Phase 1b's building actually becomes visible rather than invisible structure nobody can see.
    feetPerSquare: FEET_PER_SQUARE, walls: scenario.walls ?? [],
    initiativeOrder, initiativeRolls, roster,
    deployment: { round: 0, snapshot: snapshotState(state) }, // "Round 0" — every combatant is positioned before the clock starts
    initialSnapshot: snapshotState(state), rounds: [], outcome: null
  };

  for (let round = 1; round <= scenario.roundLimit; round++) {
    state.round = round;
    const roundLog = { round, turns: [] };

    for (const combatantId of initiativeOrder) {
      const combatant = state.combatants.get(combatantId);
      if (combatant.currentHP <= 0) continue;

      if (combatant.stunnedRounds > 0) {
        combatant.stunnedRounds -= 1;
        const stunnedAvailable = resolveEffectiveStats(combatant).actionsAvailable;
        roundLog.turns.push({
          combatantId, stunned: true, actions: [],
          actionAccounting: accountForActions({ available: stunnedAvailable, spent: 0, heldReason: stunnedAvailable > 0 ? "Stunned — the whole turn is forfeit" : null }),
          snapshot: snapshotState(state)
        });
        continue;
      }

      const turnLog = runTurn({ state, rng, scenario, combatantId });

      // Frightened decay (reference/srd/player-core/condition-18-frightened.json, mirrored
      // verbatim): "at the end of each of your turns, the value... decreases by 1." Placed here,
      // after the combatant's own turn fully resolves, matching the real rule's own timing exactly
      // — NOT at the start of their next turn, and NOT decremented on anyone else's turn.
      if (combatant.frightened > 0) combatant.frightened -= 1;

      turnLog.snapshot = snapshotState(state);
      roundLog.turns.push(turnLog);

      const outcome = checkOutcome(state);
      if (outcome) {
        log.outcome = outcome;
        break;
      }
    }

    log.rounds.push(roundLog);
    if (log.outcome) break;
  }

  if (!log.outcome) log.outcome = { result: "timeout", detail: `Round limit (${scenario.roundLimit}) reached with no side eliminated.` };

  return log;
}

/**
 * Builds and validates one turn's action-point ledger. `available` is always the combatant's
 * actionsAvailable AT THE START of its turn. THROWS if spent+held != available: that combination
 * can only happen from a real bug in the caller, and this is the one place in the file positioned
 * to catch it for every turn, every combatant, unconditionally.
 */
export function accountForActions({ available, spent, heldReason }) {
  const held = available - spent;
  if (held < 0) {
    throw new Error(`Action accounting failure: spent ${spent} of ${available} available action points — spent MORE than available.`);
  }
  if (held > 0 && !heldReason) {
    throw new Error(`Action accounting failure: ${held} of ${available} action point(s) went unspent with no recorded reason.`);
  }
  return { available, spent, held, heldReason: held > 0 ? heldReason : null };
}

/**
 * ONE mutable per-turn object (design doc §15d). Everything that carries information from one
 * action to the next within a turn lives here and nowhere else: the action budget, movement
 * spent, and the shared multiple-attack-penalty counter. `{ ...turnProgress }` is a complete fork
 * by construction — this is what makes the lookahead sandbox's forking cheap and safe.
 */
function makeTurnProgress(startEffective) {
  return {
    actionsAvailable: startEffective.actionsAvailable,
    actionsUsed: 0,
    feetMoved: 0,
    strikesAttempted: 0,
    decisionIndex: 0 // monotonic per turn; seeds the AI's own per-decision RNG (§15f)
  };
}

function runTurn({ state, rng, scenario, combatantId }) {
  const combatant = state.combatants.get(combatantId);
  const startEffective = resolveEffectiveStats(combatant);
  const turnProgress = makeTurnProgress(startEffective);
  const turnLog = { combatantId, effectiveStats: startEffective, feetMoved: 0, strikesAttempted: 0, actions: [] };

  if (startEffective.disabled) {
    turnLog.actions.push({ type: "none", note: `${combatant.name} is at 0 HP — no actions.` });
    turnLog.actionAccounting = accountForActions({ available: startEffective.actionsAvailable, spent: 0, heldReason: null });
    return turnLog;
  }

  let heldReason = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const effective = resolveEffectiveStats(combatant);
    if (effective.disabled) {
      turnLog.actions.push({ type: "none", note: `${combatant.name} was reduced to 0 HP mid-turn — remaining actions forfeited.` });
      heldReason = "Reduced to 0 HP mid-turn — remaining actions forfeited";
      break;
    }
    turnProgress.actionsAvailable = Math.min(effective.actionsAvailable, startEffective.actionsAvailable);

    // The AI receives a COPY, never the live object — it can read its own turn progress but
    // cannot mutate the engine's counters.
    const proposal = scenario.ai(state, combatantId, { ...turnProgress, effective });
    if (!proposal) {
      heldReason = "No legal action the AI could find to spend the remaining action point(s) on";
      break;
    }

    const result = attemptAction({ state, rng, combatantId, proposal, turnProgress, turnLog, effective });
    turnLog.actions.push(result);
    turnProgress.decisionIndex += 1;
    if (!result.legal) {
      // a well-behaved AI never proposes an illegal action twice in a row; stop the turn rather than loop forever
      heldReason = `AI proposed an illegal ${result.type} (${result.reason}) — turn ended rather than retry`;
      break;
    }
    if (turnProgress.actionsUsed >= turnProgress.actionsAvailable) break; // spent everything this turn's budget allows
  }

  turnLog.feetMoved = turnProgress.feetMoved;
  turnLog.strikesAttempted = turnProgress.strikesAttempted;
  turnLog.actionAccounting = accountForActions({ available: startEffective.actionsAvailable, spent: turnProgress.actionsUsed, heldReason });
  return turnLog;
}

/**
 * Shared damage-application path. Player Core p.399 ("Apply immunities first, then weaknesses,
 * and resistances third") is handled inside resolve.mjs's mitigateDamage — the ONE implementation
 * shared with the AI's own damage prediction (design doc §15e). This function's remaining job is
 * the part only the engine may do: actually writing the HP.
 */
function applyStrikeDamage(strikeResult, target, targetEffective, strike) {
  if (!strikeResult.damage) return { appliedDamage: 0 };
  const appliedDamage = mitigateDamage(strikeResult.damage.raw, { target, targetEffective, strike });
  target.currentHP = Math.max(0, target.currentHP - appliedDamage);
  return { appliedDamage };
}

/**
 * Every combatant's position, for occupancy purposes — DEAD combatants excluded. A defeated
 * creature's square isn't an obstacle (nothing in Player Core treats a fallen creature as blocking
 * movement the way a standing one does), so it must never count as "occupied" for pathing/legality.
 *
 * REAL BUG this fixes, found from a direct user report and confirmed by instrumenting a real fight:
 * `state.positions` keeps every combatant's last position forever, alive or dead (deliberately —
 * the artifact viewer needs a defeated combatant's final square to render its body). Every
 * occupancy check used to read straight off `state.positions` with no HP filter at all, so a
 * combatant who died standing in a single-square doorway permanently sealed that doorway for the
 * rest of the battle — confirmed directly: Security Goon died at (20,11), the ONLY doorway between
 * the courtyard and Xenowarden Greenhorn's building, and every one of Xenowarden Greenhorn's own
 * pathfinding calls for the following 27 rounds still listed `security-goon-o0@20,11(hp0)` as an
 * occupied, blocking square — she was structurally unable to ever leave her own building again,
 * which is what the "oscillates near a doorway that goes nowhere" and "moved three times instead of
 * engaging" reports were actually observing. Both the real legality gate here (via this function)
 * and the AI's own candidate generation (decide.mjs's own matching `otherLivingPositions`) needed
 * this fix — the AI's route-planning would still have proposed nothing useful even after the real
 * engine started allowing the correct move, since it independently rebuilds its own occupancy list.
 */
function livingPositions(state) {
  return [...state.positions.entries()]
    .filter(([id]) => (state.combatants.get(id)?.currentHP ?? 0) > 0)
    .map(([id, p]) => ({ combatantId: id, pos: p }));
}

/** The ONLY function in this codebase permitted to mutate combatant position/HP/flags. */
function attemptAction({ state, rng, combatantId, proposal, turnProgress, turnLog, effective, outcomes = REAL_OUTCOMES }) {
  const combatant = state.combatants.get(combatantId);
  const pos = state.positions.get(combatantId);

  if (proposal.type === "move") {
    // proposal.to may carry a `path` (design doc §16, world/pathfind.mjs's wall-aware routing) —
    // real routing data checkMoveLegality needs but which must never leak into state.positions or
    // the battle log as if it were part of a combatant's position.
    const { path, ...to } = proposal.to;
    const check = checkMoveLegality({
      combatant, from: pos, to, effectiveSpeed: effective.speed,
      allPositions: livingPositions(state),
      gridSize: state.gridSize, turnState: turnProgress, walls: state.walls, path
    });
    if (!check.legal) return { type: "move", to, legal: false, reason: check.reason };

    const stepDistance = distanceFeet(pos, to);
    state.positions.set(combatantId, { ...to });
    turnProgress.feetMoved += stepDistance;
    turnProgress.actionsUsed += 1;

    return { type: "move", from: { ...pos }, to: { ...to }, feet: stepDistance, legal: true, actionsCost: 1, decisionReason: proposal.reason ?? null };
  }

  // Step (Player Core pg. 410): identical to a move in every way except it is capped at one
  // square and never triggers a reaction — no different from "move" here since this file doesn't
  // fire reactions from either action type (see header).
  if (proposal.type === "step") {
    const { path: _stepPath, ...to } = proposal.to;
    const check = checkStepLegality({
      combatant, from: pos, to, effectiveSpeed: effective.speed,
      allPositions: livingPositions(state),
      gridSize: state.gridSize, turnState: turnProgress, walls: state.walls
    });
    if (!check.legal) return { type: "step", to, legal: false, reason: check.reason };

    const stepDistance = distanceFeet(pos, to);
    state.positions.set(combatantId, { ...to });
    turnProgress.feetMoved += stepDistance;
    turnProgress.actionsUsed += 1;

    return { type: "step", from: { ...pos }, to: { ...to }, feet: stepDistance, legal: true, actionsCost: 1, decisionReason: proposal.reason ?? null };
  }

  if (proposal.type === "strike") {
    const target = state.combatants.get(proposal.targetId);
    const targetPos = state.positions.get(proposal.targetId);
    const strike = (combatant.strikes ?? [])[proposal.strikeIndex ?? 0];
    // A proposal naming a strike this combatant does not have is ILLEGAL, not a crash — an AI (or
    // an adversarial test) may propose anything and the engine turns anything invalid into a
    // no-op with a reason.
    if (!strike) return { type: "strike", targetId: proposal.targetId, legal: false, reason: `No strike at index ${proposal.strikeIndex ?? 0} — ${combatant.name} has ${(combatant.strikes ?? []).length}.` };

    const check = checkStrikeLegal({ attacker: combatant, attackerPos: pos, target, targetPos, strike, turnState: turnProgress, walls: state.walls });
    if (!check.legal) return { type: "strike", targetId: proposal.targetId, legal: false, reason: check.reason };

    turnProgress.strikesAttempted += 1;
    const mapPenalty = multipleAttackPenalty(turnProgress.strikesAttempted, (strike.traits ?? []).includes("agile"));
    const rangePenalty = rangeIncrementPenalty(strike, distanceFeet(pos, targetPos));
    const frightenedPenalty = -(combatant.frightened ?? 0); // Frightened penalizes ALL your own checks — an attack roll is a check
    const targetEffective = resolveEffectiveStats(target);

    const { roll: strikeResult, appliedDamage } = outcomes.strike(rng, {
      attacker: combatant, strike, target, targetEffective, mapPenalty: mapPenalty + rangePenalty + frightenedPenalty
    });
    strikeResult.rangePenalty = rangePenalty;
    turnProgress.actionsUsed += 1;

    // Limited-use abilities (e.g. a strike granted by a consumable): decrement on a successful
    // fire — checkStrikeLegal already refused this proposal if usesRemaining was already 0.
    if (strike.usesRemaining != null) strike.usesRemaining -= 1;

    return {
      type: "strike", strikeName: strike.name, targetId: proposal.targetId, legal: true, actionsCost: 1,
      roll: strikeResult, hardnessApplied: targetEffective.hardness,
      damageApplied: appliedDamage, targetHPAfter: target.currentHP,
      usesRemaining: strike.usesRemaining ?? null, decisionReason: proposal.reason ?? null
    };
  }

  // Spell attack (design doc §14k): mechanically a Strike wearing different clothes — Player
  // Core's "make a ranged spell attack roll against the target's AC, crit doubles" is the exact
  // same degree-of-success shape resolveStrike() already resolves, so it's reused directly rather
  // than duplicated. What's genuinely different: a variable action cost (spell.actions, not
  // hardcoded to 1) and a flat range instead of an incrementing one, both handled entirely in
  // checkSpellAttackLegal. Spells with the attack trait share the SAME multiple-attack-penalty
  // counter as ordinary Strikes (Player Core: any attack-trait action counts toward MAP).
  if (proposal.type === "spellAttack") {
    const target = state.combatants.get(proposal.targetId);
    const targetPos = state.positions.get(proposal.targetId);
    const spell = (combatant.spells ?? [])[proposal.spellIndex ?? 0];
    if (!spell) return { type: "spellAttack", targetId: proposal.targetId, legal: false, reason: `No spell at index ${proposal.spellIndex ?? 0} — ${combatant.name} has ${(combatant.spells ?? []).length}.` };

    const check = checkSpellAttackLegal({ caster: combatant, casterPos: pos, target, targetPos, spell, turnState: turnProgress, walls: state.walls });
    if (!check.legal) return { type: "spellAttack", targetId: proposal.targetId, legal: false, reason: check.reason };

    turnProgress.strikesAttempted += 1;
    const mapPenalty = multipleAttackPenalty(turnProgress.strikesAttempted, (spell.traits ?? []).includes("agile"));
    const frightenedPenalty = -(combatant.frightened ?? 0);
    const targetEffective = resolveEffectiveStats(target);

    const { roll: spellResult, appliedDamage } = outcomes.strike(rng, {
      attacker: combatant, strike: spell, target, targetEffective, mapPenalty: mapPenalty + frightenedPenalty
    });
    turnProgress.actionsUsed += spell.actions ?? 1;

    if (spell.usesRemaining != null) spell.usesRemaining -= 1;

    return {
      type: "spellAttack", spellName: spell.name, targetId: proposal.targetId, legal: true, actionsCost: spell.actions ?? 1,
      roll: spellResult, hardnessApplied: targetEffective.hardness,
      damageApplied: appliedDamage, targetHPAfter: target.currentHP,
      usesRemaining: spell.usesRemaining ?? null, decisionReason: proposal.reason ?? null
    };
  }

  // Heal ability (design doc §14k): e.g. the Mystic's real Transfer Vitality — "you can transfer
  // up to N Hit Points... into yourself or a bonded creature," no roll at all.
  if (proposal.type === "healAbility") {
    const target = state.combatants.get(proposal.targetId);
    const targetPos = state.positions.get(proposal.targetId);
    const ability = (combatant.healAbilities ?? [])[proposal.abilityIndex ?? 0];
    if (!ability) return { type: "healAbility", targetId: proposal.targetId, legal: false, reason: `No heal ability at index ${proposal.abilityIndex ?? 0} — ${combatant.name} has ${(combatant.healAbilities ?? []).length}.` };

    const check = checkHealAbilityLegal({ healer: combatant, healerPos: pos, target, targetPos, ability, turnState: turnProgress });
    if (!check.legal) return { type: "healAbility", targetId: proposal.targetId, legal: false, reason: check.reason };

    const healing = ability.healingAmount ?? 0;
    target.currentHP = Math.min(target.maxHP, target.currentHP + healing);
    turnProgress.actionsUsed += ability.actions ?? 1;

    if (ability.usesRemaining != null) ability.usesRemaining -= 1;

    return {
      type: "healAbility", abilityName: ability.name, targetId: proposal.targetId, legal: true, actionsCost: ability.actions ?? 1,
      healing, targetHPAfter: target.currentHP, usesRemaining: ability.usesRemaining ?? null, decisionReason: proposal.reason ?? null
    };
  }

  // Save-based attack (e.g. a thrown grenade, Player Core pg. 398's basic-save shape): the TARGET
  // rolls, not the attacker — no attack roll at all, so this does NOT increment
  // turnProgress.strikesAttempted and is never subject to Multiple Attack Penalty (MAP only
  // applies to attack ROLLS, Player Core's own rule — see rangeIncrementPenalty's sibling
  // multipleAttackPenalty for the ordinary-Strike case this deliberately does NOT share).
  if (proposal.type === "saveAttack") {
    const target = state.combatants.get(proposal.targetId);
    const targetPos = state.positions.get(proposal.targetId);
    const saveAttackAbility = (combatant.saveAttacks ?? [])[proposal.saveAttackIndex ?? 0];
    if (!saveAttackAbility) return { type: "saveAttack", targetId: proposal.targetId, legal: false, reason: `No saveAttack at index ${proposal.saveAttackIndex ?? 0} — ${combatant.name} has ${(combatant.saveAttacks ?? []).length}.` };

    const check = checkSaveAttackLegal({ attacker: combatant, attackerPos: pos, target, targetPos, saveAttack: saveAttackAbility, turnState: turnProgress, walls: state.walls });
    if (!check.legal) return { type: "saveAttack", targetId: proposal.targetId, legal: false, reason: check.reason };

    const targetEffective = resolveEffectiveStats(target);
    const { roll: saveResult, appliedDamage } = outcomes.saveAttack(rng, { saveAttack: saveAttackAbility, target, targetEffective });
    turnProgress.actionsUsed += saveAttackAbility.actions ?? 1;

    if (saveAttackAbility.usesRemaining != null) saveAttackAbility.usesRemaining -= 1;

    return {
      type: "saveAttack", saveAttackName: saveAttackAbility.name, targetId: proposal.targetId, legal: true, actionsCost: saveAttackAbility.actions ?? 1,
      roll: saveResult, hardnessApplied: targetEffective.hardness,
      damageApplied: appliedDamage, targetHPAfter: target.currentHP,
      usesRemaining: saveAttackAbility.usesRemaining ?? null, decisionReason: proposal.reason ?? null
    };
  }

  // Demoralize (Intimidation, Player Core pg. 200): an Intimidation check, not an attack roll —
  // also never subject to MAP, for the same reason as saveAttack above. This is the actual
  // mechanism behind "Demoralize is a reliable way to spend an action when your remaining attacks
  // would carry a heavy MAP penalty" (Ingram's own framing, design doc §19): a 3rd Strike eats -10,
  // Demoralize eats 0, regardless of how many Strikes came before it this turn.
  if (proposal.type === "demoralize") {
    const target = state.combatants.get(proposal.targetId);
    const check = checkDemoralizeLegal({ attacker: combatant, attackerPos: pos, target, targetPos: state.positions.get(proposal.targetId), turnState: turnProgress, walls: state.walls });
    if (!check.legal) return { type: "demoralize", targetId: proposal.targetId, legal: false, reason: check.reason };

    const { roll: demoralizeRoll, appliedFrightened } = outcomes.demoralize(rng, { attacker: combatant, target });
    // "Keep the worse (higher) value, don't stack" — the standard SF2E rule for reapplying a
    // condition value you already have (well-established system knowledge; the specific stacking
    // rule text wasn't found verbatim in the mirrored SRD pages checked — see design doc §19).
    target.frightened = Math.max(target.frightened ?? 0, appliedFrightened);
    combatant.demoralizedTargets = [...(combatant.demoralizedTargets ?? []), proposal.targetId];
    turnProgress.actionsUsed += 1;

    return {
      type: "demoralize", targetId: proposal.targetId, legal: true, actionsCost: 1,
      roll: demoralizeRoll, frightenedApplied: appliedFrightened, targetFrightenedAfter: target.frightened,
      decisionReason: proposal.reason ?? null
    };
  }

  return { type: proposal.type, legal: false, reason: `Unknown action type "${proposal.type}".` };
}

/**
 * A full, self-contained snapshot of every combatant's position/HP at this exact point in the
 * battle — computed once, server-side, so the artifact viewer never has to replay action deltas
 * client-side to reconstruct "what did the board look like after this turn."
 */
function snapshotState(state) {
  const snapshot = {};
  for (const [id, combatant] of state.combatants) {
    const pos = state.positions.get(id);
    snapshot[id] = {
      position: { ...pos },
      currentHP: combatant.currentHP,
      maxHP: combatant.maxHP,
      stunnedRounds: combatant.stunnedRounds ?? 0,
      frightened: combatant.frightened ?? 0
    };
  }
  return snapshot;
}

function checkOutcome(state) {
  const opposition = [...state.combatants.values()].filter((c) => c.side === "opposition");
  const party = [...state.combatants.values()].filter((c) => c.side === "party");

  if (opposition.every((c) => c.currentHP <= 0)) {
    return { result: "party-victory", detail: "All opposition combatants reduced to 0 HP." };
  }
  if (party.every((c) => c.currentHP <= 0)) {
    return { result: "party-defeat", detail: "All party combatants reduced to 0 HP." };
  }
  return null;
}

// ---------------------------------------------------------------------------
// LOOKAHEAD SANDBOX (design doc §15g)
// ---------------------------------------------------------------------------

/**
 * A clone purpose-built for planning, NOT structuredClone — copies exactly the fields the engine
 * ever mutates and shares the rest by reference. The ability arrays MUST be copied element-wise,
 * not shared: attemptAction does `strike.usesRemaining -= 1`, so a shallow `{...combatant}` would
 * let merely *planning* a shot spend a real limited use. Same reasoning for `demoralizedTargets`
 * (attemptAction's demoralize branch does `combatant.demoralizedTargets = [...]`, a REASSIGNMENT
 * not a mutation, so it happens to be safe either way this time — but a `.push()` would not be,
 * so it's still deep-copied here defensively, matching the array-of-arrays pattern below rather
 * than relying on this one branch never being rewritten to mutate in place later).
 *
 * `frightened` needs NO special handling here — see combatant.mjs's own header for why it's a flat
 * scalar rather than a nested `conditions` object specifically to make the plain `{...c}` shallow
 * copy below already correct for it, by construction.
 *
 * Mutable surface at personnel scale: state.round; state.combatants.<id>.{currentHP,
 * stunnedRounds, frightened, demoralizedTargets}; state.combatants.<id>.{strikes,spells,
 * healAbilities,saveAttacks}[i].usesRemaining; state.positions.<id>.{col,row}. (No
 * reactionAvailable map — this tree fires no reactions, see this file's own header.)
 */
export function cloneStateForPlanning(state) {
  const combatants = new Map();
  for (const [id, c] of state.combatants) {
    const copy = { ...c };
    if (c.strikes) copy.strikes = c.strikes.map((s) => ({ ...s }));
    if (c.spells) copy.spells = c.spells.map((s) => ({ ...s }));
    if (c.healAbilities) copy.healAbilities = c.healAbilities.map((a) => ({ ...a }));
    if (c.saveAttacks) copy.saveAttacks = c.saveAttacks.map((s) => ({ ...s }));
    if (c.demoralizedTargets) copy.demoralizedTargets = [...c.demoralizedTargets];
    combatants.set(id, copy);
  }
  const positions = new Map();
  for (const [id, p] of state.positions) positions.set(id, { col: p.col, row: p.row });
  return {
    round: state.round,
    gridSize: state.gridSize,
    seed: state.seed,
    initiativeOrder: state.initiativeOrder,
    walls: state.walls, // static terrain — never mutated in a battle, safe (and cheap) to share by reference
    combatants,
    positions
  };
}

/**
 * Fork the current turn into a private sandbox the AI can plan inside. Same restrictive shape as
 * the Frame-scale original: clones unconditionally, takes no rng (expected-value resolution means
 * a sandbox can never advance the battle's real dice stream), and keeps attemptAction module-
 * private so the live battle has exactly one writer — the turn loop.
 *
 * @param {object} args
 * @param {object} args.state - the live state; cloned, never mutated
 * @param {object} args.turn  - the turnProgress copy the AI was handed
 */
export function forkTurnSandbox({ state, turn }) {
  const sandboxState = cloneStateForPlanning(state);
  const sandboxTurn = { ...turn };
  const sandboxLog = { actions: [] }; // logging sink; nothing reads it during planning

  return {
    state: sandboxState,
    turn: sandboxTurn,
    actionsRemaining() {
      return sandboxTurn.actionsAvailable - sandboxTurn.actionsUsed;
    },
    /**
     * Apply a proposal to the sandbox using the REAL rules and EXPECTED outcomes. Returns exactly
     * what attemptAction returns, including `legal: false` with a reason when the proposal is
     * illegal — so a planner discovers illegality the same way the engine would.
     */
    apply(combatantId, proposal) {
      const effective = resolveEffectiveStats(sandboxState.combatants.get(combatantId));
      return attemptAction({
        state: sandboxState,
        rng: null, // EXPECTED_OUTCOMES ignores it; passing null makes misuse throw loudly
        combatantId, proposal, turnProgress: sandboxTurn, turnLog: sandboxLog, effective,
        outcomes: EXPECTED_OUTCOMES
      });
    }
  };
}
