/**
 * Turn-loop orchestration. Ties rng/grid/combatant/legality/resolve
 * together into a full battle, producing a structured log of every
 * action attempted (legal or not) and its result.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: state (position, HP, flags) is
 * NEVER mutated except inside attemptAction(), and attemptAction() NEVER
 * runs without a preceding { legal: true } from legality.mjs. An AI
 * script (or an adversarial test) can propose anything; the engine is
 * what makes an illegal proposal a no-op instead of a move.
 *
 * Hardened 2026-08-22 after an adversarial workflow (five independent
 * agents with real repro access) found real, proven gaps in this exact
 * invariant — see the fix-specific comments below for what each one was
 * and why it mattered.
 *
 * REVISED AGAIN 2026-08-22 (design doc §14f):
 *  - Real initiative. `initiativeOrder` used to just be scenario.combatants'
 *    array order — no dice at all. Every combatant now rolls d20 + its own
 *    initiativeModifier (data/combatants.mjs) once, at the very start of
 *    the battle, and the order is sorted by that real roll — highest
 *    first, PF2e/SF2e Player Core pg. 427's "Step 1: Roll Initiative".
 *    This is the mechanism behind "Frames are generally much worse at
 *    this than vehicles": see combatants.mjs's header comment for why.
 *  - Arrival-wave gating (arrivesOnRound/hasArrived/enRoute) is GONE.
 *    Every combatant is deployed and can act from round 1 — see
 *    combatants.mjs's header comment for why this is a strictly better
 *    fix for the same problem, now that distance and Speed share a 10x
 *    rescale (§14f) that leaves rounds-to-close unchanged.
 *  - Action-economy accounting. Every turn now closes with an explicit
 *    ledger (`turnLog.actionAccounting`) stating what every action point
 *    the combatant started the turn with was actually spent on, or why it
 *    was held. This isn't just a log field — accountForActions() below
 *    THROWS if the numbers don't add up, on purpose: "the action points
 *    didn't get accounted for" is exactly the class of silent bug this
 *    simulator's whole legality-first design exists to catch, so it fails
 *    loudly here the same way an illegal move fails loudly in legality.mjs.
 */

import { makeRng, rollD20 } from "./rng.mjs";
import { resolveEffectiveStats } from "./combatant.mjs";
import { checkMoveLegality, checkStrikeLegal, checkFieldRepairLegal, checkActionBudget, checkTargetAlive, checkSpotLegal, checkEvacuateLegal, checkSpellAttackLegal, checkHealAbilityLegal, multipleAttackPenalty, rangeIncrementPenalty } from "./legality.mjs";
import { resolveStrike, applyHardness, mitigateDamage, resolveFieldRepair, resolveEvacuation } from "./resolve.mjs";
import { distanceFeet, isAdjacent, isInBounds } from "./grid.mjs";

/**
 * Player Core pg. 427, Step 1: everyone rolls d20 + their initiative
 * modifier once, at the top of the encounter; ties keep their scenario
 * array order (stable sort) rather than an arbitrary re-roll — SF2E
 * doesn't mandate a specific tiebreak, and a deterministic one keeps the
 * whole battle reproducible from its seed like everything else here.
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
 * @param {Array} scenario.combatants - static + initial dynamic fields, see data/*.mjs
 * @param {(state, combatantId, turnState) => object|null} scenario.ai - decision function per combatant kind
 * @param {Object.<number, function>} [scenario.scriptedEvents] - round number -> (state, log) => void, applied before that round's turns
 */
