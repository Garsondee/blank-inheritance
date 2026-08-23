/**
 * A 2-vs-2 fight on the larger, two-building battlemap (design doc §21 — "we need a bigger, more
 * complex battlefield and more allies and enemies to see how things are going"). Generic over
 * WHICH real fixtures fight, unlike personnel-lunar17-vs-security-goon.mjs's fixed pair — this
 * scenario always loads real, checked-in JSON fixtures from
 * tools/battle-simulator/data/raw-validation-fixtures/, never invents a combatant inline, and
 * simply reads whichever party/opposition fixture FILENAMES it's given.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decide } from "../personnel-engine/decide.mjs";
import { GRID_SIZE, WALLS, SETUPS } from "../data/personnel-test-complex.mjs";

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
 * @param {string[]} args.partyFixtures - real fixture filenames, e.g. ["lunar-17.json", "..."]
 * @param {string[]} args.oppositionFixtures - real fixture filenames
 * @param {"DIAGONAL_SW_NE"|"DIAGONAL_NW_SE"|"NORTH_SOUTH_ENDS"} [args.setup]
 * @param {number} [args.roundLimit]
 */
export function buildScenario({ seed, partyFixtures, oppositionFixtures, setup = "DIAGONAL_SW_NE", roundLimit = 40 } = {}) {
  const positions = SETUPS[setup];
  if (!positions) throw new Error(`Unknown setup "${setup}" — expected one of ${Object.keys(SETUPS).join(", ")}.`);
  if (partyFixtures.length > positions.partyPositions.length) {
    throw new Error(`Setup "${setup}" only defines ${positions.partyPositions.length} party spawn point(s), asked for ${partyFixtures.length} party fixture(s).`);
  }
  if (oppositionFixtures.length > positions.oppositionPositions.length) {
    throw new Error(`Setup "${setup}" only defines ${positions.oppositionPositions.length} opposition spawn point(s), asked for ${oppositionFixtures.length} opposition fixture(s).`);
  }

  // runBattle keys its live combatant map by `id` (engine.mjs: `new Map(scenario.combatants.map(c
  // => [c.id, ...]))`) — the SAME fixture file used twice on one side (e.g. two Security Goons)
  // would silently collide down to a single combatant with no error, since Map construction just
  // keeps the last entry for a repeated key. Disambiguated here, once, for every caller, rather
  // than leaving it as a real trap every future scenario builder would have to remember on its own.
  function withUniqueId(fixture, index, side) {
    return { ...fixture, id: `${fixture.id}-${side}${index}` };
  }
  const combatants = [
    ...partyFixtures.map((file, i) => ({ ...withUniqueId(loadFixture(file), i, "p"), position: { ...positions.partyPositions[i] } })),
    ...oppositionFixtures.map((file, i) => ({ ...withUniqueId(loadFixture(file), i, "o"), position: { ...positions.oppositionPositions[i] } }))
  ];

  return { seed, gridSize: GRID_SIZE, roundLimit, combatants, ai, walls: WALLS };
}
