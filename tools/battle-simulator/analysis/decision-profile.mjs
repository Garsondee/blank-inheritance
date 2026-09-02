/**
 * DECISION-COST PROFILING (design doc §59, GH issue #5) — "nothing on this roadmap can be sized
 * honestly without knowing what a decision costs today and having a real knob for how much a
 * decision may cost tomorrow." Measures, for a NAMED policy, real per-decision wall time and real
 * sandbox-evaluation count (`resetSandboxForkCount`/`getSandboxForkCount`, `personnel-engine/engine.mjs`
 * — the one seam every decision algorithm's real search cost passes through regardless of how much
 * caching sits above it) on two fixed real arenas:
 *
 *  - "mirror": the small, open, wall-free 2-combatant arena (`scenarios/personnel-mirror.mjs`) — the
 *    fast, many-decisions-per-battle case every tournament/weight-search run already pays for.
 *  - "complex": the 8-combatant, walled complex-battle map, RANDOM_ARCS setup, the exact real roster
 *    `test/battle-simulator/personnel-decide.test.mjs`'s own PERFORMANCE test uses (Lunar-17+Tapkey+
 *    Bennit+Vorza Moonshot vs. Security Goon+Xenowarden Greenhorn+Erabryth+Tough) — the slow,
 *    many-real-candidates case that regression already guards, now with real numbers tracked over
 *    time instead of only a single "well under 10s" ceiling.
 *
 * Only the PARTY side's decisions are instrumented — the opposition plays a fixed, unprofiled
 * `BASELINE_V1` throughout, exactly like `personnel-mirror.mjs`'s own real mirror-match convention,
 * so a profiling run measures ONE policy's real cost, not a blend of two.
 *
 * Appends real results to `battle-history.md`, same as every other analysis script — cost
 * regressions are now as visible as win-rate regressions.
 */
import { existsSync, writeFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runBattle, resetSandboxForkCount, getSandboxForkCount } from "../personnel-engine/engine.mjs";
import { buildScenario as buildMirrorScenario } from "../scenarios/personnel-mirror.mjs";
import { buildScenario as buildComplexScenario } from "../scenarios/personnel-complex-battle.mjs";
import { BASELINE_V1 } from "../personnel-engine/ai-profiles.mjs";
import { parseSeeds } from "../run-personnel-scenario.mjs";
// "greedy-v1" is already registered as a side effect of importing personnel-mirror.mjs above (it
// imports ai-common/policies/greedy.mjs itself); budget-demo-v1 is NOT pulled in by either scenario
// builder, so it needs its own explicit registration here for --policy=budget-demo-v1 to resolve.
import "../ai-common/policies/budget-demo.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const historyPath = path.join(here, "battle-history.md");

/** The exact real roster/setup test/battle-simulator/personnel-decide.test.mjs's own PERFORMANCE
 * test uses (34 real proposals on the party's own decide() call, per that test's own doc comment) —
 * reused here rather than invented, so "the complex map" means the one real, already-measured map. */
export const COMPLEX_MAP_PARTY_FIXTURES = ["lunar-17.json", "tapkey.json", "bennit.json", "vorza-moonshot.json"];
export const COMPLEX_MAP_OPPOSITION_FIXTURES = ["security-goon.json", "xenowarden-greenhorn.json", "erabryth.json", "tough.json"];

/** Wraps `scenario.ai` so every decision made by a PARTY-side combatant is bracketed with real
 * wall-time + sandbox-fork-count instrumentation, pushed into `measurements`; opposition-side
 * decisions pass through completely unmodified — this is deliberately not a generic "profile both
 * sides" tool, matching the file header's own "one policy's real cost, not a blend" design. */
function instrumentPartySide(scenario, measurements) {
  const partyIds = new Set(scenario.combatants.filter((c) => c.side === "party").map((c) => c.id));
  const realAi = scenario.ai;
  return {
    ...scenario,
    ai(state, combatantId, turn) {
      if (!partyIds.has(combatantId)) return realAi(state, combatantId, turn);
      resetSandboxForkCount();
      const t0 = Date.now();
      const decision = realAi(state, combatantId, turn);
      measurements.push({ wallMs: Date.now() - t0, sandboxEvaluations: getSandboxForkCount() });
      return decision;
    }
  };
}

/**
 * Real, per-decision measurements for `policyId` on one arena, across `seeds`. `policyId` must be a
 * real id registered in `ai-common/`'s policy registry (`ai-common/policies/*.mjs`, see this file's
 * own top-level imports for which ones are pulled in) — resolved through `personnel-mirror.mjs`'s /
 * `personnel-complex-battle.mjs`'s own `"policy"` `decisionMode` dispatch (design doc §58), so this
 * file stays a pure consumer, never re-deriving decision logic of its own.
 *
 * @param {object} args
 * @param {string} args.policyId - a real registered policy id, e.g. "greedy-v1"
 * @param {"mirror"|"complex"} args.arena
 * @param {number[]} args.seeds
 * @param {object} [args.budget] - forwarded as the profiled policy's own `options.budget`
 * @param {string[]} [args.roster] - mirror arena only; ignored for "complex" (fixed real roster)
 * @param {number} [args.roundLimit]
 */