export function runBattle(scenario) {
  const rng = makeRng(scenario.seed);
  const state = {
    round: 0,
    gridSize: scenario.gridSize,
    // `seed` and `initiativeOrder` are on state deliberately (design doc §15d), not just in the
    // log. The AI needs both and can reach neither otherwise:
    //  - seed: so the AI can derive its OWN per-decision RNG stream (§15f). It must never draw
    //    from the engine's rng — doing so would re-align every subsequent d20 whenever the AI
    //    changes, destroying the common-random-numbers property that makes two AI versions
    //    comparable on the same seed.
    //  - initiativeOrder: so an evaluator can tell which opponents have already acted this round
    //    and which still threaten it. "Who is healthier" mis-prices a mid-round state without it.
    seed: scenario.seed,
    initiativeOrder: null, // filled immediately below, once the roll has happened
    combatants: new Map(scenario.combatants.map((c) => [c.id, structuredClone(c)])),
    positions: new Map(scenario.combatants.map((c) => [c.id, { ...c.position }])),
    reactionAvailable: new Map(scenario.combatants.map((c) => [c.id, true]))
  };
  const { order: initiativeOrder, rolls: initiativeRolls } = rollInitiative(rng, scenario.combatants);
  state.initiativeOrder = initiativeOrder;

  // Full authored ("sheet") stats, not just the display-minimum fields — the artifact's
  // character-sheet panel (design doc §14f) reads this directly rather than needing separate
  // plumbing. Deliberately only the STATIC/authored fields (never currentHP, position,
  // stunnedRounds, spotted, or anything scriptedEvents mutates) — the roster is a fixed
  // reference sheet; per-turn state lives in each turn's own snapshot instead.
  //
  // FIX (design doc §14i, 2026-08-22): iterates initiativeOrder, not scenario.combatants'
  // authoring order — Ingram's own framing was "start with everyone on the field, roll
  // initiative, THEN organise the roster based on this order." A plain JS object preserves
  // string-key insertion order, so building the roster in initiative order here is enough for
  // EVERY downstream consumer (the artifact's roster panel, the Round 0 deployment listing) to
  // inherit the correct order for free via Object.entries/Object.keys, with no separate sort
  // needed at each call site — one source of truth instead of the roster panel and the
  // initiative strip disagreeing with each other, which is exactly what was happening before
  // this fix (the roster panel showed authoring order, the initiative strip showed the real roll).
  const combatantsById = new Map(scenario.combatants.map((c) => [c.id, c]));
  const roster = Object.fromEntries(
    initiativeOrder.map((id) => {
      const c = combatantsById.get(id);
      return [id, {
        name: c.name, kind: c.kind, side: c.side, size: c.size, maxHP: c.maxHP,
        initiativeModifier: c.initiativeModifier ?? 0,
        ac: c.ac, hardness: c.hardness ?? 0, scaleHardness: c.scaleHardness ?? 0,
        saves: c.saves, speed: c.speed, strikes: c.strikes ?? [], reactions: c.reactions ?? [],
        scaleBlind: c.scaleBlind ?? false, resonanceBand: c.resonanceBand ?? null,
        repairBonus: c.repairBonus ?? null, handlingDC: c.handlingDC ?? null,
        spells: c.spells ?? [], healAbilities: c.healAbilities ?? [] // design doc §14k
      }];
    })
  );
  const log = {
    seed: scenario.seed, gridSize: scenario.gridSize, initiativeOrder, initiativeRolls, roster,
    deployment: { round: 0, snapshot: snapshotState(state) }, // "Round 0" — every force is positioned before the clock starts
    initialSnapshot: snapshotState(state), rounds: [], outcome: null
  };

  for (let round = 1; round <= scenario.roundLimit; round++) {
    state.round = round;
    const roundLog = { round, scriptedEvents: [], turns: [] };

    const scriptedEvent = scenario.scriptedEvents?.[round];
    if (scriptedEvent) {
      const note = scriptedEvent(state);
      if (note) roundLog.scriptedEvents.push(note);
    }

    for (const id of state.reactionAvailable.keys()) state.reactionAvailable.set(id, true);

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
      turnLog.snapshot = snapshotState(state);
      roundLog.turns.push(turnLog);

      const outcome = checkOutcome(state, scenario);
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
 * Builds and validates one turn's action-point ledger. `available` is
 * always the combatant's actionsAvailable AT THE START of its turn (not
 * whatever resolveEffectiveStats says by the end) — that's the number of
 * points the user is actually asking to see accounted for, and it can
 * legitimately be MORE than what's spendable by the end if a mid-turn
 * reaction drops the combatant into a harsher damage-state action cap
 * (see the "reduced mid-turn" heldReason). THROWS if spent+held!=available:
 * that combination can only happen from a real bug in the caller, and this
 * is the one place in the file positioned to catch it for every turn, every
 * combatant, unconditionally.
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
 * ONE mutable per-turn object (design doc §15d). Everything that carries
 * information from one action to the next within a turn lives here and
 * nowhere else: the action budget, movement spent, and the shared
 * multiple-attack-penalty counter.
 *
 * WHY THIS IS ONE OBJECT AND NOT TWO. These counters used to be split
 * across `turnState` (actionsAvailable/actionsUsed) and `turnLog`
 * (feetMoved/strikesAttempted) for no reason other than history, while
 * attemptAction mutated both. That split is a latent bug factory for any
 * lookahead sandbox: forking a turn means snapshotting *every* mutable
 * per-turn counter, and a two-object surface means there is a list to keep
 * in sync by hand. With one object, `{ ...turnProgress }` is a complete
 * fork by construction — and if a fifth counter is ever added it lands
 * here, therefore in the AI's argument, therefore in the fork, with no
 * list to update. turnLog is now append-only logging that nothing reads
 * for decisions.
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
    turnLog.actions.push({ type: "none", note: `${combatant.name} is Hulked/Destroyed — no actions.` });
    turnLog.actionAccounting = accountForActions({ available: startEffective.actionsAvailable, spent: 0, heldReason: null });
    return turnLog;
  }

  let heldReason = null;
  let latestEffective = startEffective;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // FIX (adversarial workflow, 2026-08-22, three independent agents converged on this):
    // effective stats used to be computed ONCE before this loop and never revisited. A
    // combatant reduced to 0 HP mid-turn by a reaction (e.g. the Claimant's Claim, fired
    // from inside attemptAction()'s move/advance handling) could keep proposing and landing
    // further Strikes using that stale, pre-death budget. Re-deriving `effective` at the top
    // of every iteration — and hard-stopping the turn the instant the combatant is disabled —
    // closes that: a dead combatant's turn ends here, not at the next legality check.
    const effective = resolveEffectiveStats(combatant);
    latestEffective = effective;
    if (effective.disabled) {
      turnLog.actions.push({ type: "none", note: `${combatant.name} was reduced to 0 HP mid-turn — remaining actions forfeited.` });
      heldReason = "Reduced to 0 HP mid-turn (by a reaction) — remaining actions forfeited";
      break;
    }
    // FIX (design doc §14k, 2026-08-22): clamped at startEffective.actionsAvailable — this
    // re-derivation was only ever designed to catch a DROP (a reaction hurting the combatant
    // mid-turn, correctly restricting further actions), never a RISE. Nothing could raise a
    // combatant's own damage-state band mid-turn before healAbility existed; a self-targeted
    // heal (e.g. the Mystic's Transfer Vitality) can now push Degraded back to Operational
    // mid-turn, and an unclamped re-derivation let that grant a 4th action point the turn never
    // started with — accountForActions correctly caught it as a genuine overspend rather than
    // silently accepting it. Real SF2E rule: your turn's action budget is fixed at the moment
    // the turn begins; a benefit gained mid-turn takes effect starting next turn, not this one.
    turnProgress.actionsAvailable = Math.min(effective.actionsAvailable, startEffective.actionsAvailable);

    // The AI receives a COPY, never the live object — it can read its own turn progress but
    // cannot mutate the engine's counters. Field names are unchanged from the old two-object
    // spread, so this refactor is invisible to every AI implementation.
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
    if (turnProgress.actionsUsed >= turnProgress.actionsAvailable) break; // spent everything this turn's (possibly-reduced) budget allows
  }

  // turnLog mirrors the final counters for the battle log / artifact only; nothing reads these
  // for decisions (that is turnProgress's job), so they are copied once at the end rather than
  // maintained in parallel.
  turnLog.feetMoved = turnProgress.feetMoved;
  turnLog.strikesAttempted = turnProgress.strikesAttempted;

  // If the turn ended "cleanly" (heldReason still null) but fewer points were spent than the
  // turn STARTED with, the only legitimate cause is a mid-turn damage-state drop shrinking the
  // action cap (e.g. a reaction knocks the combatant from Operational into Critical) — confirm
  // that's really what happened and label it; accountForActions() below throws if not, rather
  // than letting a real accounting gap through unexplained.
  if (heldReason === null && turnProgress.actionsUsed < startEffective.actionsAvailable && latestEffective.actionsAvailable < startEffective.actionsAvailable) {
    heldReason = `Damage state dropped mid-turn (${startEffective.damageState} -> ${latestEffective.damageState}), reducing the action cap from ${startEffective.actionsAvailable} to ${latestEffective.actionsAvailable}`;
  }

  turnLog.actionAccounting = accountForActions({ available: startEffective.actionsAvailable, spent: turnProgress.actionsUsed, heldReason });
  return turnLog;
}

