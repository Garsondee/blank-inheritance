/**
 * The personnel-scale sibling of run-scenario.mjs (design doc §19) — same per-simulation log store
 * (design doc §15m), same CLI shape, same output files (logs/, index.json), so the existing
 * artifact/build.mjs picks up a personnel-scale run with ZERO changes: it only ever reads whatever
 * `logs/index.json` lists, never which engine produced it. Kept as a genuinely separate script
 * rather than a mode flag on run-scenario.mjs itself — that file imports only
 * `engine/engine.mjs` and the Frame-scale scenarios/*.mjs; importing personnel-engine/engine.mjs
 * there too would be exactly the kind of cross-scale coupling design/scale-and-chassis.md §2
 * already rules out for engine code, and there's no reason the LOG-WRITING CLI needs to be
 * exempt from that rule just because run-log-store.mjs's own helpers happen to be shape-agnostic.
 *
 * Usage:
 *   node run-personnel-scenario.mjs
 *     No args: runs all three Phase 1b room configurations for lunar17-vs-security-goon, each at
 *     its own documented default seed.
 *
 *   node run-personnel-scenario.mjs --scenario=lunar17-vs-security-goon-same-room --seed=1-20
 *     A real sweep: one setup, twenty seeds, twenty accumulated log files.
 */
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runBattle } from "./personnel-engine/engine.mjs";
import { buildScenario as buildLunar17VsSecurityGoon } from "./scenarios/personnel-lunar17-vs-security-goon.mjs";
import { runFileName, buildIndexEntry, mergeIndexEntry, trimRunPayload } from "./analysis/run-log-store.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(here, "logs");
const indexPath = path.join(logsDir, "index.json");

/** `1000-1019` -> [1000..1019]; `1,2,3` -> [1,2,3]; `1000` -> [1000]. Duplicated from run-scenario.mjs
 * on purpose, not imported — importing that file would also load every Frame-scale scenario module
 * it references at its own top level, exactly the cross-scale coupling design doc §2 rules out. */
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

const SCENARIOS = {
  "lunar17-vs-security-goon-same-room": {
    build: (args) => buildLunar17VsSecurityGoon({ ...args, setup: "SAME_ROOM" }),
    label: "Lunar-17 vs. Security Goon — same room, open sightline (design doc §19 Phase 3)",
    defaultSeed: 1, roundLimit: 15
  },
  "lunar17-vs-security-goon-adjacent-rooms": {
    build: (args) => buildLunar17VsSecurityGoon({ ...args, setup: "ADJACENT_ROOMS" }),
    label: "Lunar-17 vs. Security Goon — adjacent rooms, wall in the way, doorway nearby",
    defaultSeed: 1, roundLimit: 20
  },
  "lunar17-vs-security-goon-far-rooms": {
    build: (args) => buildLunar17VsSecurityGoon({ ...args, setup: "FAR_ROOMS" }),
    label: "Lunar-17 vs. Security Goon — far rooms, two doorways to route through",
    defaultSeed: 1, roundLimit: 20
  }
};

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
        scenario: name, label: args.label ?? def.label, seed,
        roundLimit: args.roundLimit ? Number(args.roundLimit) : def.roundLimit,
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
    const scenario = plan.build({ seed: plan.seed, roundLimit: plan.roundLimit });
    const log = runBattle(scenario);

    const record = { scenario: plan.scenario, label: plan.label, seed: plan.seed, roundLimit: plan.roundLimit, generatedAt, log: trimRunPayload(log) };
    writeFileSync(path.join(logsDir, runFileName(plan)), JSON.stringify(record));

    index = mergeIndexEntry(index, buildIndexEntry({ scenario: plan.scenario, label: plan.label, seed: plan.seed, roundLimit: plan.roundLimit, generatedAt, log }));

    console.log(`${plan.scenario}@${plan.seed}: ${log.outcome.result} in ${log.rounds.length} round(s)`);
  }

  writeFileSync(indexPath, JSON.stringify(index, null, 1));
  console.log(`Wrote ${plans.length} run(s) to ${path.relative(here, logsDir)}/ — index now has ${index.length} run(s) total.`);
}

if (path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] ?? "")) main();
