/**
 * XP-BUDGET BATTERY (design doc §39) — Ingram's own ask: "take our four person group and put them
 * through a series of battles but we relate each battle to the XP budget that SF2E uses... The goal
 * would be to see if the different XP budgets resulted in different levels of damage happening to
 * the group. Track both end HP and HP damaged / healed... start tracking the history of battles in
 * a log where we try and put real numbers to the skills / intelligence of our AI."
 *
 * Real SF2E numbers throughout (reference/tables/encounter-and-rewards-math.json), not guessed:
 * a 4-PC party's XP budget is 60/80/120/160 for Low/Moderate/Severe/Extreme. Every real opposition
 * fixture in this roster is level 1 relative to a level-1 party (40xp each per creatureXpByRelative
 * Level's own "0" row), so N of them sums to a clean 40N — 2/3/4 real fixtures land EXACTLY on
 * Moderate/Severe/Extreme. There is no whole-creature combination of same-level-only fixtures that
 * hits Low (60xp) exactly, so — matching Ingram's own "no point testing very low XP budget
 * battles" — that tier is honestly skipped rather than faked with an invented weaker creature.
 *
 * Reuses the real, already-registered scenarios (run-personnel-scenario.mjs's own SCENARIOS, via
 * the already-exported planRuns) rather than re-deriving scenario-building logic — the same builder
 * every other personnel-scale battery in this project goes through.
 *
 * Run: node tools/battle-simulator/analysis/xp-budget-battery.mjs [--seeds=1-20]
 * Appends one dated section to analysis/battle-history.md per run — this file is meant to
 * accumulate over time, one real entry per battery, not be overwritten.
 */
import { writeFileSync, appendFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runBattle } from "../personnel-engine/engine.mjs";
import { planRuns } from "../run-personnel-scenario.mjs";
import { collectRunMetrics } from "./metrics.mjs";
import { collectTacticalMetrics, sideOutcomeStats } from "./tactical-metrics.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const historyPath = path.join(here, "battle-history.md");

/** One battery entry: a real registered scenario name, plus how to label it in the log. */
export const XP_BUDGET_TIERS = [
  { scenario: "complex-2v4-moderate-random-arcs", label: "Moderate", xpBudget: 80 },
  { scenario: "complex-3v4-severe-random-arcs", label: "Severe", xpBudget: 120 },
  { scenario: "complex-4v4-random-arcs", label: "Extreme", xpBudget: 160 }
];

export const RANGED_DUEL = { scenario: "ranged-duel-obozaya-vs-kuriaku", label: "Ranged duel (Obozaya vs. Kuriaku)" };

/**
 * Run one registered scenario across a seed range, collecting real per-run metrics — no aggregation
 * yet. `onProgress` (design doc §45 — a real, direct ask: "I can tell the difference between a
 * broken test, a slow test and a test which is at, say, 15% progress") is OPTIONAL and defaults to a
 * no-op, so every existing caller (including the light integration test) sees zero behavior change.
 * Fires two real event shapes, both cheap to ignore if a caller only cares about one:
 *   {type: "round", seedIndex, seedTotal, seed, round, roundLimit} — throttled to every 5th round,
 *     so a single long battle still shows real forward motion without flooding the console.
 *   {type: "seedComplete", seedIndex, seedTotal, seed, outcome, rounds, elapsedMs} — always fires,
 *     the main signal for a whole sweep's own progress.
 */
export function runScenarioSweep(scenarioName, seedSpec, { onProgress } = {}) {
  const plans = planRuns({ scenario: scenarioName, seed: seedSpec });
  return plans.map((plan, seedIndex) => {
    const seedTotal = plans.length;
    const t0 = Date.now();
    const scenario = plan.build({ seed: plan.seed, roundLimit: plan.roundLimit });
    if (onProgress) {
      scenario.onRoundStart = (round, roundLimit) => {
        if (round === 1 || round % 5 === 0) onProgress({ type: "round", seedIndex, seedTotal, seed: plan.seed, round, roundLimit });
      };
    }
    const log = runBattle(scenario);
    if (onProgress) {
      onProgress({ type: "seedComplete", seedIndex, seedTotal, seed: plan.seed, outcome: log.outcome.result, rounds: log.rounds.length, elapsedMs: Date.now() - t0 });
    }
    return {
      seed: plan.seed,
      runMetrics: collectRunMetrics(log),
      tactical: collectTacticalMetrics(log),
      party: sideOutcomeStats(log, "party")
    };
  });
}

/** A reasonable default renderer for `onProgress` — one terse line per event, real numbers only.
 * Not wired in automatically (every caller opts in explicitly) so library/test use stays silent by
 * default; CLI entry points (this file's own `main`, and analysis/maneuver-baseline-comparison.mjs)
 * pass this directly. */
export function logProgress(event) {
  const at = `[${event.seedIndex + 1}/${event.seedTotal}]`;
  if (event.type === "round") {
    console.log(`${at} seed ${event.seed}: round ${event.round}/${event.roundLimit}...`);
  } else {
    console.log(`${at} seed ${event.seed}: ${event.outcome} in ${event.rounds} rounds (${event.elapsedMs}ms)`);
  }
}

