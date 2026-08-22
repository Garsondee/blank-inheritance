/**
 * Simulation quality metrics (design doc §15a).
 *
 * WHY THIS EXISTS SEPARATELY FROM action-utilization.mjs: that module answers
 * "were action points spent?", which turned out to be a **gameable** question.
 * The Runabout scores 100% utilization purely by alternating two always-legal
 * filler verbs (move/evacuate) — it is fully utilized by accident of having
 * something trivially legal to do, not by playing well. Optimising a rewrite
 * against utilization alone would reward adding more filler.
 *
 * So these metrics deliberately measure several different things that are hard
 * to game simultaneously:
 *
 *   utilization       did the action economy get used at all
 *   idleTurnRate      how often a live, un-stunned combatant did NOTHING
 *   verbDiversity     how many DISTINCT action types each combatant ever used
 *   decisionEntropy   Shannon entropy over the action mix — robotic play scores low
 *   damage/taken      did anything actually happen
 *   illegalProposals  correctness; must stay 0
 *
 * `verbDiversity` and `decisionEntropy` are the two that caught the original
 * failure: max 3 distinct verbs per combatant, and seven consecutive seeds
 * producing near-identical play. Aggregate damage totals looked fine throughout.
 *
 * Pure functions over a completed battle log. No RNG, no I/O.
 */

/** Shannon entropy (bits) of a count distribution. 0 = always the same choice. */
export function shannonEntropy(counts) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let h = 0;
  for (const c of counts) {
    if (c <= 0) continue;
    const p = c / total;
    h -= p * Math.log2(p);
  }
  return h;
}

function isStunnedTurn(turn) {
  return Boolean(turn.stunned) || (turn.actionAccounting?.heldReason || "").startsWith("Stunned");
}

/**
 * Metrics for a single completed battle log.
 * `log` is the object runBattle() returns.
 */
export function collectRunMetrics(log) {
  const perCombatant = new Map();
  let available = 0;
  let spent = 0;
  let turns = 0;
  let idleTurns = 0;
  let stunnedTurns = 0;
  let illegalProposals = 0;
  const turnLengths = [0, 0, 0, 0]; // index = points spent, capped at 3
  const globalVerbs = new Map();

  for (const round of log.rounds ?? []) {
    for (const turn of round.turns ?? []) {
      turns += 1;
      const id = turn.combatantId;
      if (!perCombatant.has(id)) {
        perCombatant.set(id, { available: 0, spent: 0, turns: 0, idleTurns: 0, verbs: new Map(), damageDealt: 0 });
      }
      const c = perCombatant.get(id);
      const acc = turn.actionAccounting;
      const av = acc?.available ?? 0;
      const sp = acc?.spent ?? 0;

      available += av; spent += sp;
      c.available += av; c.spent += sp; c.turns += 1;

      const stunned = isStunnedTurn(turn);
      if (stunned) stunnedTurns += 1;
      if (sp === 0 && !stunned) { idleTurns += 1; c.idleTurns += 1; }
      turnLengths[Math.min(3, sp)] += 1;

      for (const action of turn.actions ?? []) {
        if (action.legal === false) { illegalProposals += 1; continue; }
        if (action.type === "none") continue;
        c.verbs.set(action.type, (c.verbs.get(action.type) ?? 0) + 1);
        globalVerbs.set(action.type, (globalVerbs.get(action.type) ?? 0) + 1);
        if (typeof action.damageApplied === "number") c.damageDealt += action.damageApplied;
      }
    }
  }

  const combatants = [...perCombatant.entries()].map(([id, c]) => ({
    id,
    turns: c.turns,
    available: c.available,
    spent: c.spent,
    utilization: c.available > 0 ? c.spent / c.available : 1,
    idleTurns: c.idleTurns,
    verbDiversity: c.verbs.size,
    verbs: Object.fromEntries(c.verbs),
    damageDealt: c.damageDealt,
    decisionEntropy: shannonEntropy([...c.verbs.values()])
  })).sort((a, b) => a.utilization - b.utilization);

  return {
    outcome: log.outcome?.result ?? "timeout",
    rounds: (log.rounds ?? []).length,
    turns,
    available,
    spent,
    utilization: available > 0 ? spent / available : 1,
    idleTurns,
    idleTurnRate: turns > 0 ? idleTurns / turns : 0,
    stunnedTurns,
    illegalProposals,
    turnLengths,
    verbs: Object.fromEntries(globalVerbs),
    verbDiversity: globalVerbs.size,
    decisionEntropy: shannonEntropy([...globalVerbs.values()]),
    minVerbDiversity: combatants.length ? Math.min(...combatants.map((c) => c.verbDiversity)) : 0,
    combatants
  };
}

