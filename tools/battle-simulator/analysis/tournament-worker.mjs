/**
 * A PERSISTENT tournament-runner.mjs worker (design doc §47, Stage B). Deliberately long-lived, not
 * spawn-one-per-battle: a real measurement (this file's own git history / design doc §47) found
 * spawning a fresh worker per seed costs ~80ms just for thread/module startup — comparable to a
 * single mirror-match battle's own runtime — which ate most of the theoretical parallel speedup.
 * Spawning `concurrency` workers ONCE and feeding each a stream of seeds over its lifetime amortizes
 * that startup cost across the whole tournament instead of paying it per battle.
 *
 * Protocol: the parent posts one job `{seed, roster, partyProfile, oppositionProfile, roundLimit}`
 * at a time; this worker replies with one result and waits for the next job. The parent decides when
 * to stop feeding jobs and terminates the worker itself — this file has no shutdown message of its
 * own, since `Worker#terminate()` is the real, already-available primitive for that.
 */
import { parentPort } from "node:worker_threads";
import { runBattle } from "../personnel-engine/engine.mjs";
import { buildScenario } from "../scenarios/personnel-mirror.mjs";

parentPort.on("message", (job) => {
  const t0 = Date.now();
  const scenario = buildScenario(job);
  const log = runBattle(scenario);
  parentPort.postMessage({
    seed: job.seed,
    outcome: log.outcome.result,
    rounds: log.rounds.length,
    elapsedMs: Date.now() - t0
  });
});