/**
 * Shared damage-application path — used by BOTH an ordinary Strike
 * (below) and a reaction Strike (checkReactionTriggers). FIX (adversarial
 * workflow, 2026-08-22, two independent agents): these used to be two
 * separately hand-written implementations, and the reaction path had
 * silently drifted — it applied Hardness correctly but skipped
 * immuneToAllDamage entirely, so a target with an intact Interdiction
 * Field took full, real damage the instant it was the one being reacted
 * to. One shared function means the two paths can't drift apart again.
 *
 * Also fixes the weakness/Hardness order: Player Core p.399 ("Apply
 * immunities first, then weaknesses, and resistances third") means
 * weakness must be added to raw damage BEFORE Hardness is subtracted, not
 * after — the old order let a hit Hardness should have fully absorbed
 * leak its full weakness value through as guaranteed damage.
 *
 * Scale-Hardness (design/scale-and-chassis.md §14b, added after vehicles
 * out-damaged the Frame in the first simulated battle): a second,
 * independent Hardness value some targets (Claimants) carry, applied ONLY
 * when the attacking Strike itself carries the "mounted" trait — i.e. only
 * against vehicle-scale weapons, never against a Frame's own Strike. It's
 * checked after ordinary Hardness, same composition as two armor layers
 * stacking: a building-scale creature shrugging off car-mounted guns the
 * way a tank shrugs off rifle fire.
 */
