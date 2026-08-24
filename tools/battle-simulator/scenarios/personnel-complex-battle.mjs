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
import { generateRandomArcDeployment } from "./random-deployment.mjs";
import { makeRng } from "../engine/rng.mjs";

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
 * @param {"DIAGONAL_SW_NE"|"DIAGONAL_NW_SE"|"NORTH_SOUTH_ENDS"|"RANDOM_ARCS"} [args.setup] -
 *   design doc §35: "RANDOM_ARCS" replaces the fixed lineup with `generateRandomArcDeployment` —
 *   a real, seeded-but-varied opening with NO starting Line of Effect between the two sides,
 *   verified rather than assumed (see that module's own header). Also sets `blindDeployment` on
 *   the returned scenario, so belief.mjs starts genuinely empty instead of §15s's usual
 *   deployment-seeds-the-true-lineup default — the two are meant to be used together (see
 *   engine.mjs's own `blindDeployment` field and belief.mjs's own comment on it).
 * @param {number} [args.roundLimit]
 */
export function buildScenario({ seed, partyFixtures, oppositionFixtures, setup = "DIAGONAL_SW_NE", roundLimit = 40 } = {}) {
  let positions;
  let blindDeployment = false;
  if (setup === "RANDOM_ARCS") {
    // A distinct RNG stream from the battle's own seed — matching decide.mjs's own decisionRng
    // precedent (see that function's header): drawing deployment randomness from the same stream
    // the battle's real dice use would desync every subsequent roll the instant this algorithm's
    // own random-draw count changed for any reason.
    const deploymentRng = makeRng((seed ^ 0x52414e44) >>> 0); // 0x52414e44 = "RAND" — just a fixed mixing constant, not meaningful beyond decorrelating the two streams
    const deployment = generateRandomArcDeployment({
      gridSize: GRID_SIZE, walls: WALLS, partyCount: partyFixtures.length, oppositionCount: oppositionFixtures.length, rng: deploymentRng
    });
    positions = deployment;
    blindDeployment = true;
  } else {
    positions = SETUPS[setup];
    if (!positions) throw new Error(`Unknown setup "${setup}" — expected one of ${[...Object.keys(SETUPS), "RANDOM_ARCS"].join(", ")}.`);
    if (partyFixtures.length > positions.partyPositions.length) {
      throw new Error(`Setup "${setup}" only defines ${positions.partyPositions.length} party spawn point(s), asked for ${partyFixtures.length} party fixture(s).`);
    }
    if (oppositionFixtures.length > positions.oppositionPositions.length) {
      throw new Error(`Setup "${setup}" only defines ${positions.oppositionPositions.length} opposition spawn point(s), asked for ${oppositionFixtures.length} opposition fixture(s).`);
    }
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

  return { seed, gridSize: GRID_SIZE, roundLimit, combatants, ai, walls: WALLS, blindDeployment };
}
