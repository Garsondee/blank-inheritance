/**
 * THE ABLATION HARNESS (design doc §18) — "does every layer earn its place?"
 *
 * run-tactical-benchmark.mjs answers "is the AI better than nothing" (baselines) and "what does it
 * do" (behaviour metrics). Neither tells you WHICH PIECE of the evaluator is responsible. This
 * harness isolates that: take the real, full-strength AI, zero out exactly ONE weight term (or
 * one other named mechanism), and re-measure head-to-head win rate against the `greedy` baseline
 * — the strongest, most informative opponent per design doc §17's own findings. If the win rate
 * doesn't measurably drop when a term is removed, that term isn't paying for the complexity it adds.
 *
 * WHY GREEDY SPECIFICALLY, AND WHY WIN RATE SPECIFICALLY: greedy is the hardest baseline to beat
 * (§17: the real AI lost to it worse than to `nearest`), so it has the most headroom to reveal a
 * regression. Win rate is used instead of a behaviour metric because behaviour metrics can look
 * fine while losing (§17's own headline finding) — an ablation that "still focuses fire" but wins
 * less is still a real regression, and only the win rate would show it.
 *
 * SCOPE, STATED HONESTLY: every weight in DEFAULT_WEIGHTS is ablated, plus competence (does the
 * softmax knob matter at all). Belief/fog-of-war is NOT ablated here — every archetype in this
 * battery is open-field with no `vision` field on any combatant, so belief is a PROVABLE NO-OP in
 * every one of these scenarios (ai/knowledge/belief.mjs's own refreshBelief falls back to ground
 * truth when nothing restricts vision). Ablating a no-op would report "0% impact" and that would
 * be true but misleading — it would look like evidence belief doesn't matter, when actually this
 * harness simply cannot see it. Measuring belief's real contribution needs a walled or vision-
 * restricted scenario, which is out of scope for the open-field archetype battery on purpose (see
 * scenarios/archetypes.mjs's own header) and is left as a documented gap, not silently skipped.
 *
 * Usage:
 *   node run-ablation.mjs                              all weights + competence, swarm + range-asymmetry, 6 seeds
 *   node run-ablation.mjs --archetype=swarm --seeds=10
 *   node run-ablation.mjs --weight=offensiveReach,closing
 */
import { runBattle } from "./engine/engine.mjs";
import { decide } from "./ai/decide.mjs";
import { DEFAULT_WEIGHTS } from "./ai/evaluate/state-value.mjs";
import { ARCHETYPES, COMPETENCE } from "./scenarios/archetypes.mjs";
import { greedyDamageBaseline } from "./ai/baselines.mjs";

function parseArgs(argv) {
  const args = { archetypes: ["swarm", "range-asymmetry"], seeds: 6, weights: Object.keys(DEFAULT_WEIGHTS) };
  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    if (key === "archetype") args.archetypes = value.split(",");
    if (key === "seeds") args.seeds = Number(value);
    if (key === "weight") args.weights = value.split(",");
  }
  return args;
}

function partyResult(log) {
  const r = log.outcome?.result;
  if (r === "party-victory") return "win";
  if (r === "party-defeat") return "loss";
  return "draw";
}

/** Win rate of `candidateAI` against `greedyDamageBaseline`, pooled across both side-swap directions. */
function winRateVsGreedy(build, candidateAI, seedCount, seedBase) {
  let wins = 0, losses = 0, draws = 0;
  for (const direction of ["candidate-as-party", "candidate-as-opposition"]) {
    for (let i = 0; i < seedCount; i++) {
      const seed = seedBase + i;
      const scenario = direction === "candidate-as-party"
        ? build({ seed, partyAI: candidateAI, oppositionAI: greedyDamageBaseline })
        : build({ seed, partyAI: greedyDamageBaseline, oppositionAI: candidateAI });
      const result = partyResult(runBattle(scenario));
      const candidateWon = direction === "candidate-as-party" ? result === "win" : result === "loss";
      const candidateLost = direction === "candidate-as-party" ? result === "loss" : result === "win";
      if (result === "draw") draws++;
      else if (candidateWon) wins++;
      else if (candidateLost) losses++;
    }
  }
  const decisive = wins + losses;
  return { wins, losses, draws, winRate: decisive > 0 ? wins / decisive : null, decisive };
}

