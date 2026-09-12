/**
 * TACTICAL QUALITY METRICS (design doc §17) — "is this AI playing *well*?", as distinct from
 * analysis/metrics.mjs's "is this AI *doing anything*?" and action-utilization.mjs's "did it
 * spend its actions?".
 *
 * WHY A THIRD METRICS MODULE. The existing two answer necessary-but-weak questions. A bot that
 * picks a uniformly random legal action every time scores ~100% utilization, high verb diversity,
 * and high decision entropy — it would pass every existing metric while playing terribly. That
 * gap is exactly what let §16's evaluator bug (declining to finish off a 7-HP enemy in reach)
 * survive a green test suite: nothing measured *quality of choice*, only *presence of choice*.
 *
 * THE DESIGN RULE EVERY METRIC HERE FOLLOWS: each one must have a clearly-defined BROKEN POLE —
 * a specific, nameable way a real tactical AI fails, which this number detects. A metric with no
 * broken pole is a vanity metric. Stated per-metric below.
 *
 * AND THE CRITICAL VALIDATION STEP: these instruments are themselves calibrated against
 * deliberately-bad baseline bots (ai/baselines.mjs). If "attack the nearest thing, always" scores
 * the same as the real AI on a metric, then either the AI is no better than trivial or the metric
 * cannot see the difference — either finding is worth having, and neither is visible without the
 * baseline. Never trust one of these numbers in isolation before checking what the baselines score.
 *
 * Pure functions over a completed battle log, same contract as metrics.mjs. No RNG, no I/O.
 */

import { hasCover } from "../engine/terrain.mjs";

/** Every logged action across a battle, flattened with its round/actor context. */
function flatActions(log) {
  const out = [];
  for (const round of log.rounds ?? []) {
    for (const turn of round.turns ?? []) {
      (turn.actions ?? []).forEach((action, indexInTurn) => {
        out.push({ round: round.round, actorId: turn.combatantId, indexInTurn, action, turn });
      });
    }
  }
  return out;
}

// REGRESSION (design doc §39, found while adding coverUsageStats below, not by inspection): this
// set predates personnel-engine's saveAttack (§22) and areaAttack (§38) action types entirely — a
// combatant whose real damage comes from a thrown grenade (saveAttack) was invisible to focus-fire
// and threat-priority tracking, silently undercounting exactly the kind of attack these metrics
// exist to watch. saveAttack fits the same single-target `targetId`/`roll` shape as strike/
// spellAttack and is added here; areaAttack is deliberately NOT added — it has no single `targetId`
// at all (an `originId` plus a multi-target `affected[]` array instead), so every function below
// that keys off `action.targetId` would silently treat it as a no-op regardless, and forcing it in
// would only invite a future reader to assume it's handled when it structurally can't be.
const ATTACK_TYPES = new Set(["strike", "spellAttack", "saveAttack"]);

/**
 * Which roster array + logged name field a given action `type` maps to (design doc §78, GH #57).
 * Reactions are deliberately NOT here — a fired reaction is logged inside its MOVER's own action
 * (keyed by the reactor, not the actor) rather than as its own top-level typed action, so it doesn't
 * fit this type->field table at all. Every caller that wants full "all 7 declared-ability arrays"
 * coverage adds `"reactions"` back explicitly (see resourceUseStats/abilityCoverageStats below).
 */
export const ABILITY_TYPES = [
  { type: "strike", nameField: "strikeName", rosterKey: "strikes" },
  { type: "spellAttack", nameField: "spellName", rosterKey: "spells" },
  { type: "healAbility", nameField: "abilityName", rosterKey: "healAbilities" },
  { type: "saveAttack", nameField: "saveAttackName", rosterKey: "saveAttacks" },
  { type: "conditionSave", nameField: "conditionSaveName", rosterKey: "conditionSaves" },
  { type: "areaAttack", nameField: "areaAttackName", rosterKey: "areaAttacks" }
];
const ABILITY_TYPE_BY_ACTION_TYPE = new Map(ABILITY_TYPES.map((t) => [t.type, t]));

/**
 * Every real (legal) execution of a declared, named ability across the whole log — the six named
 * action types above, plus both scales' own reaction-fired-strike shape (GH #18 personnel / Frame's
 * own Claim). One row per execution, not per action.
 *
 * Reactions are logged inside the MOVER's action, keyed by the REACTOR, not the actor. Frame's own
 * entry carries the reaction's own name directly (`reactionName` — a Claimant only ever has the one
 * hardcoded "Claim"). Personnel's entry carries the WEAPON it struck with (`strikeName`) instead —
 * the reaction itself has no name field on the log entry — because flanking.mjs's `hasReactiveStrike`
 * gates firing on an exact `r.name === "Reactive Strike"` match, so that is the only declared ability
 * a personnel-scale fired-reaction entry can ever mean (confirmed directly against that gate, not
 * assumed). `action.reactions ?? action.triggeredReactions`: never both on one action — the two
 * engines never share a log — so this is a safe union, not an ambiguous one.
 */
