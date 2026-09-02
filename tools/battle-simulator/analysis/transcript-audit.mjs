/**
 * SYSTEMATIC TRANSCRIPT AUDIT (design doc §53 — the third of Ingram's three approved testing
 * upgrades from the same conversation as §51/§52: "a real, non-cherry-picked sample of battle
 * transcripts... reviewed for a pattern of bad decisions, not just one dramatic battle.")
 *
 * Two real, already-proven, scale-agnostic instruments do the actual measuring — metrics.mjs
 * (utilization/idle rate/verb diversity/decision entropy, design doc §15a) and
 * action-utilization.mjs (illegal-proposal/held-action auditing, design doc §14j), both built and
 * tested against Frame-scale logs originally, confirmed compatible with personnel-scale logs
 * completely unchanged (identical runBattle() log shape — verified directly before writing a line
 * of this file, not assumed). What THIS file adds is new: a real sample generator across a
 * representative spread of real matchups/seeds, and a DETERMINISTIC, pre-declared rule for which of
 * those battles actually get a full manual transcript read — declared once, here, before the sample
 * ever runs, so the choice of what to read can never quietly become after-the-fact cherry-picking.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runBattle } from "../personnel-engine/engine.mjs";
import { buildScenario } from "../scenarios/personnel-mirror.mjs";
import { parseSeeds } from "../run-personnel-scenario.mjs";
import { collectRunMetrics, aggregateMetrics, formatMetrics } from "./metrics.mjs";
import { auditActionUtilization } from "./action-utilization.mjs";
import { ALL_PROFILES, ARCHETYPES } from "../personnel-engine/archetypes.mjs";
import { ANCHOR_BASELINES } from "../personnel-engine/baselines.mjs";
import { BASELINE_V1 } from "../personnel-engine/ai-profiles.mjs";

/**
 * Runs one real battle per (opponent, seed) pair against a fixed party profile/roster, and returns
 * one real, complete record per battle — {opponentId, seed, log, metrics, illegalCount}. Pure aside
 * from real battle execution — no file I/O — so directly testable with a tiny roster/seed set rather
 * than needing the full real sample.
 */
export function runAuditSample({ roster, partyProfile, opponents, seedSpec, roundLimit = 30 }) {
  const seeds = parseSeeds(seedSpec);
  const results = [];
  for (const opponent of opponents) {
    for (const seed of seeds) {
      const scenario = buildScenario({ seed, roster, partyProfile, oppositionProfile: opponent, roundLimit });
      const log = runBattle(scenario);
      const metrics = collectRunMetrics(log);
      const illegalCount = auditActionUtilization(log).flagged.filter((f) => f.category === "illegalProposal").length;
      results.push({ opponentId: opponent.id, seed, log, metrics, illegalCount });
    }
  }
  return results;
}

/**
 * Which battles get a full manual transcript read. Five deterministic rules — declared here, once,
 * not chosen after seeing what a run produced:
 *   1. ANY battle with a real illegal proposal — a hard engine invariant, always read regardless of
 *      anything else.
 *   2. Per opponent, the single LOWEST decisionEntropy battle — the most "robotic," least varied
 *      real play in that matchup.
 *   3. Per opponent, the single HIGHEST idleTurnRate battle — only if idleTurnRate is actually > 0
 *      somewhere in that matchup; nothing to flag if it never happened at all.
 *   4. The single longest (most-rounds) battle across the WHOLE sample — the likeliest real
 *      stalemate/oscillation candidate.
 *   5. Seed `baselineSeed` (default 1) of EVERY opponent, unconditionally — a fixed, metrics-BLIND
 *      sample, so a real failure mode the metrics themselves don't happen to capture still gets a
 *      real chance of being seen, not just whatever the metrics already know to flag.
 * Returns a deduplicated array of {opponentId, seed, reasons: string[]} — a battle flagged by more
 * than one rule carries every real reason it was picked, not just the first one found.
 */