/** Real means/distribution across a sweep's results — no invented numbers, every field a direct average of a real logged value. */
export function aggregateSweep(results) {
  const n = results.length;
  if (n === 0) throw new Error("aggregateSweep: no results supplied");
  const mean = (fn) => results.reduce((sum, r) => sum + fn(r), 0) / n;
  const outcomes = {};
  for (const r of results) outcomes[r.runMetrics.outcome] = (outcomes[r.runMetrics.outcome] ?? 0) + 1;

  return {
    n,
    outcomes,
    meanRounds: mean((r) => r.runMetrics.rounds),
    meanPartyFinalHPFraction: mean((r) => r.party.finalHPFraction),
    meanPartyDamageTaken: mean((r) => r.party.damageTaken),
    meanPartyHealingReceived: mean((r) => r.party.healingReceived),
    // coverUsage rates are null on a run with zero moves/attacks (see tactical-metrics.mjs) — treat
    // a null as "no opportunity to use cover," not as a zero score dragging the mean down unfairly,
    // by excluding it from this specific average rather than coercing to 0.
    meanMoveIntoCoverRate: meanIgnoringNull(results.map((r) => r.tactical.coverUsage.moveIntoCoverRate)),
    meanAttackFromCoverRate: meanIgnoringNull(results.map((r) => r.tactical.coverUsage.attackFromCoverRate))
  };
}

function meanIgnoringNull(values) {
  const real = values.filter((v) => v != null);
  return real.length ? real.reduce((a, b) => a + b, 0) / real.length : null;
}

function pct(x) {
  return x == null ? "n/a" : (x * 100).toFixed(1) + "%";
}

function formatTierSection(tierLabel, xpBudget, agg) {
  const lines = [
    `### ${tierLabel}${xpBudget ? ` (${xpBudget}xp budget)` : ""} — n=${agg.n}`,
    "",
    `- Outcomes: ${Object.entries(agg.outcomes).map(([k, v]) => `${k}=${v}`).join(", ")}`,
    `- Mean rounds to resolution: ${agg.meanRounds.toFixed(1)}`,
    `- Mean party final HP: ${pct(agg.meanPartyFinalHPFraction)} of max`,
    `- Mean party damage taken: ${agg.meanPartyDamageTaken.toFixed(1)}`,
    `- Mean party healing received: ${agg.meanPartyHealingReceived.toFixed(1)}`,
    `- Cover usage — move-into-cover rate: ${pct(agg.meanMoveIntoCoverRate)}, attack-from-cover rate: ${pct(agg.meanAttackFromCoverRate)}`
  ];
  return lines.join("\n");
}

function runBattery(seedSpec) {
  const tierSections = XP_BUDGET_TIERS.map((tier) => {
    console.log(`--- ${tier.label} (${tier.scenario}) ---`);
    const results = runScenarioSweep(tier.scenario, seedSpec, { onProgress: logProgress });
    const agg = aggregateSweep(results);
    console.log(`${tier.label} (${tier.scenario}): ${JSON.stringify(agg.outcomes)}, mean party HP ${pct(agg.meanPartyFinalHPFraction)}`);
    return formatTierSection(tier.label, tier.xpBudget, agg);
  });

  console.log(`--- ${RANGED_DUEL.label} (${RANGED_DUEL.scenario}) ---`);
  const duelResults = runScenarioSweep(RANGED_DUEL.scenario, seedSpec, { onProgress: logProgress });
  const duelAgg = aggregateSweep(duelResults);
  console.log(`${RANGED_DUEL.label} (${RANGED_DUEL.scenario}): ${JSON.stringify(duelAgg.outcomes)}, moveIntoCover ${pct(duelAgg.meanMoveIntoCoverRate)}, attackFromCover ${pct(duelAgg.meanAttackFromCoverRate)}`);
  const duelSection = formatTierSection(RANGED_DUEL.label, null, duelAgg);

  return { tierSections, duelSection };
}

function appendToHistory(seedSpec, { tierSections, duelSection }) {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const entry = [
    `## ${dateStamp} — XP-budget battery (seeds ${seedSpec})`,
    "",
    "**XP-budget tiers** (same 4-PC party throughout: Lunar-17, Tapkey, Bennit, Vorza Moonshot; opposition grows one real fixture at a time):",
    "",
    ...tierSections,
    "",
    "**Ranged-combat/cover investigation:**",
    "",
    duelSection,
    "",
    "---",
    ""
  ].join("\n");

  if (!existsSync(historyPath)) {
    writeFileSync(historyPath, "# Battle History\n\nA running, hand-appended-by-script log of real battery runs — design doc §39. Never hand-edited; re-run `node tools/battle-simulator/analysis/xp-budget-battery.mjs` to add a new dated entry.\n\n");
  }
  appendFileSync(historyPath, entry);
}

function main() {
  const seedArg = process.argv.find((a) => a.startsWith("--seeds="));
  const seedSpec = seedArg ? seedArg.slice("--seeds=".length) : "1-20";
  const battery = runBattery(seedSpec);
  appendToHistory(seedSpec, battery);
  console.log(`Appended battery results to ${path.relative(process.cwd(), historyPath)}`);
}

if (path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] ?? "")) main();