function abilityExecutions(log) {
  const out = [];
  for (const { round, actorId, action } of flatActions(log)) {
    if (action.legal === false) continue;
    const spec = ABILITY_TYPE_BY_ACTION_TYPE.get(action.type);
    if (spec) {
      const name = action[spec.nameField];
      if (name != null) out.push({ ownerId: actorId, rosterKey: spec.rosterKey, name, round });
    }
    for (const reaction of action.reactions ?? action.triggeredReactions ?? []) {
      const name = reaction.reactionName ?? "Reactive Strike";
      out.push({ ownerId: reaction.reactorId, rosterKey: "reactions", name, round });
    }
  }
  return out;
}

/**
 * FOCUS FIRE — does the AI concentrate damage, or smear it across every enemy at once?
 *
 * BROKEN POLE: damage spreading. Splitting attacks across three healthy enemies instead of
 * killing one leaves all three alive and attacking back, so the party absorbs the same total
 * incoming damage for strictly longer. This is one of the most common and most costly mistakes
 * in real PF2e/SF2e play, and it is exactly what a "pick a random legal target" policy produces.
 *
 * MEASURED AS: mid-turn target switches while the previous target was still alive. Switching
 * after a kill is correct and is not counted. Note SF2E's multiple attack penalty applies per
 * turn regardless of target, so switching costs no accuracy — the case for focus fire here is
 * purely action-denial, which is why an evaluator has to be *taught* it (weights.actionDenial)
 * rather than getting it free from the rules.
 */
export function focusFireStats(log) {
  let switchesWithTargetAlive = 0;
  let consecutiveAttackPairs = 0;

  for (const round of log.rounds ?? []) {
    for (const turn of round.turns ?? []) {
      const attacks = (turn.actions ?? []).filter((a) => a.legal !== false && ATTACK_TYPES.has(a.type) && a.targetId);
      for (let i = 1; i < attacks.length; i++) {
        const prev = attacks[i - 1];
        const cur = attacks[i];
        consecutiveAttackPairs += 1;
        // targetHPAfter is logged on the attack itself — the authoritative "was it still alive
        // when I chose my next action", with no need to re-derive HP from a snapshot.
        const prevTargetSurvived = (prev.targetHPAfter ?? 0) > 0;
        if (prevTargetSurvived && cur.targetId !== prev.targetId) switchesWithTargetAlive += 1;
      }
    }
  }

  return {
    consecutiveAttackPairs,
    switchesWithTargetAlive,
    // 0 = perfect focus fire; 1 = switches target on every single follow-up attack.
    switchRate: consecutiveAttackPairs > 0 ? switchesWithTargetAlive / consecutiveAttackPairs : 0
  };
}

/**
 * MULTIPLE ATTACK PENALTY DISCIPLINE — does the AI understand that its third swing is nearly
 * worthless against a high-AC target?
 *
 * BROKEN POLE: MAP abuse. SF2E's MAP is -5 on the second attack and -10 on the third. Against a
 * level-appropriate boss (AC 33 vs a +25 attack), that third attack hits on a natural 18+ — a 15%
 * chance — while the same action spent on Spot, repositioning, or an ability is often worth
 * strictly more. An AI that always burns all three actions on attacks looks busy (100%
 * utilization!) while making its worst available play every round.
 *
 * MEASURED AS: the distribution of attacks by MAP tier, plus the realised hit rate at each tier.
 * There is no single "correct" third-attack rate — it depends entirely on target AC and what else
 * was available — so this reports the shape rather than asserting a threshold. What it makes
 * visible is the *difference* between scenarios: a disciplined AI should take proportionally
 * fewer third attacks against a high-AC boss than against a low-AC swarm.
 */
export function mapDisciplineStats(log) {
  const tiers = { 0: { attempts: 0, hits: 0 }, 5: { attempts: 0, hits: 0 }, 10: { attempts: 0, hits: 0 } };
  for (const { action } of flatActions(log)) {
    if (action.legal === false || !ATTACK_TYPES.has(action.type) || !action.roll) continue;
    const penalty = Math.abs(action.roll.mapPenalty ?? 0);
    const tier = tiers[penalty];
    if (!tier) continue;
    tier.attempts += 1;
    if (action.roll.degree === "success" || action.roll.degree === "criticalSuccess") tier.hits += 1;
  }
  const total = Object.values(tiers).reduce((s, t) => s + t.attempts, 0);
  return {
    byPenalty: Object.fromEntries(Object.entries(tiers).map(([p, t]) => [p, { ...t, hitRate: t.attempts ? t.hits / t.attempts : null }])),
    totalAttacks: total,
    // Share of all attacks taken at the worst tier — the headline number for "is it swinging wildly".
    thirdAttackShare: total > 0 ? tiers[10].attempts / total : 0
  };
}