function applyStrikeDamage(strikeResult, target, targetEffective, strike) {
  if (!strikeResult.damage) return { appliedDamage: 0, immune: false };
  if (target.immuneToAllDamage) return { appliedDamage: 0, immune: true };

  // Mitigation maths lives in resolve.mjs's mitigateDamage — the ONE implementation shared with
  // the AI's own damage prediction (design doc §15e). This function's remaining job is the part
  // only the engine may do: actually writing the HP.
  const appliedDamage = mitigateDamage(strikeResult.damage.raw, { target, targetEffective, strike });
  target.currentHP = Math.max(0, target.currentHP - appliedDamage);
  return { appliedDamage, immune: false };
}

/** The ONLY function in this codebase permitted to mutate combatant position/HP/flags. */
function attemptAction({ state, rng, combatantId, proposal, turnProgress, turnLog, effective }) {
  const combatant = state.combatants.get(combatantId);
  const pos = state.positions.get(combatantId);

  if (proposal.type === "move") {
    const check = checkMoveLegality({
      combatant,
      from: pos,
      to: proposal.to,
      effectiveSpeed: effective.speed,
      feetAlreadyMovedThisTurn: turnProgress.feetMoved,
      allPositions: [...state.positions.entries()].map(([id, p]) => ({ combatantId: id, pos: p })),
      gridSize: state.gridSize,
      turnState: turnProgress // FIX: checkMoveLegality now checks the action budget itself — "move" was
      // previously the one proposal type exempt from budget enforcement.
    });
    if (!check.legal) return { type: "move", to: proposal.to, legal: false, reason: check.reason };

    const stepDistance = distanceFeet(pos, proposal.to);
    state.positions.set(combatantId, { ...proposal.to });
    turnProgress.feetMoved += stepDistance;
    turnProgress.actionsUsed += 1;

    const result = { type: "move", from: { ...pos }, to: { ...proposal.to }, feet: stepDistance, legal: true, actionsCost: 1, decisionReason: proposal.reason ?? null };

    const reactions = checkReactionTriggers({ state, rng, moverId: combatantId });
    if (reactions.length) result.triggeredReactions = reactions;

    return result;
  }

  if (proposal.type === "strike") {
    const target = state.combatants.get(proposal.targetId);
    const targetPos = state.positions.get(proposal.targetId);
    const strike = combatant.strikes[proposal.strikeIndex ?? 0];

    const check = checkStrikeLegal({ attacker: combatant, attackerPos: pos, target, targetPos, strike, turnState: turnProgress });
    if (!check.legal) return { type: "strike", targetId: proposal.targetId, legal: false, reason: check.reason };

    turnProgress.strikesAttempted += 1;
    const mapPenalty = multipleAttackPenalty(turnProgress.strikesAttempted, (strike.traits ?? []).includes("agile"));
    const rangePenalty = rangeIncrementPenalty(strike, distanceFeet(pos, targetPos));
    const targetEffective = resolveEffectiveStats(target);

    // Spot (design/scale-and-chassis.md §14d): a consumed +2 circumstance bonus from an
    // earlier ally action this same turn cycle, the actual mechanism by which a vehicle
    // makes the Frame's hit land rather than out-damaging it directly.
    const spotBonus = combatant.spotted ? 2 : 0;
    const strikeResult = resolveStrike(rng, { attacker: combatant, strike, targetAc: targetEffective.ac, mapPenalty: mapPenalty + spotBonus + rangePenalty });
    strikeResult.rangePenalty = rangePenalty;
    if (combatant.spotted) { strikeResult.spotBonusApplied = spotBonus; combatant.spotted = false; }
    const { appliedDamage, immune } = applyStrikeDamage(strikeResult, target, targetEffective, strike);
    turnProgress.actionsUsed += 1;

    // Limited-use ordnance (design doc §14g): decrement on a successful fire — checkStrikeLegal
    // already refused this proposal if usesRemaining was already 0, so this can only run when
    // there was real ordnance to spend.
    if (strike.usesRemaining != null) strike.usesRemaining -= 1;

    return {
      type: "strike",
      strikeName: strike.name,
      targetId: proposal.targetId,
      legal: true,
      actionsCost: 1,
      roll: strikeResult,
      hardnessApplied: targetEffective.hardness,
      scaleHardnessApplied: strike.traits?.includes("mounted") ? (target.scaleHardness || 0) : 0,
      immune,
      damageApplied: appliedDamage,
      targetHPAfter: target.currentHP,
      usesRemaining: strike.usesRemaining ?? null,
      decisionReason: proposal.reason ?? null
    };
  }

  // Spell attack (design doc §14k): mechanically a Strike wearing different clothes — Player
  // Core's "make a ranged spell attack roll against the target's AC, crit doubles" is the exact
  // same degree-of-success shape resolveStrike() already resolves, so it's reused directly rather
  // than duplicated. What's genuinely different from a Strike: a variable action cost (spell.actions,
  // not hardcoded to 1) and a flat range instead of an incrementing one — both handled entirely in
  // checkSpellAttackLegal, so this branch only has to know it's calling a different legality check.
  // Spells with the attack trait share the SAME multiple-attack-penalty counter as ordinary Strikes
  // (Player Core: any attack-trait action counts toward MAP), so turnLog.strikesAttempted is the
  // one shared counter both branches increment — never a separate per-type counter.
  if (proposal.type === "spellAttack") {
    const target = state.combatants.get(proposal.targetId);
    const targetPos = state.positions.get(proposal.targetId);
    const spell = combatant.spells[proposal.spellIndex ?? 0];

    const check = checkSpellAttackLegal({ caster: combatant, casterPos: pos, target, targetPos, spell, turnState: turnProgress });
    if (!check.legal) return { type: "spellAttack", targetId: proposal.targetId, legal: false, reason: check.reason };

    turnProgress.strikesAttempted += 1;
    const mapPenalty = multipleAttackPenalty(turnProgress.strikesAttempted, (spell.traits ?? []).includes("agile"));
    const targetEffective = resolveEffectiveStats(target);

    const spotBonus = combatant.spotted ? 2 : 0;
    const spellResult = resolveStrike(rng, { attacker: combatant, strike: spell, targetAc: targetEffective.ac, mapPenalty: mapPenalty + spotBonus });
    if (combatant.spotted) { spellResult.spotBonusApplied = spotBonus; combatant.spotted = false; }
    const { appliedDamage, immune } = applyStrikeDamage(spellResult, target, targetEffective, spell);
    turnProgress.actionsUsed += spell.actions ?? 1;

    if (spell.usesRemaining != null) spell.usesRemaining -= 1;

    return {
      type: "spellAttack",
      spellName: spell.name,
      targetId: proposal.targetId,
      legal: true,
      actionsCost: spell.actions ?? 1,
      roll: spellResult,
      hardnessApplied: targetEffective.hardness,
      scaleHardnessApplied: spell.traits?.includes("mounted") ? (target.scaleHardness || 0) : 0,
      immune,
      damageApplied: appliedDamage,
      targetHPAfter: target.currentHP,
      usesRemaining: spell.usesRemaining ?? null,
      decisionReason: proposal.reason ?? null
    };
  }

  // Heal ability (design doc §14k): the Mystic's real Transfer Vitality — "you can transfer up to
  // N Hit Points... into yourself or a bonded creature," no roll at all, unlike Field Repair's
  // Crafting check. usesRemaining stands in for the ability's real vitality-network pool (a
  // separate regenerating resource this single-encounter simulator doesn't track HP-for-HP — see
  // combatants.mjs's own note on the simplification).
  if (proposal.type === "healAbility") {
    const target = state.combatants.get(proposal.targetId);
    const targetPos = state.positions.get(proposal.targetId);
    const ability = combatant.healAbilities[proposal.abilityIndex ?? 0];

    const check = checkHealAbilityLegal({ healer: combatant, healerPos: pos, target, targetPos, ability, turnState: turnProgress });
    if (!check.legal) return { type: "healAbility", targetId: proposal.targetId, legal: false, reason: check.reason };

    const healing = ability.healingAmount ?? 0;
    target.currentHP = Math.min(target.maxHP, target.currentHP + healing);
    turnProgress.actionsUsed += ability.actions ?? 1;

    if (ability.usesRemaining != null) ability.usesRemaining -= 1;

    return {
      type: "healAbility",
      abilityName: ability.name,
      targetId: proposal.targetId,
      legal: true,
      actionsCost: ability.actions ?? 1,
      healing,
      targetHPAfter: target.currentHP,
      usesRemaining: ability.usesRemaining ?? null,
      decisionReason: proposal.reason ?? null
    };
  }

  if (proposal.type === "repair") {
    const target = state.combatants.get(proposal.targetId);
    const targetPos = state.positions.get(proposal.targetId);

    const check = checkFieldRepairLegal({ repairer: combatant, repairerPos: pos, target, targetPos, turnState: turnProgress });
    if (!check.legal) return { type: "repair", targetId: proposal.targetId, legal: false, reason: check.reason };

    const repairResult = resolveFieldRepair(rng, { repairBonus: combatant.repairBonus, handlingDC: combatant.handlingDC });
    if (repairResult.healing > 0) {
      target.currentHP = Math.min(target.maxHP, target.currentHP + repairResult.healing);
    }
    turnProgress.actionsUsed += 2;

    return {
      type: "repair",
      targetId: proposal.targetId,
      legal: true,
      actionsCost: 2,
      roll: repairResult,
      targetHPAfter: target.currentHP,
      decisionReason: proposal.reason ?? null
    };
  }

  if (proposal.type === "spot") {
    const target = state.combatants.get(proposal.targetId);
    const check = checkSpotLegal({ spotter: combatant, target, turnState: turnProgress });
    if (!check.legal) return { type: "spot", targetId: proposal.targetId, legal: false, reason: check.reason };

    target.spotted = true;
    turnProgress.actionsUsed += 1;

    return { type: "spot", targetId: proposal.targetId, targetName: target.name, legal: true, actionsCost: 1, decisionReason: proposal.reason ?? null };
  }

  if (proposal.type === "evacuate") {
    const oppositionPositions = [...state.combatants.values()]
      .filter((c) => c.side !== combatant.side && c.currentHP > 0)
      .map((c) => state.positions.get(c.id));

    const check = checkEvacuateLegal({ evacuator: combatant, evacuatorPos: pos, oppositionPositions, turnState: turnProgress });
    if (!check.legal) return { type: "evacuate", legal: false, reason: check.reason };

    const evac = resolveEvacuation(rng);
    turnProgress.actionsUsed += 2;

    return { type: "evacuate", legal: true, actionsCost: 2, civilians: evac.civilians, roll: evac.rolls, decisionReason: proposal.reason ?? null };
  }

  if (proposal.type === "advance") {
    // The Claimant's Advance: a scripted 2-action move toward a fixed objective point, ignoring
    // occupied-square blocking (it doesn't path around the party the way a normal Move does — it
    // walks through/into whatever's in the way, which is exactly why standing in front of it
    // provokes Claim). That occupancy bypass is intentional design.
    //
    // FIX (adversarial workflow, 2026-08-22, two independent agents): everything else about this
    // branch was NOT intentional — it used a flat "5ft per diagonal square" distance model instead
    // of the real 5-10-5 rule (letting it cover up to 1.5x its actual Speed), never checked
    // isInBounds (letting it walk off the map), and never added its travel to turnLog.feetMoved
    // (letting a follow-up ordinary "move" stack a second full Speed budget on top in the same
    // turn). All three are fixed by walking the path one square at a time using the same
    // distanceFeet/isInBounds machinery ordinary movement uses, and by charging feetMoved for real.
    const budgetCheck = checkActionBudget(turnProgress, 2);
    if (!budgetCheck.legal) return { type: "advance", legal: false, reason: `Not enough actions for Advance (needs 2, ${turnProgress.actionsAvailable - turnProgress.actionsUsed} remain).` };

    const dx = Math.sign(proposal.towards.col - pos.col);
    const dy = Math.sign(proposal.towards.row - pos.row);
    let next = { ...pos };
    if (dx !== 0 || dy !== 0) {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const candidate = { col: next.col + dx, row: next.row + dy };
        if (!isInBounds(candidate, state.gridSize)) break; // stop at the map edge, same as an ordinary move would be
        if (distanceFeet(pos, candidate) > effective.speed) break; // stop at the real (5-10-5) Speed budget
        next = candidate;
        if (candidate.col === proposal.towards.col && candidate.row === proposal.towards.row) break; // reached the objective
      }
    }
    const traveled = distanceFeet(pos, next);
    state.positions.set(combatantId, next);
    turnProgress.feetMoved += traveled; // now correctly shared with any later "move" proposal this same turn
    turnProgress.actionsUsed += 2;
    const result = { type: "advance", from: { ...pos }, to: { ...next }, feet: traveled, legal: true, actionsCost: 2, decisionReason: proposal.reason ?? null };
    const reactions = checkReactionTriggers({ state, rng, moverId: combatantId });
    if (reactions.length) result.triggeredReactions = reactions;
    return result;
  }

  return { type: proposal.type, legal: false, reason: `Unknown action type "${proposal.type}".` };
}

