/**
 * PARALLEL TOURNAMENT RUNNER (design doc §47, the "Archetype Ladder" plan's own Stage B: "a compact
 * same-roster arena, worker-thread fan-out, a win-rate matrix appended to battle-history.md").
 *
 * Runs a real mirror match (personnel-mirror.mjs) across a seed range and reports which of two
 * named AI profiles wins more. Battles are pure and seed-deterministic (no shared state, no I/O
 * mid-battle) — "embarrassingly parallel" per the Archetype Ladder artifact's own §04 cost-lever
 * analysis — so this fans them out across real OS threads via `worker_threads`
 * (`tournament-worker.mjs` is the actual per-battle work; see that file for why it has to be a
 * separate module rather than an inlined function).
 *
 * `runTournamentSequential` exists for two real reasons, not as a convenience wrapper: (1) it's the
 * ground truth `runTournamentParallel`'s own test proves itself against — same seeds, same profiles,
 * byte-identical real outcomes, since determinism means the only thing worker fan-out is allowed to
 * change is wall-clock time; (2) it's what actually demonstrates the parallel version is faster,
 * which this file's own CLI prints on every real run.
 *
 * Run: node tools/battle-simulator/analysis/tournament-runner.mjs --roster=lunar-17.json,security-goon.json --party=baseline-v1 --opposition=no-maneuvers-v1 --seeds=1-20
 * Appends one dated section to analysis/battle-history.md — same accumulating-file design already
 * established (design doc §39), never overwritten, never hand-edited.
 */
import { Worker } from "node:worker_threads";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import { runBattle } from "../personnel-engine/engine.mjs";
import { buildScenario } from "../scenarios/personnel-mirror.mjs";
import { parseSeeds } from "../run-personnel-scenario.mjs";
import { ALL_PROFILES } from "../personnel-engine/archetypes.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const workerPath = path.join(here, "tournament-worker.mjs");
const historyPath = path.join(here, "battle-history.md");

/** Half of `os.cpus().length` (a real, measured choice, not a guess): on this project's own dev
 * machine (16 logical/8 physical AMD Ryzen 7 5800H cores), a 100-seed tournament at concurrency=15
 * (`cpus().length - 1`) took 8251ms — but the SAME tournament at concurrency=4 took 6697ms, FASTER
 * with fewer threads, because this workload is real CPU-bound compute (dice rolls, state-value
 * scoring, turn-template search), not I/O — oversubscribing past the physical core count makes
 * threads contend for the same execution units rather than adding real throughput. Every caller can
 * still override `concurrency` explicitly; this is just a more honest default than "every logical
 * core," which this project's own measurement showed actively regresses. */
export const DEFAULT_CONCURRENCY = Math.max(1, Math.floor(os.cpus().length / 2));

/**
 * A real PERSISTENT worker pool, not `Promise.all(seeds.map(...))` (one OS thread per seed
 * simultaneously — thrashes the scheduler once a tournament grows past `concurrency`) and not a
 * fresh `new Worker()` per seed either (a real measurement found ~80ms of thread/module startup per
 * spawn, comparable to a single battle's own runtime — see tournament-worker.mjs's own comment).
 * `concurrency` workers are spawned ONCE and each pulls the next unclaimed seed off a shared cursor
 * until none remain, replying with one result per job over its whole lifetime — startup cost paid
 * once per worker, not once per battle.
 */
export async function runTournamentParallel({ roster, partyProfile, oppositionProfile, seedSpec, roundLimit = 30, concurrency = DEFAULT_CONCURRENCY, onProgress } = {}) {
  const seeds = parseSeeds(seedSpec);
  const results = new Array(seeds.length);
  let nextIndex = 0;
  const poolSize = Math.min(concurrency, seeds.length);
  const workers = Array.from({ length: poolSize }, () => new Worker(workerPath));

  try {
    await Promise.all(workers.map((worker) => new Promise((resolve, reject) => {
      worker.on("error", reject);
      function assignNext() {
        if (nextIndex >= seeds.length) { resolve(); return; }
        const seedIndex = nextIndex++;
        const seed = seeds[seedIndex];
        worker.once("message", (result) => {
          results[seedIndex] = result;
          onProgress?.({ type: "seedComplete", seedIndex, seedTotal: seeds.length, ...result });
          assignNext();
        });
        worker.postMessage({ seed, roster, partyProfile, oppositionProfile, roundLimit });
      }
      assignNext();
    })));
  } finally {
    await Promise.all(workers.map((worker) => worker.terminate()));
  }
  return results;
}

/** The same tournament, run in-thread with no worker overhead at all — the ground truth
 * `runTournamentParallel` is verified against, and the baseline its own speedup is measured from. */