/**
 * OSCILLATION / DITHERING — does a combatant walk in circles?
 *
 * BROKEN POLE: the classic utility-AI exploit, and one this project has hit for real twice
 * (design doc §14i and §15q, the latter an infinite four-round position cycle that timed out
 * every seed). A positional term that pays for movement in both directions lets a unit farm score
 * forever by pacing. Potential-based evaluation is supposed to make a round trip net exactly zero;
 * this metric is the empirical check that it actually does.
 *
 * MEASURED AS: per combatant, how many DISTINCT cells it stood on versus how many position changes
 * it made, and the worst single-cell revisit count. A unit that moves 12 times across 3 cells is
 * pacing; a unit that moves 12 times across 11 cells is travelling.
 */
export function oscillationStats(log) {
  const perCombatant = new Map();
  for (const round of log.rounds ?? []) {
    for (const turn of round.turns ?? []) {
      for (const action of turn.actions ?? []) {
        if (action.legal === false) continue;
        if (action.type !== "move" && action.type !== "step" && action.type !== "advance") continue;
        if (!action.to) continue;
        if (!perCombatant.has(turn.combatantId)) perCombatant.set(turn.combatantId, { moves: 0, cellVisits: new Map() });
        const rec = perCombatant.get(turn.combatantId);
        rec.moves += 1;
        const key = `${action.to.col},${action.to.row}`;
        rec.cellVisits.set(key, (rec.cellVisits.get(key) ?? 0) + 1);
      }
    }
  }

  const combatants = [...perCombatant.entries()].map(([id, rec]) => {
    const visits = [...rec.cellVisits.values()];
    return {
      id,
      moves: rec.moves,
      distinctCells: rec.cellVisits.size,
      worstRevisit: visits.length ? Math.max(...visits) : 0,
      // 1.0 = every move went somewhere new. Low = pacing between a few squares.
      explorationRatio: rec.moves > 0 ? rec.cellVisits.size / rec.moves : 1
    };
  }).sort((a, b) => a.explorationRatio - b.explorationRatio);

  return {
    combatants,
    worstExplorationRatio: combatants.length ? combatants[0].explorationRatio : 1,
    worstRevisit: combatants.length ? Math.max(...combatants.map((c) => c.worstRevisit)) : 0
  };
}

/**
 * LIMITED-RESOURCE USE — are one-shot weapons and abilities ever actually fired?
 *
 * BROKEN POLE: hoarding. state-value.mjs prices an unspent limited-use item at weights.resource
 * (3.0 HP-equivalent each), which is deliberate — spending your only rocket should require the
 * shot to be worth it — but a weight that is too high produces a vehicle that carries its
 * ordnance, unused, into a loss. The mirror-image failure (dumping everything on round 1 at a
 * full-health target) is equally real, which is why this reports WHEN as well as WHETHER.
 *
 * MEASURED AS: for every combatant that started with a limited-use option, whether it was ever
 * spent and in which round. Requires the roster to record usesPerEncounter (data/combatants.mjs
 * sets this alongside usesRemaining on exactly the limited options).
 *
 * FIX (design doc §78, GH #57): this used to scan only `strikes`/`spells`/`healAbilities` and match
 * executions via a bare `strikeName ?? spellName ?? abilityName` chain — silently blind to a limited
 * `saveAttack`/`conditionSave`/`areaAttack`/`reaction` (never observed in a real fixture yet, but a
 * real gap). Now sourced from the shared ABILITY_TYPES registry/abilityExecutions helper below,
 * covering all 7 declared-ability arrays.
 */
export function resourceUseStats(log) {
  const limited = new Map(); // "combatantId|rosterKey|optionName" -> { ownerId, name, spentRound }
  for (const [id, entry] of Object.entries(log.roster ?? {})) {
    for (const rosterKey of [...ABILITY_TYPES.map((t) => t.rosterKey), "reactions"]) {
      for (const option of entry[rosterKey] ?? []) {
        if (option.usesPerEncounter != null) limited.set(`${id}|${rosterKey}|${option.name}`, { ownerId: id, name: option.name, spentRound: null });
      }
    }
  }
  if (limited.size === 0) return { tracked: 0, spent: 0, spentRate: null, options: [] };

  for (const { ownerId, rosterKey, name, round } of abilityExecutions(log)) {
    const rec = limited.get(`${ownerId}|${rosterKey}|${name}`);
    if (rec && rec.spentRound === null) rec.spentRound = round;
  }

  const options = [...limited.values()];
  const spent = options.filter((o) => o.spentRound !== null).length;
  return { tracked: options.length, spent, spentRate: spent / options.length, options };
}

/**
 * THREAT PRIORITY — when enemies differ in how dangerous they are, does the AI attack the
 * dangerous ones, or just whatever is nearest?
 *
 * BROKEN POLE: target fixation / proximity bias. "Attack the closest thing" is the single most
 * common naive policy and is often badly wrong: a distant artillery piece killing an ally per
 * round matters far more than the adjacent chaff soaking hits. This is the metric the mixed-level
 * archetype exists to exercise.
 *
 * MEASURED AS: each opposition combatant's share of incoming attacks, alongside its threat rating
 * (best single-strike expected damage, taken straight off the roster's own stat block). Reported
 * as a rank correlation between the two — +1 means attacks went to the most dangerous enemies
 * first, 0 means target choice was unrelated to danger, negative means it actively preferred the
 * harmless ones. Deliberately NOT asserted as a hard threshold anywhere: correct play sometimes
 * means finishing a nearly-dead weak enemy over a healthy dangerous one, so this is a distribution
 * to read, not a pass/fail gate.
 */