/**
 * After any move, check whether the mover just ended adjacent to a
 * creature with a matching reaction ability (the Claimant's Claim).
 * Reactions don't consume the mover's turn actions, and each reactor may
 * only use its reaction once per round.
 */
function checkReactionTriggers({ state, rng, moverId }) {
  const mover = state.combatants.get(moverId);
  const moverPos = state.positions.get(moverId);
  const triggered = [];

  for (const [reactorId, reactor] of state.combatants) {
    // FIX (adversarial workflow, 2026-08-22): if an earlier reactor in this same batch already
    // dropped the mover to 0 HP, checkTargetAlive would refuse a NEW ordinary Strike against it —
    // a second reactor's Claim must be held to the same standard, not allowed to "hit" a corpse.
    if (!checkTargetAlive(mover).legal) break;
    if (reactorId === moverId) continue;
    if (!reactor.reactions?.length) continue;
    if (reactor.currentHP <= 0 || !state.reactionAvailable.get(reactorId)) continue;
    const reactorPos = state.positions.get(reactorId);
    if (!isAdjacent(moverPos, reactorPos)) continue;
    if (!(mover.size === "large" || mover.size === "huge" || mover.size === "gargantuan")) continue; // reaction trigger requires Large+

    const reaction = reactor.reactions[0]; // this scenario only ever has one (Claim)
    const strike = reactor.strikes[reaction.strikeIndex ?? 0];
    const targetEffective = resolveEffectiveStats(mover);
    const strikeResult = resolveStrike(rng, { attacker: reactor, strike, targetAc: targetEffective.ac, mapPenalty: 0 });
    const { appliedDamage } = applyStrikeDamage(strikeResult, mover, targetEffective, strike); // shared path — see applyStrikeDamage's doc comment
    state.reactionAvailable.set(reactorId, false);
    triggered.push({ reactorId, reactionName: reaction.name, roll: strikeResult, damageApplied: appliedDamage, targetHPAfter: mover.currentHP });
  }
  return triggered;
}

