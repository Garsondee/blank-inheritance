/**
 * Runs one or many (scenario, seed) battles and writes each as its own file
 * under logs/, updating logs/index.json — the per-simulation log store
 * (design doc §15m) that replaced battle-log.json's single-run-per-scenario
 * scheme. That scheme was keyed by scenario name ALONE, so re-running the
 * same scenario at a different seed silently overwrote the previous run —
 * there was no way to accumulate a library of many simulations to read back,
 * which is exactly what Ingram asked for: "we need to start organising the
 * simulations into the reader so that we can read them back."
 *
 * Usage:
 *   node run-scenario.mjs
 *     No args: runs the canonical demo set (today's four scenarios, each at
 *     its own documented default seed) — the same battles this command has
 *     always produced, so existing muscle memory still works.
 *
 *   node run-scenario.mjs --scenario=escort --seed=1000-1019
 *     A real sweep: one scenario, twenty seeds, twenty accumulated log files.
 *
 *   node run-scenario.mjs --scenario=escort,melee-draws-fire --seed=1,2,3
 *     Multiple scenarios, an explicit seed list (comma-separated, not a range).
 *
 *   node run-scenario.mjs --scenario=all --seed=2000-2004 --roundLimit=8
 *
 * Re-running the SAME (scenario, seed) pair overwrites only that pair's own
 * file and index entry — updating a benchmark in place, not the bug this
 * replaced.
 */
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runBattle } from "./engine/engine.mjs";
import { buildScenario as buildEscort } from "./scenarios/five-vehicles-one-frame.mjs";
import { buildScenario as buildMeleeDrawsFire } from "./scenarios/melee-draws-fire.mjs";
import { buildScenario as buildMysticFrameSolo } from "./scenarios/mystic-frame-solo.mjs";
import { buildScenario as buildReducedForce } from "./scenarios/reduced-force.mjs";
import { buildScenario as buildStressTestMissionOne } from "./scenarios/stress-test-mission-one.mjs";
import { runFileName, buildIndexEntry, mergeIndexEntry, trimRunPayload } from "./analysis/run-log-store.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(here, "logs");
const indexPath = path.join(logsDir, "index.json");

const SCENARIOS = {
  escort: { build: buildEscort, label: "Escort formation — Frame + 5 vehicles, reach-100 weapon", defaultSeed: 20260822, roundLimit: 8 },
  "melee-draws-fire": { build: buildMeleeDrawsFire, label: "Melee draws fire — Frame + Hod + Ladle, no-reach weapon", defaultSeed: 20260822, fieldBreaksAtRound: 3, roundLimit: 10 },
  "mystic-frame-solo": { build: buildMysticFrameSolo, label: "Mystic Frame solo — real spells and a real class ability, no support", defaultSeed: 18, fieldBreaksAtRound: 3, roundLimit: 10 },
  // Wired in 2026-08-23 (design doc §15m) — built earlier (design bible's "test different
  // approaches" comparison set) but never reachable from this CLI, so it never accumulated any
  // logs and the reader had nothing of its to show.
  "reduced-force": { build: buildReducedForce, label: "Reduced force — Frame + Hod + Ladle only, no five-vehicle firepower", defaultSeed: 20260822, fieldBreaksAtRound: 3, roundLimit: 10 },
  "stress-test-mission-one": { build: buildStressTestMissionOne, label: "Stress-test Mission One — 2 Frames + 5-vehicle escort vs Claimant + 3 raiders, 3-vehicle neutral convoy, terrain", defaultSeed: 20260823, roundLimit: 12 }
};

/** `1000-1019` -> [1000..1019]; `1,2,3` -> [1,2,3]; `1000` -> [1000]. */
export function parseSeeds(spec) {
  if (spec.includes("-")) {
    const [from, to] = spec.split("-").map(Number);
    if (Number.isNaN(from) || Number.isNaN(to) || to < from) throw new Error(`Bad --seed range: "${spec}"`);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }
  return spec.split(",").map(Number);
}

export function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    const m = /^--([^=]+)=(.*)$/.exec(raw);
    if (!m) throw new Error(`Unrecognized argument: "${raw}" (expected --key=value)`);
    args[m[1]] = m[2];
  }
  return args;
}

export function planRuns(args, scenarios = SCENARIOS) {
  const scenarioNames = !args.scenario || args.scenario === "all"
    ? Object.keys(scenarios)
    : args.scenario.split(",");
  for (const name of scenarioNames) if (!scenarios[name]) throw new Error(`Unknown scenario "${name}" — known: ${Object.keys(scenarios).join(", ")}`);

  const plans = [];
  for (const name of scenarioNames) {
    const def = scenarios[name];
    const seeds = args.seed ? parseSeeds(args.seed) : [def.defaultSeed];
    for (const seed of seeds) {
      plans.push({
        scenario: name,
        label: args.label ?? def.label,
        seed,
        roundLimit: args.roundLimit ? Number(args.roundLimit) : def.roundLimit,
        fieldBreaksAtRound: args.fieldBreaksAtRound === "none" ? undefined : (args.fieldBreaksAtRound ? Number(args.fieldBreaksAtRound) : def.fieldBreaksAtRound),
        build: def.build
      });
    }
  }
  return plans;
}

function loadIndex() {
  if (!existsSync(indexPath)) return [];
  return JSON.parse(readFileSync(indexPath, "utf8"));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const plans = planRuns(args);
  mkdirSync(logsDir, { recursive: true });
  let index = loadIndex();
  const generatedAt = new Date().toISOString();

  for (const plan of plans) {
    const scenario = plan.build({ seed: plan.seed, fieldBreaksAtRound: plan.fieldBreaksAtRound, roundLimit: plan.roundLimit });
    const log = runBattle(scenario);

    const record = {
      scenario: plan.scenario, label: plan.label, seed: plan.seed, roundLimit: plan.roundLimit, generatedAt,
      groundLayerLog: scenario.groundLayerLog ?? null, // kept on the FILE (the complete record) — trimmed before the artifact embed, since nothing there reads it
      log: trimRunPayload(log)
    };
    writeFileSync(path.join(logsDir, runFileName(plan)), JSON.stringify(record));

    index = mergeIndexEntry(index, buildIndexEntry({ scenario: plan.scenario, label: plan.label, seed: plan.seed, roundLimit: plan.roundLimit, generatedAt, log }));

    const fieldNote = scenario.groundLayerLog ? ` (ground layer: field ${scenario.groundLayerLog.outcome.fieldIntegrity}, shelter ${scenario.groundLayerLog.outcome.shelterEvacuation})` : "";
    console.log(`${plan.scenario}@${plan.seed}: ${log.outcome.result} in ${log.rounds.length} round(s)${fieldNote}`);
  }

  writeFileSync(indexPath, JSON.stringify(index, null, 1));
  console.log(`Wrote ${plans.length} run(s) to ${path.relative(here, logsDir)}/ — index now has ${index.length} run(s) total.`);
}

// Only run when invoked directly (`node run-scenario.mjs`), not when imported by tests.
if (path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] ?? "")) main();