export function threatPriorityStats(log, { side = "party" } = {}) {
  const roster = log.roster ?? {};
  const targets = new Map();
  for (const [id, entry] of Object.entries(roster)) {
    if (entry.side === side) continue;
    const strikes = entry.strikes ?? [];
    let threat = 0;
    for (const s of strikes) {
      const dice = s.damage?.[0];
      if (!dice) continue;
      const [count, faces] = String(dice.dice ?? "0d0").split("d").map(Number);
      const avg = (count * (faces + 1)) / 2 + (dice.bonus ?? 0);
      if (avg > threat) threat = avg;
    }
    targets.set(id, { id, threat, attacksReceived: 0 });
  }

  for (const { actorId, action } of flatActions(log)) {
    if (action.legal === false || !ATTACK_TYPES.has(action.type)) continue;
    if (roster[actorId]?.side !== side) continue;
    const rec = targets.get(action.targetId);
    if (rec) rec.attacksReceived += 1;
  }

  const rows = [...targets.values()];
  const totalAttacks = rows.reduce((s, r) => s + r.attacksReceived, 0);
  for (const r of rows) r.attackShare = totalAttacks > 0 ? r.attacksReceived / totalAttacks : 0;

  return { totalAttacks, targets: rows.sort((a, b) => b.threat - a.threat), threatAttackCorrelation: spearman(rows.map((r) => r.threat), rows.map((r) => r.attacksReceived)) };
}

/** Spearman rank correlation. Returns null when undefined (fewer than 2 points, or no variance). */
export function spearman(xs, ys) {
  if (xs.length < 2) return null;
  const rank = (values) => {
    const sorted = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array(values.length);
    let i = 0;
    while (i < sorted.length) {
      let j = i;
      while (j + 1 < sorted.length && sorted[j + 1].v === sorted[i].v) j++;
      const avgRank = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) ranks[sorted[k].i] = avgRank;
      i = j + 1;
    }
    return ranks;
  };
  const rx = rank(xs), ry = rank(ys);
  const n = xs.length;
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const mx = mean(rx), my = mean(ry);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (rx[i] - mx) * (ry[i] - my);
    dx += (rx[i] - mx) ** 2;
    dy += (ry[i] - my) ** 2;
  }
  if (dx === 0 || dy === 0) return null; // no variance in one series — correlation undefined, not zero
  return num / Math.sqrt(dx * dy);
}

/**
 * ENGAGEMENT — did the fight actually start, and how fast?
 *
 * BROKEN POLE: passivity/kiting. §15k documented a measured instance of exactly this: pricing
 * incoming threat symmetrically with outgoing damage produced a party that rationally refused to
 * ever approach, collapsing victories from 61/80 to 13/80 while every other metric looked healthy.
 * "Round of first blood" is the cheapest possible detector for that whole failure family.
 */
export function engagementStats(log) {
  let firstDamageRound = null;
  let totalDamage = 0;
  for (const { round, action } of flatActions(log)) {
    if (action.legal === false) continue;
    const dmg = action.damageApplied ?? 0;
    if (dmg > 0) {
      totalDamage += dmg;
      if (firstDamageRound === null) firstDamageRound = round;
    }
    // FIX (design doc §78, GH #57): `triggeredReactions` is Frame scale's own field name
    // (engine/engine.mjs's checkReactionTriggers) — personnel scale logs the identical concept under
    // `reactions` (personnel-engine/engine.mjs's move branch, GH #18), which this used to miss
    // entirely, silently undercounting real reaction damage for every personnel-scale battle.
    for (const reaction of action.reactions ?? action.triggeredReactions ?? []) {
      const rdmg = reaction.damageApplied ?? 0;
      if (rdmg > 0) {
        totalDamage += rdmg;
        if (firstDamageRound === null) firstDamageRound = round;
      }
    }
  }
  return { firstDamageRound, totalDamage, rounds: (log.rounds ?? []).length };
}

/**
 * SIDE OUTCOME — how badly did one side actually get hurt, by the end?
 *
 * BROKEN POLE: none named — this isn't a quality detector like the metrics above, it's the raw
 * severity signal design doc §39 asked for directly: "track both end HP and HP damaged/healed" as
 * the basis for comparing how dangerous different XP budgets actually turn out to be. Every other
 * metric in this file answers "is the AI playing well"; this one answers "how much did this side
 * suffer", which only means something once compared ACROSS a real seed sweep at different
 * difficulties (see `analysis/xp-budget-battery.mjs`) — a single run's numbers here are close to
 * meaningless on their own, same as one d20 roll says nothing about a character's real bonus.
 *
 * MEASURED AS: summed real, already-logged per-target numbers (damageApplied/appliedDamage,
 * healing, targetHPAfter) for every combatant on `side` — never re-simulated, never estimated.
 * `finalHP` is read from the LATEST targetHPAfter seen for each combatant (chronological scan,
 * so a later heal correctly overwrites an earlier hit) and defaults to full `maxHP` for anyone
 * never targeted at all, which is exactly the real starting/ending state for a combatant nobody
 * ever touched.
 */