/**
 * A full, self-contained snapshot of every combatant's position/HP/damage
 * state at this exact point in the battle — computed once, server-side,
 * so the artifact viewer never has to replay action deltas client-side to
 * reconstruct "what did the board look like after this turn." Single
 * source of truth for the scrubber UI.
 */
function snapshotState(state) {
  const snapshot = {};
  for (const [id, combatant] of state.combatants) {
    const pos = state.positions.get(id);
    const effective = resolveEffectiveStats(combatant);
    snapshot[id] = {
      position: { ...pos },
      currentHP: combatant.currentHP,
      maxHP: combatant.maxHP,
      damageState: effective.damageState,
      stunnedRounds: combatant.stunnedRounds ?? 0
    };
  }
  return snapshot;
}

/**
 * REGRESSION FOUND 2026-08-22 running a 20-seed statistical check right after §14g's Claimant
 * rework: when the ground-layer roll fails to break the Interdiction Field within its fixed
 * 3-round window (ground-layer/resolve-ground-layer.mjs's ROUNDS=3 — a real, designed possible
 * outcome, "including the real possibility it never breaks"), the field can structurally never
 * break for the rest of THIS encounter either — no scriptedEvent is left that could ever change
 * it. Before the Claimant had a working proactive Strike, that just meant a slow, harmless
 * stand-off. After §14g's fix, it meant 13 of 20 seeds ground out the remaining 5 rounds as
 * pure one-sided punishment: the Claimant landing real Strikes every round it could, the party
 * mechanically unable to deal ANY damage back, all the way to a generic "timeout" that looked
 * identical in the log to an ordinary long fight. That's not "the players end up scared" — it's
 * the party having no agency at all, which is a worse failure mode than the drama problem this
 * whole section exists to fix. Detected and reported as its own distinct outcome the moment it
 * becomes true, rather than grinding out rounds that can no longer produce a different result.
 */
