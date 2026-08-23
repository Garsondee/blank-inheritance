/**
 * The actual fight (design doc §19 Phase 3): Lunar-17 vs. Security Goon, real extracted data on
 * both sides, on the Phase 1b synthetic building. Zero invented numbers anywhere in this file —
 * every combat stat comes from tools/battle-simulator/data/raw-validation-fixtures/, generated
 * from real Foundry pack data (see that directory's own generator script for the full trail); the
 * only things decided HERE are which of Phase 1b's three named starting configurations to use and
 * the round limit.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decide } from "../personnel-engine/decide.mjs";
import { GRID_SIZE, WALLS, SETUPS } from "../data/personnel-test-facility.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(here, "..", "data", "raw-validation-fixtures");

function loadFixture(file) {
  return JSON.parse(readFileSync(path.join(fixturesDir, file), "utf8"));
}

function ai(state, combatantId, turnState) {
  return decide(state, combatantId, turnState);
}

/**
 * @param {object} args
 * @param {number} args.seed
 * @param {"SAME_ROOM"|"ADJACENT_ROOMS"|"FAR_ROOMS"} [args.setup] - one of Phase 1b's three named
 *   starting configurations (data/personnel-test-facility.mjs's own SETUPS) — default SAME_ROOM,
 *   the simplest configuration, to prove the pipeline end-to-end before varying room placement.
 * @param {number} [args.roundLimit]
 */
export function buildScenario({ seed, setup = "SAME_ROOM", roundLimit = 15 } = {}) {
  const lunar17 = loadFixture("lunar-17.json");
  const securityGoon = loadFixture("security-goon.json");
  const positions = SETUPS[setup];
  if (!positions) throw new Error(`Unknown setup "${setup}" — expected one of ${Object.keys(SETUPS).join(", ")}.`);

  const combatants = [
    { ...lunar17, position: { ...positions.attacker } },
    { ...securityGoon, position: { ...positions.defender } }
  ];

  return { seed, gridSize: GRID_SIZE, roundLimit, combatants, ai, walls: WALLS };
}