export function sideOutcomeStats(log, side) {
  const roster = log.roster ?? {};
  const ids = new Set(Object.keys(roster).filter((id) => roster[id]?.side === side));
  const finalHP = new Map([...ids].map((id) => [id, roster[id].maxHP ?? 0]));
  let damageTaken = 0;
  let healingReceived = 0;

  for (const { actorId, action } of flatActions(log)) {
    if (action.legal === false) continue;
    if (action.targetId && ids.has(action.targetId)) {
      if (typeof action.damageApplied === "number") damageTaken += action.damageApplied;
      if (typeof action.healing === "number") healingReceived += action.healing;
      if (typeof action.targetHPAfter === "number") finalHP.set(action.targetId, action.targetHPAfter);
    }
    // areaAttack (design doc §38): multi-target, no single targetId — each affected entry carries
    // its own appliedDamage/targetHPAfter, same shape as a single-target hit, just plural.
    for (const affected of action.affected ?? []) {
      if (!ids.has(affected.targetId)) continue;
      if (typeof affected.appliedDamage === "number") damageTaken += affected.appliedDamage;
      if (typeof affected.targetHPAfter === "number") finalHP.set(affected.targetId, affected.targetHPAfter);
    }
    // FIX (design doc §78-adjacent, GH #57/#69 investigation): a fired reaction (GH #18 personnel /
    // Frame's own Claim) is logged inside the MOVER's own action (`reactions`/`triggeredReactions`),
    // with no targetId field at all on the reaction entry — the implicit target is always the mover
    // (`actorId` here). engagementStats/resourceUseStats/abilityExecutions already got this exact
    // fix; this function never did, so a real Reactive Strike's damage was silently invisible here,
    // diverging from the live simulation's own turn.snapshot HP.
    if (ids.has(actorId)) {
      for (const reaction of action.reactions ?? action.triggeredReactions ?? []) {
        if (typeof reaction.damageApplied === "number") damageTaken += reaction.damageApplied;
        if (typeof reaction.targetHPAfter === "number") finalHP.set(actorId, reaction.targetHPAfter);
      }
    }
  }

  const maxHP = [...ids].reduce((sum, id) => sum + (roster[id].maxHP ?? 0), 0);
  const finalHPTotal = [...finalHP.values()].reduce((sum, hp) => sum + hp, 0);
  return {
    side,
    maxHP,
    finalHP: finalHPTotal,
    finalHPFraction: maxHP > 0 ? finalHPTotal / maxHP : 1,
    damageTaken,
    healingReceived,
    perCombatant: [...ids].map((id) => ({ id, maxHP: roster[id].maxHP ?? 0, finalHP: finalHP.get(id) }))
  };
}

/**
 * COVER DISCIPLINE — does the AI actually use cover, in a real gunfight?
 *
 * BROKEN POLE: standing in the open. Design doc §26 gave the evaluator a real, if quiet, mechanism
 * for pricing a covered position (state-value.mjs's bestExpectedDamage folds hasCover's +2 AC/
 * Reflex into threatExposure) and §27 gave decide.mjs a real candidate that PROPOSES one — but "the
 * machinery exists" and "it actually fires in real fights" are different claims, and design doc §39
 * asked directly: "Does the cover mechanic actually work rules as written? Are the participants
 * actually using it?" This is the measured answer, not a guess.
 *
 * MEASURED AS TWO SEPARATE RATES, deliberately not blended into one number — they catch different
 * failures:
 *  - `moveIntoCoverRate` — of every move this combatant makes, what fraction lands somewhere with
 *    real cover (the identical hasCover geometric check the engine itself uses) from at least one
 *    LIVING enemy. Catches an AI that never seeks cover at all.
 *  - `attackFromCoverRate` — of every ranged attack-roll/save, what fraction was thrown from a
 *    position that already had cover from ITS OWN target. Catches the narrower but more telling
 *    failure of seeking cover once, then walking back into the open to shoot. hasCover(a,b) is
 *    symmetric — a wall segment blocks the line between two points the same way from either end,
 *    confirmed directly against its own implementation (`segmentsIntersect` doesn't care about
 *    direction) — so the SAME `coverBonus` field strike/spellAttack/saveAttack already log (a real
 *    AC/Reflex bonus the TARGET gets from the attacker's own line) is, read from the other side,
 *    exactly "was the attacker also covered." No new engine computation needed here — one field is
 *    read straight from the log, the other is recomputed post-hoc from the exact same real function.
 *
 * areaAttack is deliberately excluded from attackFromCoverRate for the same structural reason
 * ATTACK_TYPES excludes it above: no single attacker-target line, no logged coverBonus to read.
 * Melee strikes are excluded too — cover-from-a-wall between two ADJACENT combatants isn't the
 * question this metric is answering; `strikeType` lives on the roster's own strike definition, not
 * the logged action, so a melee Strike is identified by looking that up, not guessed from traits.
 */