function checkOutcome(state, scenario) {
  const opposition = [...state.combatants.values()].filter((c) => c.side === "opposition");
  const party = [...state.combatants.values()].filter((c) => c.side === "party");

  if (opposition.every((c) => c.currentHP <= 0)) {
    return { result: "party-victory", detail: "All opposition combatants reduced to 0 HP." };
  }
  if (party.every((c) => c.currentHP <= 0)) {
    return { result: "party-defeat", detail: "All party combatants reduced to 0 HP." };
  }

  // FIX, same investigation: when the ground team's roll fails outright (fieldBreaksAtRound
  // null), scenario.scriptedEvents is empty from ROUND 1, not "empty because round 3 already
  // passed" — a naive "no future events remain" check fired the stalemate before the ground
  // team's real 3-round window had even played out in-fiction, which is both factually wrong
  // (nobody at the table would know it's a lost cause that early) and undersells the real
  // tension of watching those first rounds. scenario.stalemateNotBeforeRound (optional; a
  // scenario builder sets it from its own domain knowledge — e.g. the ground layer's fixed
  // ROUNDS=3 bound) gates how early this check is even allowed to fire.
  const notBeforeRound = scenario.stalemateNotBeforeRound ?? 0;
  const noFutureScriptedEvents = !scenario.scriptedEvents || Object.keys(scenario.scriptedEvents).every((round) => Number(round) <= state.round);
  if (state.round >= notBeforeRound && noFutureScriptedEvents && opposition.length > 0 && opposition.every((c) => c.immuneToAllDamage)) {
    return {
      result: "stalemate",
      detail: "Every living opposition combatant remains immune to all damage with no scripted event left that could ever change that — a mechanical dead end (the ground team's field-break window closed without success), not a party failure or a fight either side could still turn around."
    };
  }

  return null;
}
