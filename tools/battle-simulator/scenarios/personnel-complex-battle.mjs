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
import { applyProfileToCombatant, decideOptionsForProfile } from "../personnel-engine/ai-profiles.mjs";
import { GRID_SIZE, WALLS, SETUPS } from "../data/personnel-test-complex.mjs";
import { generateRandomArcDeployment } from "./random-deployment.mjs";
import { makeRng } from "../engine/rng.mjs";
import { decideWithPolicy } from "../ai-common/engine-adapter.mjs";
import { PERSONNEL_ADAPTER } from "../ai-common/adapters/personnel-adapter.mjs";
import "../ai-common/policies/greedy.mjs"; // registers "greedy-v1" (design doc §57/#4) as a side effect

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(here, "..", "data", "raw-validation-fixtures");

function loadFixture(file) {
  return JSON.parse(readFileSync(path.join(fixturesDir, file), "utf8"));
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
 * @param {boolean} [args.partyManeuvers] - design doc §43, Stage 2's own explicit verification ask:
 *   "the same party with Trip, Shove and Grapple withheld, run head-to-head. If the maneuver-capable
 *   AI does not measurably win more, the maneuvers are decoration." Defaults true (every other
 *   scenario's real behavior, unchanged). false strips `athleticsModifier` from every PARTY fixture
 *   after loading — generateProposals' own real gate ("only offered if this combatant actually has
 *   an Athletics modifier extracted") means this disables EXACTLY Trip/Shove/Grapple for the party
 *   and nothing else (Escape stays legal regardless — Player Core's own explicit "everyone can
 *   always try" carve-out, decide.mjs's own header). The OPPOSITION's own athleticsModifier is
 *   deliberately untouched either way — this measures whether the PARTY'S OWN maneuver capability
 *   matters, not a symmetric nerf.
 * @param {object} [args.partyProfile] - design doc §46 (AI profiles, `ai-profiles.mjs`). OPTIONAL,
 *   OMITTED BY DEFAULT — every pre-§46 caller (which is every caller until now) gets `decide()`
 *   called with NO options object at all, exactly as before, meaning it always tracks the LIVE
 *   `DEFAULT_WEIGHTS`/full template set, never a frozen snapshot. Only when a caller explicitly
 *   passes a real profile (e.g. `BASELINE_V1`) does that combatant's own competence/weights/
 *   templates/morale/capability-restrictions come from the profile instead — deliberately NOT
 *   defaulted to `BASELINE_V1` even though the two currently produce numerically identical results,
 *   because defaulting to a FROZEN snapshot would silently stop every existing scenario from
 *   tracking future evaluator tuning (exactly the "frozen in name only" risk `ai-profiles.mjs`'s own
 *   header warns about, just inverted — the danger of freezing something that was never meant to be).
 * @param {object} [args.oppositionProfile] - the same mechanism, for the opposition side.
 */
export function buildScenario({ seed, partyFixtures, oppositionFixtures, setup = "DIAGONAL_SW_NE", roundLimit = 40, partyManeuvers = true, partyProfile, oppositionProfile } = {}) {
  // design doc §57/#4: a "policy" profile (e.g. greedy-v1, personnel-engine/baselines.mjs's own
  // POLICY_BASELINES) dispatches through the shared ai-common/ registry — the same real integration
  // point personnel-mirror.mjs's own ai() function gained, so a policy-bearing profile behaves
  // identically regardless of which scenario builder deploys it.
  function ai(state, combatantId, turnState) {
    const profile = state.combatants.get(combatantId)?.side === "party" ? partyProfile : oppositionProfile;
    if (profile?.decisionMode === "policy") return decideWithPolicy(profile.policyId, PERSONNEL_ADAPTER, state, combatantId, turnState, decideOptionsForProfile(profile));
    return profile ? decide(state, combatantId, turnState, decideOptionsForProfile(profile)) : decide(state, combatantId, turnState);
  }
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
    ...partyFixtures.map((file, i) => {
      const fixture = loadFixture(file);
      const withManeuvers = partyManeuvers ? fixture : { ...fixture, athleticsModifier: null };
      const withProfile = partyProfile ? applyProfileToCombatant(withManeuvers, partyProfile) : withManeuvers;
      return { ...withUniqueId(withProfile, i, "p"), position: { ...positions.partyPositions[i] } };
    }),
    ...oppositionFixtures.map((file, i) => {
      const fixture = loadFixture(file);
      const withProfile = oppositionProfile ? applyProfileToCombatant(fixture, oppositionProfile) : fixture;
      return { ...withUniqueId(withProfile, i, "o"), position: { ...positions.oppositionPositions[i] } };
    })
  ];

  return { seed, gridSize: GRID_SIZE, roundLimit, combatants, ai, walls: WALLS, blindDeployment };
}