export function coverUsageStats(log) {
  const roster = log.roster ?? {};
  const walls = log.walls ?? [];
  const perCombatant = new Map();
  const recordFor = (id) => {
    if (!perCombatant.has(id)) perCombatant.set(id, { movesTotal: 0, movesIntoCover: 0, attacksTotal: 0, attacksFromCover: 0 });
    return perCombatant.get(id);
  };

  for (const round of log.rounds ?? []) {
    for (const turn of round.turns ?? []) {
      const moverSide = roster[turn.combatantId]?.side;
      // Enemy positions as of THIS turn's own end-of-turn snapshot — nobody else moves mid-turn, so
      // this is exact, not an approximation, and deliberately TRUE positions (this is after-the-fact
      // analysis of a finished battle, not an AI decision — the belief/omniscience split that governs
      // decide.mjs's own candidate generation has no bearing on measuring what actually happened).
      const enemyPositions = Object.entries(turn.snapshot ?? {})
        .filter(([id, s]) => roster[id] && roster[id].side !== moverSide && s.currentHP > 0)
        .map(([, s]) => s.position);

      for (const action of turn.actions ?? []) {
        if (action.legal === false) continue;

        if ((action.type === "move" || action.type === "step" || action.type === "advance") && action.to) {
          const rec = recordFor(turn.combatantId);
          rec.movesTotal += 1;
          if (enemyPositions.some((ePos) => hasCover(action.to, ePos, walls))) rec.movesIntoCover += 1;
        }

        if (["strike", "spellAttack", "saveAttack"].includes(action.type) && typeof action.coverBonus === "number") {
          if (action.type === "strike") {
            const strikeDef = roster[turn.combatantId]?.strikes?.find((s) => s.name === action.strikeName);
            if (strikeDef?.strikeType !== "ranged") continue; // melee — not the question this metric answers
          }
          const rec = recordFor(turn.combatantId);
          rec.attacksTotal += 1;
          if (action.coverBonus > 0) rec.attacksFromCover += 1;
        }
      }
    }
  }

  const combatants = [...perCombatant.entries()].map(([id, rec]) => ({
    id,
    ...rec,
    moveIntoCoverRate: rec.movesTotal > 0 ? rec.movesIntoCover / rec.movesTotal : null,
    attackFromCoverRate: rec.attacksTotal > 0 ? rec.attacksFromCover / rec.attacksTotal : null
  }));

  const totals = combatants.reduce((acc, c) => ({
    movesTotal: acc.movesTotal + c.movesTotal, movesIntoCover: acc.movesIntoCover + c.movesIntoCover,
    attacksTotal: acc.attacksTotal + c.attacksTotal, attacksFromCover: acc.attacksFromCover + c.attacksFromCover
  }), { movesTotal: 0, movesIntoCover: 0, attacksTotal: 0, attacksFromCover: 0 });

  return {
    combatants,
    moveIntoCoverRate: totals.movesTotal > 0 ? totals.movesIntoCover / totals.movesTotal : null,
    attackFromCoverRate: totals.attacksTotal > 0 ? totals.attacksFromCover / totals.attacksTotal : null,
    ...totals
  };
}

/**
 * MANEUVER CONVERSION — design doc §43 (Stage 2's tactical-planning report, its own explicit ask:
 * "usage rate alone is not evidence of intent — the question is whether an ally actually CASHED IN
 * on the setup before it expired"). The direct analogue of coverUsageStats above, for Trip/Grapple
 * specifically.
 *
 * BROKEN POLE: hollow maneuver use. "The AI Trips things" (a nonzero usage rate) is compatible with
 * an AI that Trips an enemy and then never follows up before it stands back up — exactly what the
 * evaluator's own §42 monotonicity fixes made cheap enough to attempt opportunistically even when
 * nothing capitalizes on it. This metric is what distinguishes that from real setup-and-strike play.
 *
 * MEASURED AS: for every SUCCESSFUL Trip (targetProneAfter) or Grapple (targetGrappledAfter) in the
 * log, scan forward through the whole battle's real chronological action order for the first of:
 * (a) a real attack-roll action (strike/spellAttack/saveAttack, from ANYONE on the maneuvering
 * side — matches design doc §42's own setupValue framing, "an ally still to act" capitalizing
 * counts) against the SAME target → CONVERTED; (b) the target's own condition-clearing action
 * (Stand for Trip, a successful Escape for Grapple) → the window closed unconverted; (c) Grapple's
 * own real, already-logged `expiresEndOfRound` timer passing → natural expiry, unconverted; (d) the
 * end of the log → never converted. Both stopping conditions are read straight off data the engine
 * already logs, not re-derived or approximated — this is exact within the battle it measures, not a
 * heuristic.
 *
 * Shove is deliberately excluded: it has no persistent condition and no equivalent "am I still
 * benefiting from this" question a later attack roll can answer — a repositioned target isn't easier
 * to hit BECAUSE it was shoved, so crediting a later attack against it as a "conversion" the same way
 * Trip/Grapple's real off-guard bonus is would misattribute an unrelated hit, not measure the thing
 * this metric exists to catch.
 */