export async function profilePolicy({ policyId, arena, seeds, budget, roster, roundLimit }) {
  if (arena !== "mirror" && arena !== "complex") throw new Error(`profilePolicy: unknown arena "${arena}" — expected "mirror" or "complex".`);
  const profiledProfile = Object.freeze({ ...BASELINE_V1, id: `${policyId}-profiled`, decisionMode: "policy", policyId, budget });

  const measurements = [];
  for (const seed of seeds) {
    const scenario = arena === "mirror"
      ? buildMirrorScenario({ seed, roster: roster ?? ["lunar-17.json", "security-goon.json"], partyProfile: profiledProfile, oppositionProfile: BASELINE_V1, roundLimit: roundLimit ?? 30 })
      : buildComplexScenario({
          seed, partyFixtures: COMPLEX_MAP_PARTY_FIXTURES, oppositionFixtures: COMPLEX_MAP_OPPOSITION_FIXTURES,
          setup: "RANDOM_ARCS", roundLimit: roundLimit ?? 40, partyProfile: profiledProfile, oppositionProfile: BASELINE_V1
        });
    runBattle(instrumentPartySide(scenario, measurements));
  }
  return measurements;
}

/** Pure aggregation, matching `tournament-runner.mjs`'s own `aggregateTournament` convention. */
export function aggregateProfile(measurements) {
  const n = measurements.length;
  if (n === 0) throw new Error("aggregateProfile: no measurements supplied — did the arena run zero real decisions?");
  const wallMs = measurements.map((m) => m.wallMs);
  const sandboxEvaluations = measurements.map((m) => m.sandboxEvaluations);
  const mean = (xs) => xs.reduce((sum, x) => sum + x, 0) / xs.length;
  return {
    n,
    meanWallMs: mean(wallMs),
    maxWallMs: Math.max(...wallMs),
    meanSandboxEvaluations: mean(sandboxEvaluations),
    maxSandboxEvaluations: Math.max(...sandboxEvaluations)
  };
}

function formatProfile({ policyId, arena, seedSpec, agg }) {
  return [
    `### Decision-cost profile (design doc §59) — \`${policyId}\` on the ${arena} arena, seeds ${seedSpec}, n=${agg.n} real decisions`,
    "",
    `- Mean wall time per decision: ${agg.meanWallMs.toFixed(2)}ms`,
    `- Max wall time for one decision: ${agg.maxWallMs.toFixed(2)}ms`,
    `- Mean real sandbox evaluations per decision: ${agg.meanSandboxEvaluations.toFixed(1)}`,
    `- Max real sandbox evaluations for one decision: ${agg.maxSandboxEvaluations}`
  ].join("\n");
}

function appendToHistory(entryBody) {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const entry = [`## ${dateStamp} — Decision-cost profile`, "", entryBody, "", "---", ""].join("\n");
  if (!existsSync(historyPath)) {
    writeFileSync(historyPath, "# Battle History\n\nA running, hand-appended-by-script log of real battery runs — design doc §39. Never hand-edited; re-run the relevant analysis script to add a new dated entry.\n\n");
  }
  appendFileSync(historyPath, entry);
}

async function main() {
  const args = {};
  for (const raw of process.argv.slice(2)) {
    const m = /^--([^=]+)=(.*)$/.exec(raw);
    if (!m) throw new Error(`Unrecognized argument: "${raw}" (expected --key=value)`);
    args[m[1]] = m[2];
  }
  const policyId = args.policy ?? "greedy-v1";
  const seedSpec = args.seeds ?? "1-8";
  const seeds = parseSeeds(seedSpec);
  const roster = args.roster ? args.roster.split(",") : undefined;
  const roundLimit = args.roundLimit ? Number(args.roundLimit) : undefined;

  const entryBodies = [];
  for (const arena of ["mirror", "complex"]) {
    console.log(`Profiling "${policyId}" on the ${arena} arena, seeds ${seedSpec}...`);
    const measurements = await profilePolicy({ policyId, arena, seeds, roster, roundLimit });
    const agg = aggregateProfile(measurements);
    const entryBody = formatProfile({ policyId, arena, seedSpec, agg });
    console.log("\n" + entryBody + "\n");
    entryBodies.push(entryBody);
  }
  appendToHistory(entryBodies.join("\n\n"));
  console.log(`\nAppended decision-cost profile to ${path.relative(process.cwd(), historyPath)}`);
}

if (path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] ?? "")) main();
