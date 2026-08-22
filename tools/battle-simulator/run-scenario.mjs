/**
 * Runs two comparison scenarios and writes both battle logs as JSON — this
 * IS "test different approaches": same rules, same Claimant, one real
 * tactical variable changed, compared side by side.
 *
 *  - "escort": the full five-vehicle formation from the original ask.
 *    The Frame's reach-100 weapon lets it engage from 100ft, outside the
 *    Claimant's Claim reaction trigger range (adjacency-only) — so it
 *    never draws a counter-attack. Fast, clean, low-risk.
 *  - "melee-draws-fire": same fight, reduced to Frame + Hod + Ladle, with
 *    the Frame's weapon swapped to a plain adjacency-only Strike. It has
 *    to close all the way in, which DOES trigger Claim — real damage
 *    taken, the Ladle's Field Repair actually mattering.
 *  - "mystic-frame-solo" (design doc §14k): a solo TEST FIXTURE spellcasting
 *    Frame, built to answer directly "can you cast a spell, do you know
 *    your spell list, can you use a character ability" — real extracted
 *    SF2E spell/ability data, not hand-waved.
 *
 * Re-run with different seeds/positions/AI policies for a different
 * comparison — that's the entire point of this file being this short.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runBattle } from "./engine/engine.mjs";
import { buildScenario as buildEscort } from "./scenarios/five-vehicles-one-frame.mjs";
import { buildScenario as buildMeleeDrawsFire } from "./scenarios/melee-draws-fire.mjs";
import { buildScenario as buildMysticFrameSolo } from "./scenarios/mystic-frame-solo.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

const runs = [
  // fieldBreaksAtRound omitted on purpose: ground-layer/resolve-ground-layer.mjs now
  // rolls the real ground team against the real subsystem DCs to decide it.
  { key: "escort", label: "Escort formation — Frame + 5 vehicles, reach-100 weapon", build: buildEscort, seed: 20260822, roundLimit: 8 },
  { key: "melee-draws-fire", label: "Melee draws fire — Frame + Hod + Ladle, no-reach weapon", build: buildMeleeDrawsFire, seed: 20260822, fieldBreaksAtRound: 3, roundLimit: 10 },
  { key: "mystic-frame-solo", label: "Mystic Frame solo — real spells and a real class ability, no support", build: buildMysticFrameSolo, seed: 18, fieldBreaksAtRound: 3, roundLimit: 10 }
];

const output = { generatedAt: "2026-08-22", runs: {} };
for (const run of runs) {
  const scenario = run.build({ seed: run.seed, fieldBreaksAtRound: run.fieldBreaksAtRound, roundLimit: run.roundLimit });
  const log = runBattle(scenario);
  output.runs[run.key] = {
    label: run.label,
    config: { seed: run.seed, fieldBreaksAtRound: run.fieldBreaksAtRound, roundLimit: run.roundLimit },
    groundLayerLog: scenario.groundLayerLog ?? null,
    log
  };
  const fieldNote = scenario.groundLayerLog ? ` (ground layer: field ${scenario.groundLayerLog.outcome.fieldIntegrity}, shelter ${scenario.groundLayerLog.outcome.shelterEvacuation})` : "";
  console.log(`${run.key}: ${log.outcome.result} in ${log.rounds.length} round(s)${fieldNote}`);
}

writeFileSync(path.join(here, "battle-log.json"), JSON.stringify(output, null, 1));
console.log("Wrote battle-log.json");
