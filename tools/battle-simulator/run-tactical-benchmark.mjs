/**
 * THE TACTICAL BENCHMARK (design doc §17) — the harness that answers "is this AI any good?",
 * as opposed to run-scenario.mjs's "what happened in this one battle?".
 *
 * Two independent bodies of evidence, because neither is sufficient alone:
 *
 *  MODE 1 — BEHAVIOUR. Run each archetype across N seeds with the real AI on both sides and report
 *  analysis/tactical-metrics.mjs's numbers. This says WHAT the AI does: whether it focuses fire,
 *  whether it respects the multiple attack penalty, whether it shoots the dangerous enemy, whether
 *  it paces in circles, whether it ever fires its one-shot weapons.
 *
 *  MODE 2 — HEAD-TO-HEAD. Play the real AI against each naive baseline (ai/baselines.mjs) and
 *  report win rates. This says whether any of that behaviour is WORTH anything. Behaviour metrics
 *  can be gamed by a policy that looks disciplined and loses; win rate cannot.
 *
 *  THE SIDE-SWAP CONTROL, which mode 2 always applies: every matchup is played twice, once with
 *  the real AI on the party side and once with it on the opposition side, and the reported win
 *  rate pools both. Without this control a party-side advantage baked into the scenario (better
 *  starting position, a favourable initiative tie-break) would be indistinguishable from the AI
 *  actually being better, and the number would flatter whichever side the real AI happened to be
 *  assigned. Any large gap between the two directions is itself a finding, so both are printed.
 *
 * Usage:
 *   node run-tactical-benchmark.mjs                        both modes, all archetypes, 8 seeds
 *   node run-tactical-benchmark.mjs --mode=behaviour       behaviour metrics only
 *   node run-tactical-benchmark.mjs --mode=head-to-head    win rates only
 *   node run-tactical-benchmark.mjs --archetype=swarm,mirror --seeds=20
 */
import { runBattle } from "./engine/engine.mjs";
import { ARCHETYPES } from "./scenarios/archetypes.mjs";
import { BASELINES } from "./ai/baselines.mjs";
import { collectTacticalMetrics, formatTacticalMetrics } from "./analysis/tactical-metrics.mjs";
import { collectRunMetrics } from "./analysis/metrics.mjs";

function parseArgs(argv) {
  const args = { mode: "both", archetypes: Object.keys(ARCHETYPES), seeds: 8 };
  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    if (key === "mode") args.mode = value;
    if (key === "archetype") args.archetypes = value.split(",");
    if (key === "seeds") args.seeds = Number(value);
  }
  return args;
}

/** Who won, from the PARTY's point of view, reduced to one of three values. */
function partyResult(log) {
  const r = log.outcome?.result;
  if (r === "party-victory") return "win";
  if (r === "party-defeat") return "loss";
  return "draw"; // timeout or stalemate — deliberately not scored as a win for either side
}

