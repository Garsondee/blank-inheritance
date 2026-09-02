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
import { buildScenario as buildComplexBattle } from "./scenarios/personnel-complex-battle.mjs";
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
  },
  // Design doc §22's 3v3 expansion: Lunar-17+Tapkey+Bennit vs. Security Goon+Xenowarden Greenhorn+
  // Erabryth, on the redesigned complex (windows, cover, asymmetric rooms). Supersedes the earlier
  // §21 2v2 scenarios of the same shape — same real-fixtures-only discipline, three combatants a
  // side now instead of two. Setup names/keys renamed under design doc §24's spawn redesign
  // (opposite map corners/ends, not inside specific rooms — SAME_ROOM/SAME_BUILDING_FAR_ROOMS/
  // ACROSS_THE_COMPLEX no longer describe anything real) — roundLimit raised from 30 to 40 since
  // opposite-corner spawns require substantially more real travel before any shot is possible.
  "complex-3v3-diagonal-sw-ne": {
    build: (args) => buildComplexBattle({ ...args, partyFixtures: ["lunar-17.json", "tapkey.json", "bennit.json"], oppositionFixtures: ["security-goon.json", "xenowarden-greenhorn.json", "erabryth.json"], setup: "DIAGONAL_SW_NE" }),
    label: "3v3: Lunar-17+Tapkey+Bennit vs. Security Goon+Xenowarden Greenhorn+Erabryth — opposite corners (SW/NE), no initial line of effect",
    defaultSeed: 1, roundLimit: 40
  },
  "complex-3v3-diagonal-nw-se": {
    build: (args) => buildComplexBattle({ ...args, partyFixtures: ["lunar-17.json", "tapkey.json", "bennit.json"], oppositionFixtures: ["security-goon.json", "xenowarden-greenhorn.json", "erabryth.json"], setup: "DIAGONAL_NW_SE" }),
    label: "3v3: Lunar-17+Tapkey+Bennit vs. Security Goon+Xenowarden Greenhorn+Erabryth — opposite corners (NW/SE), no initial line of effect",
    defaultSeed: 1, roundLimit: 40
  },
  "complex-3v3-north-south-ends": {
    build: (args) => buildComplexBattle({ ...args, partyFixtures: ["lunar-17.json", "tapkey.json", "bennit.json"], oppositionFixtures: ["security-goon.json", "xenowarden-greenhorn.json", "erabryth.json"], setup: "NORTH_SOUTH_ENDS" }),
    label: "3v3: Lunar-17+Tapkey+Bennit vs. Security Goon+Xenowarden Greenhorn+Erabryth — opposite ends of the open courtyard, real line of effect but a long, open approach",
    defaultSeed: 1, roundLimit: 40
  },
  // design doc §35 — Ingram's own ask: "we shouldn't always spawn our two sides in the same
  // places." A real randomized opening every seed, not one of three fixed hand-picked lineups —
  // see scenarios/random-deployment.mjs for the actual algorithm (two random arcs, real
  // Line-of-Effect validation, retried until genuinely blind). Round limit raised well past the
  // other setups' 40: a genuinely blind opening spends real turns exploring before contact is even
  // possible, on top of whatever travel the fight itself needs afterward.
  "complex-3v3-random-arcs": {
    build: (args) => buildComplexBattle({ ...args, partyFixtures: ["lunar-17.json", "tapkey.json", "bennit.json"], oppositionFixtures: ["security-goon.json", "xenowarden-greenhorn.json", "erabryth.json"], setup: "RANDOM_ARCS" }),
    label: "3v3: Lunar-17+Tapkey+Bennit vs. Security Goon+Xenowarden Greenhorn+Erabryth — randomized opposite arcs, real Line-of-Effect-validated blind opening",
    defaultSeed: 1, roundLimit: 60
  },
  // design doc §38 — Ingram's own question: "4 level 1 PCs should actually potentially struggle
  // against 4 NPCs at level 1... I wonder if your simulations will reveal any group failures."
  // Every real fixture this project has built, all four a side, RANDOM_ARCS so no fixed setup's own
  // starting geometry can bias the result one way or another — see design doc §38 for the real
  // measured outcome distribution across many seeds.
  "complex-4v4-random-arcs": {
    build: (args) => buildComplexBattle({
      ...args,
      partyFixtures: ["lunar-17.json", "tapkey.json", "bennit.json", "vorza-moonshot.json"],
      oppositionFixtures: ["security-goon.json", "xenowarden-greenhorn.json", "erabryth.json", "tough.json"],
      setup: "RANDOM_ARCS"
    }),
    label: "4v4: Lunar-17+Tapkey+Bennit+Vorza Moonshot vs. Security Goon+Xenowarden Greenhorn+Erabryth+Tough — every real fixture this project has, randomized opposite arcs, real Line-of-Effect-validated blind opening",
    defaultSeed: 1, roundLimit: 60
  },
  // design doc §43, Stage 2's own explicit verification ask: "the same party with Trip, Shove and
  // Grapple withheld, run head-to-head. If the maneuver-capable AI does not measurably win more, the
  // maneuvers are decoration." IDENTICAL to complex-4v4-random-arcs in every other respect (same
  // fixtures, same opposition, same RANDOM_ARCS deployment, same seeds line up 1:1) — partyManeuvers
  // is the one real variable this pair isolates.
  "complex-4v4-no-maneuvers-random-arcs": {
    build: (args) => buildComplexBattle({
      ...args,
      partyFixtures: ["lunar-17.json", "tapkey.json", "bennit.json", "vorza-moonshot.json"],
      oppositionFixtures: ["security-goon.json", "xenowarden-greenhorn.json", "erabryth.json", "tough.json"],
      setup: "RANDOM_ARCS",
      partyManeuvers: false
    }),
    label: "4v4 NO-MANEUVERS BASELINE: same roster as complex-4v4-random-arcs, party's own Trip/Shove/Grapple withheld — design doc §43's Stage 2 verification pair",
    defaultSeed: 1, roundLimit: 60
  },
  // design doc §39 — the XP-budget battery: "take our four person group and put them through a
  // series of battles but we relate each battle to the XP budget that SF2E uses... from just one
  // tick under 'average' all the way to extreme." Real SF2E numbers (reference/tables/
  // encounter-and-rewards-math.json): a party of 4 uses XP budgets 60/80/120/160 for Low/Moderate/
  // Severe/Extreme. Every real opposition fixture in this roster is level 1 (relative level 0 = 40xp
  // each), so N of them sums to a clean 40N — 2/3/4 land EXACTLY on Moderate/Severe/Extreme; there is
  // no whole-creature combination of same-level-only fixtures that hits Low (60xp) exactly, so that
  // tier is honestly not attempted (see design doc §39's own writeup) rather than faked. Same core
  // party as complex-4v4-random-arcs throughout, opposition growing one real fixture at a time so
  // each tier is a strict superset of the one below it, isolating "does the budget alone change the
  // outcome" as the one real variable.
  "complex-2v4-moderate-random-arcs": {
    build: (args) => buildComplexBattle({
      ...args,
      partyFixtures: ["lunar-17.json", "tapkey.json", "bennit.json", "vorza-moonshot.json"],
      oppositionFixtures: ["security-goon.json", "xenowarden-greenhorn.json"],
      setup: "RANDOM_ARCS"
    }),
    label: "4v2 (Moderate, 80xp budget): Lunar-17+Tapkey+Bennit+Vorza Moonshot vs. Security Goon+Xenowarden Greenhorn — design doc §39's XP-budget battery",
    defaultSeed: 1, roundLimit: 60
  },
  "complex-3v4-severe-random-arcs": {
    build: (args) => buildComplexBattle({
      ...args,
      partyFixtures: ["lunar-17.json", "tapkey.json", "bennit.json", "vorza-moonshot.json"],
      oppositionFixtures: ["security-goon.json", "xenowarden-greenhorn.json", "erabryth.json"],
      setup: "RANDOM_ARCS"
    }),
    label: "4v3 (Severe, 120xp budget): Lunar-17+Tapkey+Bennit+Vorza Moonshot vs. Security Goon+Xenowarden Greenhorn+Erabryth — design doc §39's XP-budget battery",
    defaultSeed: 1, roundLimit: 60
  },
  // design doc §39's ranged-combat/cover investigation: "add a new Pregen PC and give them a long
  // range rifle like weapon... Add a new NPC and find one with a long range weapon... Does the cover
  // mechanic actually work rules as written? Are the participants actually using it?" A deliberately
  // MINIMAL 1v1 — Obozaya's real 100ft Laser Rifle against Kuriaku's real 120ft Shobhad Longrifle
  // (the longest range on either side of this roster, by a full increment) — so any cover-seeking
  // (or lack of it) is attributable to these two specifically, not diluted across a larger melee.
  "ranged-duel-obozaya-vs-kuriaku": {
    build: (args) => buildComplexBattle({
      ...args,
      partyFixtures: ["obozaya.json"],
      oppositionFixtures: ["kuriaku.json"],
      setup: "RANDOM_ARCS"
    }),
    label: "1v1 ranged duel: Obozaya (100ft Laser Rifle) vs. Kuriaku (120ft Shobhad Longrifle) — design doc §39's cover-mechanic investigation",
    defaultSeed: 1, roundLimit: 60
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
