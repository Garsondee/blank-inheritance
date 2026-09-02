/**
 * NO-MANEUVERS BASELINE COMPARISON (design doc §43, Stage 2's own tactical-planning report,
 * verbatim): "A no-maneuvers baseline. The same party with Trip, Shove and Grapple withheld, run
 * head-to-head. If the maneuver-capable AI does not measurably win more, the maneuvers are
 * decoration."
 *
 * Reuses `complex-4v4-random-arcs` and its `complex-4v4-no-maneuvers-random-arcs` twin
 * (run-personnel-scenario.mjs) — IDENTICAL rosters, opposition, and RANDOM_ARCS deployment; the
 * only real variable is `partyManeuvers` (personnel-complex-battle.mjs). Same seeds run against
 * both scenarios, so this is a genuine paired comparison, not two independent samples.
 *
 * Reuses xp-budget-battery.mjs's own `runScenarioSweep`/`aggregateSweep` directly rather than
 * re-deriving sweep logic — the same real per-run metrics (outcome, party final HP, damage taken),
 * just compared across two conditions instead of tiers.
 *
 * Run: node tools/battle-simulator/analysis/maneuver-baseline-comparison.mjs [--seeds=1-15]
 * Appends one dated section to analysis/battle-history.md, same accumulating file design doc §39
 * already established — never overwritten, never hand-edited.
 */
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runScenarioSweep, aggregateSweep, logProgress } from "./xp-budget-battery.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const historyPath = path.join(here, "battle-history.md");

export const MANEUVER_PAIR = {
  withManeuvers: "complex-4v4-random-arcs",
  withoutManeuvers: "complex-4v4-no-maneuvers-random-arcs"
};

/** Mean maneuver-conversion rate across a sweep — ignores null (no attempts that run), same
 * treatment aggregateSweep already gives coverUsage's own null rates. */
function meanConversionRate(results, maneuverType) {
  const rates = results.map((r) => r.tactical.maneuverConversion[maneuverType].conversionRate).filter((v) => v != null);
  return rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
}

function totalAttempts(results, maneuverType) {
  return results.reduce((sum, r) => sum + r.tactical.maneuverConversion[maneuverType].attempts, 0);
}

export function runComparison(seedSpec, { onProgress } = {}) {
  if (onProgress) console.log(`--- WITH maneuvers (${MANEUVER_PAIR.withManeuvers}) ---`);
  const withResults = runScenarioSweep(MANEUVER_PAIR.withManeuvers, seedSpec, { onProgress });
  if (onProgress) console.log(`--- WITHOUT maneuvers (${MANEUVER_PAIR.withoutManeuvers}) ---`);
  const withoutResults = runScenarioSweep(MANEUVER_PAIR.withoutManeuvers, seedSpec, { onProgress });
  const withAgg = aggregateSweep(withResults);
  const withoutAgg = aggregateSweep(withoutResults);

  const partyWinRate = (agg) => (agg.outcomes["party-victory"] ?? 0) / agg.n;

  return {
    seedSpec,
    withManeuvers: {
      ...withAgg,
      partyWinRate: partyWinRate(withAgg),
      tripAttempts: totalAttempts(withResults, "trip"),
      tripConversionRate: meanConversionRate(withResults, "trip"),
      grappleAttempts: totalAttempts(withResults, "grapple"),
      grappleConversionRate: meanConversionRate(withResults, "grapple")
    },
    withoutManeuvers: { ...withoutAgg, partyWinRate: partyWinRate(withoutAgg) }
  };
}

function pct(x) {
  return x == null ? "n/a" : (x * 100).toFixed(1) + "%";
}

function formatComparison(cmp) {
  const w = cmp.withManeuvers, wo = cmp.withoutManeuvers;
  return [
    `### No-maneuvers baseline comparison (design doc §43) — seeds ${cmp.seedSpec}, n=${w.n} each`,
    "",
    `Same roster (Lunar-17+Tapkey+Bennit+Vorza Moonshot vs. Security Goon+Xenowarden Greenhorn+Erabryth+Tough), same seeds, same RANDOM_ARCS deployment. The only variable: the party's own Trip/Shove/Grapple.`,
    "",
    "| | WITH maneuvers | WITHOUT maneuvers |",
    "|---|---|---|",
    `| Party win rate | ${pct(w.partyWinRate)} | ${pct(wo.partyWinRate)} |`,
    `| Mean party final HP | ${pct(w.meanPartyFinalHPFraction)} | ${pct(wo.meanPartyFinalHPFraction)} |`,
    `| Mean party damage taken | ${w.meanPartyDamageTaken.toFixed(1)} | ${wo.meanPartyDamageTaken.toFixed(1)} |`,
    `| Mean rounds to resolution | ${w.meanRounds.toFixed(1)} | ${wo.meanRounds.toFixed(1)} |`,
    "",
    `Maneuver conversion (WITH-maneuvers run only): Trip ${w.tripAttempts} attempts, ${pct(w.tripConversionRate)} converted before expiring; Grapple ${w.grappleAttempts} attempts, ${pct(w.grappleConversionRate)} converted.`
  ].join("\n");
}

function appendToHistory(cmp) {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const entry = [`## ${dateStamp} — No-maneuvers baseline comparison`, "", formatComparison(cmp), "", "---", ""].join("\n");
  if (!existsSync(historyPath)) {
    writeFileSync(historyPath, "# Battle History\n\nA running, hand-appended-by-script log of real battery runs — design doc §39. Never hand-edited; re-run the relevant analysis script to add a new dated entry.\n\n");
  }
  appendFileSync(historyPath, entry);
}

function main() {
  const seedArg = process.argv.find((a) => a.startsWith("--seeds="));
  const seedSpec = seedArg ? seedArg.slice("--seeds=".length) : "1-15";
  const cmp = runComparison(seedSpec, { onProgress: logProgress });
  console.log(formatComparison(cmp));
  appendToHistory(cmp);
  console.log(`\nAppended comparison to ${path.relative(process.cwd(), historyPath)}`);
}

if (path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] ?? "")) main();