export function selectForManualReview(results, { baselineSeed = 1 } = {}) {
  const picks = new Map();
  const pick = (r, reason) => {
    const key = `${r.opponentId}|${r.seed}`;
    if (!picks.has(key)) picks.set(key, { opponentId: r.opponentId, seed: r.seed, reasons: new Set() });
    picks.get(key).reasons.add(reason);
  };

  for (const r of results) {
    if (r.illegalCount > 0) pick(r, `${r.illegalCount} real illegal proposal(s)`);
  }

  const byOpponent = new Map();
  for (const r of results) {
    if (!byOpponent.has(r.opponentId)) byOpponent.set(r.opponentId, []);
    byOpponent.get(r.opponentId).push(r);
  }
  for (const group of byOpponent.values()) {
    const lowestEntropy = group.reduce((a, b) => (b.metrics.decisionEntropy < a.metrics.decisionEntropy ? b : a));
    pick(lowestEntropy, `lowest decisionEntropy in this matchup (${lowestEntropy.metrics.decisionEntropy.toFixed(2)} bits)`);

    const idleCandidates = group.filter((r) => r.metrics.idleTurnRate > 0);
    if (idleCandidates.length) {
      const highestIdle = idleCandidates.reduce((a, b) => (b.metrics.idleTurnRate > a.metrics.idleTurnRate ? b : a));
      pick(highestIdle, `highest idleTurnRate in this matchup (${(highestIdle.metrics.idleTurnRate * 100).toFixed(1)}%)`);
    }

    const baseline = group.find((r) => r.seed === baselineSeed);
    if (baseline) pick(baseline, `fixed baseline sample (seed ${baselineSeed})`);
  }

  if (results.length) {
    const longest = results.reduce((a, b) => (b.metrics.rounds > a.metrics.rounds ? b : a));
    pick(longest, `longest battle in the whole sample (${longest.metrics.rounds} rounds)`);
  }

  return [...picks.values()].map((p) => ({ ...p, reasons: [...p.reasons] }));
}

/** One battle's full action-by-action transcript, using decide()'s own real logged
 * `decisionReason` per action — the actual reason the AI gave at the time, not a guess reconstructed
 * after the fact from the action alone. */
export function renderTranscript({ opponentId, seed, log }) {
  const lines = [`=== ${opponentId}, seed ${seed} — outcome: ${log.outcome?.result ?? "timeout"} after ${log.rounds.length} round(s) ===`];
  for (const round of log.rounds) {
    for (const turn of round.turns) {
      for (const action of turn.actions ?? []) {
        const legality = action.legal === false ? " [ILLEGAL]" : "";
        lines.push(`R${round.round} ${turn.combatantId}: ${action.decisionReason ?? action.type}${legality}`);
      }
    }
  }
  return lines.join("\n");
}

/** The real default sample this audit actually runs with, absent CLI overrides: baseline-v1 against
 * every archetype AND every anchor baseline (design doc §48/§51) — not just archetypes, since a
 * "robotic" or "idle" pattern against an anchor is just as real a finding as one against a peer. */
function defaultOpponents() {
  return [...Object.values(ARCHETYPES), ...Object.values(ANCHOR_BASELINES)];
}

async function main() {
  const args = {};
  for (const raw of process.argv.slice(2)) {
    const m = /^--([^=]+)=(.*)$/.exec(raw);
    if (m) args[m[1]] = m[2];
  }
  const roster = (args.roster ?? "lunar-17.json,security-goon.json").split(",");
  const partyProfile = ALL_PROFILES[args.party ?? "baseline-v1"] ?? BASELINE_V1;
  const seedSpec = args.seeds ?? "1-6";
  const opponents = defaultOpponents();

  console.log(`Running the audit sample: ${partyProfile.id} vs. ${opponents.length} real opponents, seeds ${seedSpec} (${opponents.length * parseSeeds(seedSpec).length} battles)...`);
  const results = runAuditSample({ roster, partyProfile, opponents, seedSpec });

  console.log("\n--- Per-opponent metrics ---");
  const byOpponent = new Map();
  for (const r of results) {
    if (!byOpponent.has(r.opponentId)) byOpponent.set(r.opponentId, []);
    byOpponent.get(r.opponentId).push(r.metrics);
  }
  for (const [opponentId, metricsList] of byOpponent) {
    console.log(`\n${opponentId}:`);
    console.log(formatMetrics(aggregateMetrics(metricsList)));
  }

  const picks = selectForManualReview(results);
  console.log(`\n--- ${picks.length} battle(s) selected for manual transcript review ---`);
  const transcriptLines = [];
  for (const p of picks) {
    const full = results.find((r) => r.opponentId === p.opponentId && r.seed === p.seed);
    console.log(`${p.opponentId}, seed ${p.seed}: ${p.reasons.join("; ")}`);
    transcriptLines.push(`# ${p.opponentId}, seed ${p.seed}\n# Reasons: ${p.reasons.join("; ")}\n${renderTranscript(full)}\n`);
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  const outPath = path.join(here, "audit-transcripts.log");
  writeFileSync(outPath, transcriptLines.join("\n"));
  console.log(`\nFull transcripts for every selected battle written to ${path.relative(process.cwd(), outPath)}`);
}

if (path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] ?? "")) main();