export function maneuverConversionStats(log) {
  const roster = log.roster ?? {};
  const flat = flatActions(log);
  const attempts = [];

  flat.forEach((entry, index) => {
    const { action } = entry;
    if (action.legal === false) return;
    if (action.type === "trip" && action.targetProneAfter) {
      attempts.push({ type: "trip", targetId: action.targetId, actorSide: roster[entry.actorId]?.side, appliedIndex: index });
    }
    if (action.type === "grapple" && action.targetGrappledAfter) {
      attempts.push({ type: "grapple", targetId: action.targetId, actorSide: roster[entry.actorId]?.side, appliedIndex: index, expiresEndOfRound: action.targetGrappledAfter.expiresEndOfRound ?? null });
    }
  });

  for (const attempt of attempts) {
    attempt.converted = false;
    for (let i = attempt.appliedIndex + 1; i < flat.length; i++) {
      const later = flat[i];
      if (later.action.legal === false) continue;
      if (attempt.type === "grapple" && attempt.expiresEndOfRound != null && later.round > attempt.expiresEndOfRound) break;
      if (later.actorId === attempt.targetId) {
        if (attempt.type === "trip" && later.action.type === "stand") break;
        if (attempt.type === "grapple" && later.action.type === "escape" && later.action.freed) break;
      }
      if (ATTACK_TYPES.has(later.action.type) && later.action.targetId === attempt.targetId && roster[later.actorId]?.side === attempt.actorSide) {
        attempt.converted = true;
        break;
      }
    }
  }

  const rate = (list) => (list.length ? list.filter((a) => a.converted).length / list.length : null);
  const summarize = (list) => ({ attempts: list.length, converted: list.filter((a) => a.converted).length, conversionRate: rate(list) });
  return {
    trip: summarize(attempts.filter((a) => a.type === "trip")),
    grapple: summarize(attempts.filter((a) => a.type === "grapple")),
    overall: summarize(attempts)
  };
}

/**
 * ABILITY COVERAGE (design doc §78, GH #57) — "we may also determine which abilities are never
 * used (that's a red flag...) and also which are perhaps over used (making sure... AI isn't using
 * something powerful too much and getting illegal victory points)" (Ingram, quoted in the issue).
 *
 * BROKEN POLE: two, not one. A ZERO is either an engine gap (never generated as a candidate) or an
 * evaluator blind spot (generated, never chosen) — this doesn't distinguish which, it just makes the
 * zero visible at all. An OVER-USE violation would mean a legality-gate regression let the AI spend
 * a resource beyond its declared cap — legality.mjs's own hasUses/spendUse already enforce this at
 * the point of casting, but this is the independent, log-based audit that doesn't just assume that
 * gate stays bug-free forever (GH #55/#56 were both exactly this failure mode, pre-telemetry).
 *
 * MEASURED AS: every declared ability across all 7 roster arrays (strikes/spells/healAbilities/
 * saveAttacks/conditionSaves/areaAttacks/reactions), diffed against real executions this battle.
 * Two resource shapes, both real: a simple per-ability `usesPerEncounter` cap (Transfer Vitality),
 * and GH #60's shared, combatant-level `slotRank`/`spellSlots` pool (Heal's three variants all draw
 * from the same rank-1 pool) — `roster[id].spellSlots` is already the reliable starting count (built
 * from the pre-battle combatant, a different, never-mutated object graph than the one the battle
 * actually simulates against — confirmed directly, not assumed). `unmatched` is a real invariant
 * check, not defensive dead code: a logged execution's name should always match something declared
 * (engine.mjs never invents a name), so a nonempty list here is itself exactly the kind of finding
 * this ticket was filed to surface.
 */
