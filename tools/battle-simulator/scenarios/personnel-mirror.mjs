/**
 * MIRROR MATCH (design doc §46's own "Archetype Ladder" plan, Stage B): "is AI A stronger than AI
 * B?" needs a mirror scenario — the IDENTICAL roster on both sides, only the AI profile differs —
 * not `personnel-complex-battle.mjs`'s own asymmetric PC-vs-NPC roster, which conflates roster
 * strength with AI strength (exactly the confound §43/§44 hit directly: "PCs beat NPCs" says
 * nothing about which AI is smarter once the rosters themselves also differ).
 *
 * Deliberately a SMALL, OPEN, wall-free arena, on purpose, not a reuse of the big complex-battle
 * map: this project's own real, measured cost this session (a single 8-combatant walled battle can
 * take the better part of a minute, mostly real Dijkstra pathfinding) means ladder-scale measurement
 * — many battles, run repeatedly, to compare profiles — needs an arena that resolves in seconds.
 * Fixed, symmetric SPAWN positions (not RANDOM_ARCS' own blind-exploration opening) for the same
 * reason: the expensive part of a slow battle is the EXPLORING, not the fighting, and a mirror
 * match's whole point is measuring how well each side FIGHTS, not how well it explores.
 *
 * Real fixtures ONLY, like every other scenario builder in this project — never an invented
 * combatant. Since the roster is IDENTICAL on both sides, each fixture's own baked-in `side` field
 * (every real fixture carries one, e.g. lunar-17.json's own "side": "party") is deliberately
 * OVERRIDDEN per deployment slot, not trusted — the same fixture file has to work as EITHER side.
 *
 * ERRATUM (design doc §49, found chasing a Stage D result that looked too good to be real):
 * `side: "party"` ALSO controls something this scenario never intended it to — `conditions.mjs`'s
 * own real PC-vs-NPC dying/death asymmetry (Player Core pg. 402) keys off that exact literal string,
 * so the "opposition" copy of an otherwise-IDENTICAL fixture was silently dying outright at 0 HP
 * while its "party" mirror-twin got the full dying/recovery spiral — a real, measured ~77-percentage-
 * point party-side survivability advantage in a `baseline-v1`-vs-itself control check, nothing to do
 * with AI quality. Every combatant deployed here now gets `pcDeathRules: true` explicitly,
 * REGARDLESS of side — conditions.mjs's own `usesDyingRules` reads that override before ever falling
 * back to the side-keyed default, so both mirror copies now get identical, symmetric survivability
 * rules. See design doc §49 for the full real-numbers before/after and which prior Stage B/C results
 * this affects.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decide } from "../personnel-engine/decide.mjs";
import { applyProfileToCombatant, decideOptionsForProfile } from "../personnel-engine/ai-profiles.mjs";
import { decideRandom, decideWorst, decideNearestOnly } from "../personnel-engine/baselines.mjs";
import { decideWithPolicy } from "../ai-common/engine-adapter.mjs";
import { PERSONNEL_ADAPTER } from "../ai-common/adapters/personnel-adapter.mjs";
import "../ai-common/policies/greedy.mjs"; // registers "greedy-v1" (design doc §57/#4) as a side effect

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(here, "..", "data", "raw-validation-fixtures");

function loadFixture(file) {
  return JSON.parse(readFileSync(path.join(fixturesDir, file), "utf8"));
}

/** Open, generously-sized, wall-free — real ranged fixtures in this roster reach 50-120ft (10-24
 * squares); wide enough that a fight isn't trivially instant, narrow enough that blind exploration
 * never triggers (both sides start with real line of effect, so believedPositions is never empty —
 * see decide.mjs's own §36 comment for why that matters: THAT is the expensive, many-round path). */
export const GRID_SIZE = { cols: 30, rows: 20 };