function fullStrengthAI(state, combatantId, turn) {
  return decide(state, combatantId, turn, { competence: COMPETENCE });
}

function formatResult(r) {
  if (r.winRate === null) return `${r.wins}W-${r.losses}L-${r.draws}D (no decisive games)`;
  return `${r.wins}W-${r.losses}L-${r.draws}D -> ${(r.winRate * 100).toFixed(0)}%`;
}

const args = parseArgs(process.argv.slice(2));
console.log(`ablation harness — archetypes=[${args.archetypes.join(", ")}] seeds=${args.seeds} weights=[${args.weights.join(", ")}]\n`);
console.log("Baseline: full-strength AI (all weights, competence=" + COMPETENCE + ") vs greedy.");
console.log("Each row below: same AI with ONE thing removed. A win rate that doesn't drop means that thing isn't earning its keep.\n");

for (const archetypeName of args.archetypes) {
  const build = ARCHETYPES[archetypeName];
  if (!build) { console.log(`[skip] unknown archetype "${archetypeName}"`); continue; }
  console.log("=".repeat(90));
  console.log(`ARCHETYPE: ${archetypeName}`);
  console.log("=".repeat(90));

  const fullStrength = winRateVsGreedy(build, fullStrengthAI, args.seeds, 8000);
  const fullPct = fullStrength.winRate === null ? null : fullStrength.winRate * 100;
  console.log(`  [baseline] full strength         ${formatResult(fullStrength)}`);

  for (const weightKey of args.weights) {
    if (!(weightKey in DEFAULT_WEIGHTS)) { console.log(`  [skip] unknown weight "${weightKey}"`); continue; }
    const ablatedWeights = { ...DEFAULT_WEIGHTS, [weightKey]: 0 };
    const ablatedAI = (state, combatantId, turn) => decide(state, combatantId, turn, { competence: COMPETENCE, weights: ablatedWeights });
    const result = winRateVsGreedy(build, ablatedAI, args.seeds, 8000);
    const pct = result.winRate === null ? null : result.winRate * 100;
    const delta = pct !== null && fullPct !== null ? pct - fullPct : null;
    const deltaLabel = delta === null ? "" : delta <= -5 ? `  ↓${Math.abs(delta).toFixed(0)}pp — this term is earning its keep` : delta >= 5 ? `  ↑${delta.toFixed(0)}pp — removing this HELPED` : `  ~flat`;
    console.log(`  [ablated]  ${weightKey.padEnd(22)} ${formatResult(result)}${deltaLabel}`);
  }

  // Competence ablation: does the softmax knob matter, independent of any weight term?
  const lowCompetenceAI = (state, combatantId, turn) => decide(state, combatantId, turn, { competence: 0.4, weights: DEFAULT_WEIGHTS });
  const competenceResult = winRateVsGreedy(build, lowCompetenceAI, args.seeds, 8000);
  const cPct = competenceResult.winRate === null ? null : competenceResult.winRate * 100;
  const cDelta = cPct !== null && fullPct !== null ? cPct - fullPct : null;
  const cLabel = cDelta === null ? "" : cDelta <= -5 ? `  ↓${Math.abs(cDelta).toFixed(0)}pp — competence knob matters` : `  ~flat — competence knob may not matter here`;
  console.log(`  [ablated]  competence(0.4 vs 0.88)   ${formatResult(competenceResult)}${cLabel}`);
  console.log();
}

console.log("NOT MEASURED (out of scope for this harness — see header): belief/fog-of-war (provable");
console.log("no-op in every open-field archetype; needs a vision-restricted scenario to test for real).");