export function abilityCoverageStats(log) {
  const roster = log.roster ?? {};
  const declared = new Map(); // "ownerId|rosterKey|name" -> record
  for (const [id, entry] of Object.entries(roster)) {
    for (const rosterKey of [...ABILITY_TYPES.map((t) => t.rosterKey), "reactions"]) {
      for (const option of entry[rosterKey] ?? []) {
        declared.set(`${id}|${rosterKey}|${option.name}`, {
          ownerId: id, rosterKey, name: option.name,
          usesPerEncounter: option.usesPerEncounter ?? null,
          slotRank: option.slotRank ?? null,
          executions: 0
        });
      }
    }
  }

  const unmatched = [];
  for (const { ownerId, rosterKey, name, round } of abilityExecutions(log)) {
    const rec = declared.get(`${ownerId}|${rosterKey}|${name}`);
    if (rec) rec.executions += 1;
    else unmatched.push({ ownerId, rosterKey, name, round });
  }

  const all = [...declared.values()];

  // Per-ability over-use: usesPerEncounter is the frozen starting cap (never mutated — only its
  // live sibling usesRemaining decrements).
  const abilityOverUsed = all
    .filter((r) => r.usesPerEncounter != null && r.executions > r.usesPerEncounter)
    .map((r) => ({ kind: "ability", ownerId: r.ownerId, rosterKey: r.rosterKey, name: r.name, executions: r.executions, cap: r.usesPerEncounter }));

  // Shared-slot-pool over-use (GH #60): group every slotRank-bearing declared ability by
  // (ownerId, slotRank), sum real executions across all of them, compare to the combatant's own
  // starting spellSlots count for that rank.
  const slotGroups = new Map(); // "ownerId|slotRank" -> {ownerId, slotRank, names:[], executions}
  for (const r of all) {
    if (r.slotRank == null) continue;
    const key = `${r.ownerId}|${r.slotRank}`;
    const g = slotGroups.get(key) ?? { ownerId: r.ownerId, slotRank: r.slotRank, names: [], executions: 0 };
    g.names.push(r.name);
    g.executions += r.executions;
    slotGroups.set(key, g);
  }
  const slotOverUsed = [...slotGroups.values()]
    .map((g) => ({ ...g, cap: roster[g.ownerId]?.spellSlots?.[g.slotRank] ?? null }))
    .filter((g) => g.cap != null && g.executions > g.cap)
    .map((g) => ({ kind: "sharedSlotPool", ownerId: g.ownerId, slotRank: g.slotRank, names: g.names, executions: g.executions, cap: g.cap }));

  return {
    abilities: all,
    zero: all.filter((r) => r.executions === 0),
    overUsed: [...abilityOverUsed, ...slotOverUsed],
    unmatched
  };
}

/** Everything above, for one battle log. */
export function collectTacticalMetrics(log, options = {}) {
  return {
    focusFire: focusFireStats(log),
    mapDiscipline: mapDisciplineStats(log),
    oscillation: oscillationStats(log),
    resourceUse: resourceUseStats(log),
    threatPriority: threatPriorityStats(log, options),
    engagement: engagementStats(log),
    coverUsage: coverUsageStats(log),
    maneuverConversion: maneuverConversionStats(log),
    abilityCoverage: abilityCoverageStats(log)
  };
}

/** Human-readable summary for console output and design-doc capture. */
export function formatTacticalMetrics(m) {
  const pct = (x) => (x == null ? "n/a" : (x * 100).toFixed(1) + "%");
  const num = (x) => (x == null ? "n/a" : x.toFixed(2));
  return [
    `focusFire:      switchRate=${pct(m.focusFire.switchRate)} (${m.focusFire.switchesWithTargetAlive}/${m.focusFire.consecutiveAttackPairs} follow-up attacks switched off a living target)`,
    `mapDiscipline:  ${m.mapDiscipline.totalAttacks} attacks, thirdAttackShare=${pct(m.mapDiscipline.thirdAttackShare)}, hitRate by MAP: ${Object.entries(m.mapDiscipline.byPenalty).map(([p, t]) => `-${p}:${pct(t.hitRate)}(n=${t.attempts})`).join(" ")}`,
    `oscillation:    worstExplorationRatio=${num(m.oscillation.worstExplorationRatio)} worstRevisit=${m.oscillation.worstRevisit}`,
    `resourceUse:    ${m.resourceUse.spent}/${m.resourceUse.tracked} limited options spent${m.resourceUse.options.length ? " [" + m.resourceUse.options.map((o) => `${o.name}:${o.spentRound ?? "never"}`).join(", ") + "]" : ""}`,
    `threatPriority: correlation=${num(m.threatPriority.threatAttackCorrelation)} over ${m.threatPriority.totalAttacks} attacks`,
    `engagement:     firstDamage=round ${m.engagement.firstDamageRound ?? "NEVER"}, totalDamage=${m.engagement.totalDamage}, rounds=${m.engagement.rounds}`,
    `coverUsage:     moveIntoCover=${pct(m.coverUsage.moveIntoCoverRate)} (${m.coverUsage.movesIntoCover}/${m.coverUsage.movesTotal}), attackFromCover=${pct(m.coverUsage.attackFromCoverRate)} (${m.coverUsage.attacksFromCover}/${m.coverUsage.attacksTotal})`,
    `maneuverConv:   trip=${pct(m.maneuverConversion.trip.conversionRate)} (${m.maneuverConversion.trip.converted}/${m.maneuverConversion.trip.attempts}), grapple=${pct(m.maneuverConversion.grapple.conversionRate)} (${m.maneuverConversion.grapple.converted}/${m.maneuverConversion.grapple.attempts})`,
    `abilityCoverage: ${m.abilityCoverage.abilities.length - m.abilityCoverage.zero.length}/${m.abilityCoverage.abilities.length} declared abilities used${m.abilityCoverage.zero.length ? ", zero: [" + m.abilityCoverage.zero.map((z) => `${z.ownerId}/${z.name}`).join(", ") + "]" : ""}${m.abilityCoverage.overUsed.length ? ", OVER-USE: [" + m.abilityCoverage.overUsed.map((v) => `${v.ownerId}/${v.kind === "sharedSlotPool" ? v.names.join("+") : v.name} (${v.executions}>${v.cap})`).join(", ") + "]" : ""}`
  ].join("\n");
}