export function runTournamentSequential({ roster, partyProfile, oppositionProfile, seedSpec, roundLimit = 30, onProgress } = {}) {
  const seeds = parseSeeds(seedSpec);
  return seeds.map((seed, seedIndex) => {
    const t0 = Date.now();
    const scenario = buildScenario({ seed, roster, partyProfile, oppositionProfile, roundLimit });
    const log = runBattle(scenario);
    const result = { seed, outcome: log.outcome.result, rounds: log.rounds.length, elapsedMs: Date.now() - t0 };
    onProgress?.({ type: "seedComplete", seedIndex, seedTotal: seeds.length, ...result });
    return result;
  });
}

export function logProgress(event) {
  console.log(`[${event.seedIndex + 1}/${event.seedTotal}] seed ${event.seed}: ${event.outcome} in ${event.rounds} rounds (${event.elapsedMs}ms)`);
}

/** Real win-rate matrix from a tournament's results — `party` here means "the side wearing
 * `partyProfile`," not the campaign's own PC party; a mirror match's "party"/"opposition" split is
 * purely which profile was assigned to which side. */
export function aggregateTournament(results) {
  const n = results.length;
  if (n === 0) throw new Error("aggregateTournament: no results supplied");
  const outcomes = {};
  for (const r of results) outcomes[r.outcome] = (outcomes[r.outcome] ?? 0) + 1;
  const meanRounds = results.reduce((sum, r) => sum + r.rounds, 0) / n;
  const meanElapsedMs = results.reduce((sum, r) => sum + r.elapsedMs, 0) / n;
  return {
    n,
    outcomes,
    partyWinRate: (outcomes["party-victory"] ?? 0) / n,
    oppositionWinRate: (outcomes["party-defeat"] ?? 0) / n,
    timeoutRate: (outcomes["timeout"] ?? 0) / n,
    meanRounds,
    meanElapsedMs
  };
}

function pct(x) { return (x * 100).toFixed(1) + "%"; }

function formatTournament({ rosterLabel, partyProfile, oppositionProfile, seedSpec, agg, speedup }) {
  const lines = [
    `### Mirror-match tournament (design doc §47) — ${rosterLabel}, seeds ${seedSpec}, n=${agg.n}`,
    "",
    `\`${partyProfile.id}\` (party) vs. \`${oppositionProfile.id}\` (opposition) — identical roster on both sides, only the AI profile differs.`,
    "",
    `- ${partyProfile.id} win rate: ${pct(agg.partyWinRate)}`,
    `- ${oppositionProfile.id} win rate: ${pct(agg.oppositionWinRate)}`,
    `- Timeout rate: ${pct(agg.timeoutRate)}`,
    `- Mean rounds to resolution: ${agg.meanRounds.toFixed(1)}`
  ];
  if (speedup) lines.push("", `Parallel tournament runner (worker_threads, concurrency=${speedup.concurrency}): ${speedup.parallelMs}ms vs. ${speedup.sequentialMs}ms sequential — ${speedup.factor.toFixed(1)}x.`);
  return lines.join("\n");
}

function appendToHistory(entryBody) {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const entry = [`## ${dateStamp} — Mirror-match tournament`, "", entryBody, "", "---", ""].join("\n");
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
  const roster = (args.roster ?? "lunar-17.json,security-goon.json").split(",");
  const partyProfile = ALL_PROFILES[args.party ?? "baseline-v1"];
  const oppositionProfile = ALL_PROFILES[args.opposition ?? "no-maneuvers-v1"];
  if (!partyProfile) throw new Error(`Unknown --party profile "${args.party}" — known: ${Object.keys(ALL_PROFILES).join(", ")}`);
  if (!oppositionProfile) throw new Error(`Unknown --opposition profile "${args.opposition}" — known: ${Object.keys(ALL_PROFILES).join(", ")}`);
  const seedSpec = args.seeds ?? "1-20";
  const roundLimit = args.roundLimit ? Number(args.roundLimit) : 30;

  console.log(`Running ${parseSeeds(seedSpec).length} mirror-match seeds, ${roster.join("+")}, ${partyProfile.id} vs. ${oppositionProfile.id}, concurrency=${DEFAULT_CONCURRENCY}...`);
  const parallelT0 = Date.now();
  const results = await runTournamentParallel({ roster, partyProfile, oppositionProfile, seedSpec, roundLimit, onProgress: logProgress });
  const parallelMs = Date.now() - parallelT0;

  console.log("Re-running the same seeds sequentially, to measure the real speedup...");
  const sequentialT0 = Date.now();
  runTournamentSequential({ roster, partyProfile, oppositionProfile, seedSpec, roundLimit });
  const sequentialMs = Date.now() - sequentialT0;

  const agg = aggregateTournament(results);
  const speedup = { concurrency: DEFAULT_CONCURRENCY, parallelMs, sequentialMs, factor: sequentialMs / parallelMs };
  const entryBody = formatTournament({ rosterLabel: roster.join("+"), partyProfile, oppositionProfile, seedSpec, agg, speedup });
  console.log("\n" + entryBody);
  appendToHistory(entryBody);
  console.log(`\nAppended tournament results to ${path.relative(process.cwd(), historyPath)}`);
}

if (path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] ?? "")) main();
