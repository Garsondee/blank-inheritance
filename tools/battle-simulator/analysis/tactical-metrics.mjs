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

const ATTACK_TYPES = new Set(["strike", "spellAttack"]);

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
 */
export function resourceUseStats(log) {
  const limited = new Map(); // "combatantId|optionName" -> { ownerId, name, spentRound }
  for (const [id, entry] of Object.entries(log.roster ?? {})) {
    for (const option of [...(entry.strikes ?? []), ...(entry.spells ?? []), ...(entry.healAbilities ?? [])]) {
      if (option.usesPerEncounter != null) limited.set(`${id}|${option.name}`, { ownerId: id, name: option.name, spentRound: null });
    }
  }
  if (limited.size === 0) return { tracked: 0, spent: 0, spentRate: null, options: [] };

  for (const { round, actorId, action } of flatActions(log)) {
    if (action.legal === false) continue;
    const name = action.strikeName ?? action.spellName ?? action.abilityName;
    const rec = limited.get(`${actorId}|${name}`);
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
    for (const reaction of action.triggeredReactions ?? []) {
      const rdmg = reaction.damageApplied ?? 0;
      if (rdmg > 0) {
        totalDamage += rdmg;
        if (firstDamageRound === null) firstDamageRound = round;
      }
    }
  }
  return { firstDamageRound, totalDamage, rounds: (log.rounds ?? []).length };
}

/** Everything above, for one battle log. */
export function collectTacticalMetrics(log, options = {}) {
  return {
    focusFire: focusFireStats(log),
    mapDiscipline: mapDisciplineStats(log),
    oscillation: oscillationStats(log),
    resourceUse: resourceUseStats(log),
    threatPriority: threatPriorityStats(log, options),
    engagement: engagementStats(log)
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
    `engagement:     firstDamage=round ${m.engagement.firstDamageRound ?? "NEVER"}, totalDamage=${m.engagement.totalDamage}, rounds=${m.engagement.rounds}`
  ].join("\n");
}