function runBehaviourMode(archetypeNames, seedCount) {
  console.log("=".repeat(100));
  console.log("MODE 1 — BEHAVIOUR: real AI on both sides. What does it actually do?");
  console.log("=".repeat(100));

  for (const name of archetypeNames) {
    const build = ARCHETYPES[name];
    if (!build) { console.log(`\n[skip] unknown archetype "${name}"`); continue; }

    const aggregate = { switchPairs: 0, switches: 0, thirdAttacks: 0, totalAttacks: 0, firstDamageRounds: [], worstExploration: 1, resourceSpent: 0, resourceTracked: 0, correlations: [], outcomes: {}, utilization: [], idleRate: [] };

    for (let i = 0; i < seedCount; i++) {
      const seed = 5000 + i;
      const log = runBattle(build({ seed }));
      const tm = collectTacticalMetrics(log);
      const rm = collectRunMetrics(log);

      aggregate.switchPairs += tm.focusFire.consecutiveAttackPairs;
      aggregate.switches += tm.focusFire.switchesWithTargetAlive;
      aggregate.thirdAttacks += tm.mapDiscipline.byPenalty["10"].attempts;
      aggregate.totalAttacks += tm.mapDiscipline.totalAttacks;
      if (tm.engagement.firstDamageRound !== null) aggregate.firstDamageRounds.push(tm.engagement.firstDamageRound);
      aggregate.worstExploration = Math.min(aggregate.worstExploration, tm.oscillation.worstExplorationRatio);
      aggregate.resourceSpent += tm.resourceUse.spent;
      aggregate.resourceTracked += tm.resourceUse.tracked;
      if (tm.threatPriority.threatAttackCorrelation !== null) aggregate.correlations.push(tm.threatPriority.threatAttackCorrelation);
      const outcome = log.outcome?.result ?? "timeout";
      aggregate.outcomes[outcome] = (aggregate.outcomes[outcome] ?? 0) + 1;
      aggregate.utilization.push(rm.utilization);
      aggregate.idleRate.push(rm.idleTurnRate);
    }

    const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
    const pct = (x) => (x == null ? "n/a" : (x * 100).toFixed(1) + "%");
    const num = (x) => (x == null ? "n/a" : x.toFixed(2));

    console.log(`\n--- ${name}  (${seedCount} seeds) ---`);
    console.log(`  outcomes:        ${JSON.stringify(aggregate.outcomes)}`);
    console.log(`  focusFire:       switchRate=${pct(aggregate.switchPairs ? aggregate.switches / aggregate.switchPairs : null)}  (${aggregate.switches}/${aggregate.switchPairs} follow-up attacks abandoned a living target)`);
    console.log(`  mapDiscipline:   thirdAttackShare=${pct(aggregate.totalAttacks ? aggregate.thirdAttacks / aggregate.totalAttacks : null)}  (${aggregate.thirdAttacks}/${aggregate.totalAttacks} attacks taken at -10 MAP)`);
    console.log(`  threatPriority:  meanCorrelation=${num(mean(aggregate.correlations))}  (+1 = always shot the most dangerous, 0 = unrelated to danger)`);
    console.log(`  engagement:      meanFirstDamageRound=${num(mean(aggregate.firstDamageRounds))}  (never engaged in ${seedCount - aggregate.firstDamageRounds.length}/${seedCount} battles)`);
    console.log(`  oscillation:     worstExplorationRatio=${num(aggregate.worstExploration)}  (1.0 = every move went somewhere new)`);
    console.log(`  resourceUse:     ${aggregate.resourceSpent}/${aggregate.resourceTracked} limited-use options ever fired`);
    console.log(`  actionEconomy:   utilization=${pct(mean(aggregate.utilization))}  idleTurnRate=${pct(mean(aggregate.idleRate))}`);
  }
}

function runHeadToHeadMode(archetypeNames, seedCount) {
  console.log("\n" + "=".repeat(100));
  console.log("MODE 2 — HEAD-TO-HEAD: real AI vs naive baselines, played in BOTH directions.");
  console.log("A system worth keeping beats 'attack the nearest thing'. If it only ties, the evaluator bought nothing.");
  console.log("=".repeat(100));

  for (const name of archetypeNames) {
    const build = ARCHETYPES[name];
    if (!build) continue;
    console.log(`\n--- ${name} ---`);

    for (const [baselineName, baselineFn] of Object.entries(BASELINES)) {
      let realWins = 0, baselineWins = 0, draws = 0;
      const perDirection = {};

      for (const direction of ["real-as-party", "real-as-opposition"]) {
        let dirReal = 0, dirBase = 0, dirDraw = 0;
        for (let i = 0; i < seedCount; i++) {
          const seed = 6000 + i;
          const scenario = direction === "real-as-party"
            ? build({ seed, oppositionAI: baselineFn })
            : build({ seed, partyAI: baselineFn });
          const result = partyResult(runBattle(scenario));

          const realWon = direction === "real-as-party" ? result === "win" : result === "loss";
          const baseWon = direction === "real-as-party" ? result === "loss" : result === "win";
          if (result === "draw") { draws++; dirDraw++; }
          else if (realWon) { realWins++; dirReal++; }
          else if (baseWon) { baselineWins++; dirBase++; }
        }
        perDirection[direction] = `${dirReal}W-${dirBase}L-${dirDraw}D`;
      }

      const decisive = realWins + baselineWins;
      const winRate = decisive > 0 ? realWins / decisive : null;
      const label = winRate === null ? "no decisive games" : `${(winRate * 100).toFixed(0)}% of decisive games`;
      console.log(`  vs ${baselineName.padEnd(8)} real ${String(realWins).padStart(3)}W  base ${String(baselineWins).padStart(3)}L  draw ${String(draws).padStart(3)}  -> ${label}`);
      console.log(`     ${" ".repeat(8)} by direction: real-as-party ${perDirection["real-as-party"]}, real-as-opposition ${perDirection["real-as-opposition"]}`);
    }
  }
}

const args = parseArgs(process.argv.slice(2));
console.log(`tactical benchmark — archetypes=[${args.archetypes.join(", ")}] seeds=${args.seeds} mode=${args.mode}\n`);
if (args.mode === "behaviour" || args.mode === "both") runBehaviourMode(args.archetypes, args.seeds);
if (args.mode === "head-to-head" || args.mode === "both") runHeadToHeadMode(args.archetypes, args.seeds);