/**
 * @param {object} args
 * @param {number} args.seed
 * @param {string[]} args.roster - real fixture filenames, deployed IDENTICALLY on both sides — this
 *   is what makes it a mirror. roster[i] on the party faces roster[i] on the opposition, at
 *   symmetric positions across the arena's own center line.
 * @param {object} args.partyProfile - REQUIRED, unlike personnel-complex-battle.mjs's own OPTIONAL
 *   profiles: a mirror match's entire purpose is comparing two named profiles, so silently falling
 *   back to decide()'s bare defaults on a missing one would defeat the point rather than being a
 *   safe no-op — this throws instead.
 * @param {object} args.oppositionProfile - REQUIRED, same reasoning.
 * @param {number} [args.roundLimit] - default 30 (design doc §49): with `pcDeathRules` symmetric on
 *   both sides, real fights run measurably longer than a straightforward-death mirror would — a real
 *   `baseline-v1`-vs-itself control check found roundLimit=20 left 75% of battles as an uninformative
 *   timeout, while roundLimit=30 resolved 45% decisively with a genuinely symmetric split.
 */
export function buildScenario({ seed, roster, partyProfile, oppositionProfile, roundLimit = 30 } = {}) {
  if (!roster?.length) throw new Error("personnel-mirror.mjs's buildScenario requires a non-empty roster.");
  if (!partyProfile || !oppositionProfile) {
    throw new Error("personnel-mirror.mjs's buildScenario requires BOTH partyProfile and oppositionProfile — a mirror match with an unassigned side isn't measuring anything.");
  }

  // design doc §51: an anchor baseline (random-baseline/worst-baseline/nearest-only-baseline) is a
  // profile-SHAPED object with a real `decisionMode`, not a weighted profile — dispatch to its own
  // real decision function BEFORE falling through to the ordinary decide()/decideOptionsForProfile
  // path every real weighted profile still uses unchanged. design doc §57/#4: a `"policy"` profile
  // (e.g. `greedy-v1`, `baselines.mjs`'s own POLICY_BASELINES) dispatches through the SHARED
  // `ai-common/` registry instead — this is the one real integration point issue #4's "definition of
  // done" asks for: `--opposition=<policy-id>` works here with zero special-casing beyond this branch,
  // for ANY future policy registered in `ai-common/policies/`, not just `greedy-v1`.
  function ai(state, combatantId, turn) {
    const profile = state.combatants.get(combatantId)?.side === "party" ? partyProfile : oppositionProfile;
    if (profile.decisionMode === "random") return decideRandom(state, combatantId, turn);
    if (profile.decisionMode === "worst") return decideWorst(state, combatantId, turn, { weights: profile.weights });
    if (profile.decisionMode === "nearest-only") return decideNearestOnly(state, combatantId, turn);
    if (profile.decisionMode === "policy") return decideWithPolicy(profile.policyId, PERSONNEL_ADAPTER, state, combatantId, turn, decideOptionsForProfile(profile));
    return decide(state, combatantId, turn, decideOptionsForProfile(profile));
  }

  const n = roster.length;
  const rowSpacing = GRID_SIZE.rows / (n + 1);
  const combatants = [];
  roster.forEach((file, i) => {
    const row = Math.round(rowSpacing * (i + 1));
    const partyCombatant = applyProfileToCombatant({ ...loadFixture(file), side: "party", pcDeathRules: true }, partyProfile);
    const oppositionCombatant = applyProfileToCombatant({ ...loadFixture(file), side: "opposition", pcDeathRules: true }, oppositionProfile);
    combatants.push({ ...partyCombatant, id: `${partyCombatant.id}-mirror-p${i}`, position: { col: 3, row } });
    combatants.push({ ...oppositionCombatant, id: `${oppositionCombatant.id}-mirror-o${i}`, position: { col: GRID_SIZE.cols - 4, row } });
  });

  return { seed, gridSize: GRID_SIZE, roundLimit, combatants, ai, walls: [] };
}
