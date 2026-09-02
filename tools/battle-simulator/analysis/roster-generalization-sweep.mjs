/**
 * ROSTER GENERALIZATION SWEEP (design doc §54 — every real result the Archetype Ladder has produced
 * so far, from Stage B through the anchor baselines (§46-§51), was measured on exactly ONE roster:
 * lunar-17.json + security-goon.json. An AI that only looks strong against one hand-picked pair of
 * fixtures is a much weaker claim than one that holds up broadly — this was explicitly flagged as
 * not-yet-done in §51's own "Beyond this immediate scope" note.
 *
 * Reuses tournament-runner.mjs's own real, already-tested machinery (`runTournamentParallel`,
 * `aggregateTournament`) completely unchanged — this file is thin orchestration over a real matchup
 * matrix (several rosters × every archetype/anchor), not a new measuring instrument.
 *
 * Run: node tools/battle-simulator/analysis/roster-generalization-sweep.mjs \
 *   --rosters="bennit.json+erabryth.json,tough.json+xenowarden-greenhorn.json" --seeds=1-24
 * Appends one dated section per roster to battle-history.md, same accumulating-file convention as
 * tournament-runner.mjs and weight-search.mjs already use.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import { runTournamentParallel, aggregateTournament, DEFAULT_CONCURRENCY } from "./tournament-runner.mjs";
import { ALL_PROFILES, ARCHETYPES } from "../personnel-engine/archetypes.mjs";
import { ANCHOR_BASELINES } from "../personnel-engine/baselines.mjs";
import { BASELINE_V1 } from "../personnel-engine/ai-profiles.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const historyPath = path.join(here, "battle-history.md");

function pct(x) { return (x * 100).toFixed(1) + "%"; }

/** Every real opponent id this sweep checks against, absent an explicit --opponents override: every
 * archetype (§48) AND every anchor baseline (§51) — the same real default transcript-audit.mjs uses. */
function defaultOpponentIds() {
  return [...Object.values(ARCHETYPES), ...Object.values(ANCHOR_BASELINES)].map((p) => p.id);
}

/**
 * Runs `partyProfile` (mirror match, §46) against every id in `opponentIds` on one roster, and
 * returns one real row per matchup: {opponentId, agg}. Pure orchestration — every real number comes
 * from `runTournamentParallel`/`aggregateTournament`, unchanged.
 */
export async function sweepOneRoster({ roster, partyProfile, opponentIds, seedSpec, roundLimit = 30 }) {
  const rows = [];
  for (const opponentId of opponentIds) {
    const oppositionProfile = ALL_PROFILES[opponentId];
    if (!oppositionProfile) throw new Error(`Unknown opponent profile id "${opponentId}" — known: ${Object.keys(ALL_PROFILES).join(", ")}`);
    const results = await runTournamentParallel({ roster, partyProfile, oppositionProfile, seedSpec, roundLimit });
    rows.push({ opponentId, agg: aggregateTournament(results) });
  }
  return rows;
}

/** One roster's real results as a markdown table — the only formatting logic in this file. */
export function formatRosterSweep({ rosterLabel, partyId, rows, seedSpec }) {
  const lines = [
    `### Roster generalization sweep (design doc §54) — ${rosterLabel}, seeds ${seedSpec}, n=${rows[0]?.agg.n ?? "?"}`,
    "",
    `\`${partyId}\` (party) vs. every real archetype/anchor (opposition) — same mirror-match apparatus as every prior Archetype Ladder result, on a roster NONE of those prior results were ever measured against.`,
    "",
    "| Opponent | party win rate | opponent win rate | timeout | mean rounds |",
    "|---|---|---|---|---|"
  ];
  for (const { opponentId, agg } of rows) {
    lines.push(`| \`${opponentId}\` | ${pct(agg.partyWinRate)} | ${pct(agg.oppositionWinRate)} | ${pct(agg.timeoutRate)} | ${agg.meanRounds.toFixed(1)} |`);
  }
  return lines.join("\n");
}

function appendToHistory(entryBody) {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const entry = [`## ${dateStamp} — Roster generalization sweep`, "", entryBody, "", "---", ""].join("\n");
  if (!existsSync(historyPath)) {
    writeFileSync(historyPath, "# Battle History\n\nA running, hand-appended-by-script log of real battery runs — design doc §39. Never hand-edited; re-run the relevant analysis script to add a new dated entry.\n\n");
  }
  appendFileSync(historyPath, entry);
}

async function main() {
  const args = {};
  for (const raw of process.argv.slice(2)) {
    const m = /^--([^=]+)=(.*)$/.exec(raw);
    if (m) args[m[1]] = m[2];
  }
  if (!args.rosters) throw new Error(`--rosters is required, e.g. --rosters="bennit.json+erabryth.json,tough.json+xenowarden-greenhorn.json" (each roster's own fixtures joined by "+", rosters separated by ",")`);
  const rosters = args.rosters.split(",").map((r) => r.split("+"));
  const opponentIds = args.opponents ? args.opponents.split(",") : defaultOpponentIds();
  const partyProfile = ALL_PROFILES[args.party ?? "baseline-v1"] ?? BASELINE_V1;
  const seedSpec = args.seeds ?? "1-24";
  const roundLimit = args.roundLimit ? Number(args.roundLimit) : 30;

  console.log(`Roster generalization sweep: ${rosters.length} roster(s) x ${opponentIds.length} opponent(s), seeds ${seedSpec}, concurrency=${DEFAULT_CONCURRENCY}, party=${partyProfile.id}...`);
  for (const roster of rosters) {
    const rosterLabel = roster.join("+");
    console.log(`\n=== ${rosterLabel} ===`);
    const rows = await sweepOneRoster({ roster, partyProfile, opponentIds, seedSpec, roundLimit });
    for (const { opponentId, agg } of rows) console.log(`  ${opponentId.padEnd(24)} ${pct(agg.partyWinRate).padStart(6)} / ${pct(agg.oppositionWinRate).padStart(6)} (timeout ${pct(agg.timeoutRate)}, mean ${agg.meanRounds.toFixed(1)} rounds)`);
    const entryBody = formatRosterSweep({ rosterLabel, partyId: partyProfile.id, rows, seedSpec });
    appendToHistory(entryBody);
  }
  console.log(`\nAppended ${rosters.length} roster section(s) to ${path.relative(process.cwd(), historyPath)}`);
}

if (path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] ?? "")) main();