/**
 * Aggregate across many runs (a seed sweep). Reports the distribution of
 * outcomes and the means of the scalar metrics, plus per-combatant rollups.
 *
 * `distinctPlaySignatures` is the direct guard against the original
 * "seven consecutive seeds played identically" failure: each run is reduced
 * to a signature of its action mix, and we count how many DISTINCT ones the
 * sweep produced. A healthy AI facing different dice should rarely repeat.
 */
export function aggregateMetrics(runMetrics) {
  const n = runMetrics.length;
  if (n === 0) throw new Error("aggregateMetrics: no runs supplied");

  const outcomes = {};
  for (const r of runMetrics) outcomes[r.outcome] = (outcomes[r.outcome] ?? 0) + 1;

  const mean = (fn) => runMetrics.reduce((s, r) => s + fn(r), 0) / n;

  const perCombatant = new Map();
  for (const r of runMetrics) {
    for (const c of r.combatants) {
      if (!perCombatant.has(c.id)) perCombatant.set(c.id, { available: 0, spent: 0, idleTurns: 0, turns: 0, verbs: new Set(), damageDealt: 0 });
      const agg = perCombatant.get(c.id);
      agg.available += c.available; agg.spent += c.spent;
      agg.idleTurns += c.idleTurns; agg.turns += c.turns;
      agg.damageDealt += c.damageDealt;
      for (const v of Object.keys(c.verbs)) agg.verbs.add(v);
    }
  }

  const signatures = new Set(
    runMetrics.map((r) => Object.entries(r.verbs).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join(","))
  );

  return {
    runs: n,
    outcomes,
    utilization: mean((r) => r.utilization),
    idleTurnRate: mean((r) => r.idleTurnRate),
    decisionEntropy: mean((r) => r.decisionEntropy),
    verbDiversity: mean((r) => r.verbDiversity),
    minVerbDiversity: Math.min(...runMetrics.map((r) => r.minVerbDiversity)),
    illegalProposals: runMetrics.reduce((s, r) => s + r.illegalProposals, 0),
    meanRounds: mean((r) => r.rounds),
    distinctPlaySignatures: signatures.size,
    playSignatureRatio: signatures.size / n,
    combatants: [...perCombatant.entries()].map(([id, a]) => ({
      id,
      utilization: a.available > 0 ? a.spent / a.available : 1,
      idleTurnRate: a.turns > 0 ? a.idleTurns / a.turns : 0,
      verbDiversity: a.verbs.size,
      verbs: [...a.verbs].sort(),
      damageDealt: a.damageDealt
    })).sort((x, y) => x.utilization - y.utilization)
  };
}

/** Human-readable one-screen summary, for console output and design-doc capture. */
export function formatMetrics(agg) {
  const pct = (x) => (x * 100).toFixed(1) + "%";
  const lines = [
    `runs=${agg.runs}  outcomes=${JSON.stringify(agg.outcomes)}`,
    `utilization=${pct(agg.utilization)}  idleTurnRate=${pct(agg.idleTurnRate)}  illegalProposals=${agg.illegalProposals}`,
    `verbDiversity=${agg.verbDiversity.toFixed(2)} (min per combatant ${agg.minVerbDiversity})  decisionEntropy=${agg.decisionEntropy.toFixed(3)} bits`,
    `distinctPlaySignatures=${agg.distinctPlaySignatures}/${agg.runs} (${pct(agg.playSignatureRatio)})  meanRounds=${agg.meanRounds.toFixed(1)}`,
    "per-combatant (worst utilization first):"
  ];
  for (const c of agg.combatants) {
    lines.push(`  ${c.id.padEnd(20)} util=${pct(c.utilization).padStart(6)}  idle=${pct(c.idleTurnRate).padStart(6)}  verbs=${c.verbDiversity} [${c.verbs.join(",")}]  dmg=${c.damageDealt}`);
  }
  return lines.join("\n");
}
